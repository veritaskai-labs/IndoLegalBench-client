import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { reportValidation } from "@/test/reportFixtures";
import type { ReportValidateRequest, ReportValidation } from "@/types/reports";

import { useReportValidation } from "./useReportValidation";

// SCRUM-366: asks POST /reports/validate every time the selection changes. The rules live on the server;
// these tests check timing (debounce), stale answers, and what the form can show while it waits.

const request: ReportValidateRequest = {
  session_ids: ["s-1", "s-2"],
  score_scope: "test",
  measurement_filter: "all",
};
const verdictA = reportValidation({ available_scopes: ["test"] });
const verdictB = reportValidation({
  valid: false,
  violations: [{ kind: "requirement", code: "RUBRIC_VERSION", message: "Versi rubrik berbeda." }],
});

function gatewayAnswering(...answers: Array<Promise<ReportValidation> | ReportValidation>) {
  const validate = vi.fn();
  for (const answer of answers) validate.mockImplementationOnce(() => Promise.resolve(answer));
  return { validate };
}

function render(initial: ReportValidateRequest, gateway: ReturnType<typeof gatewayAnswering>, delay = 0) {
  return renderHook(({ req }) => useReportValidation(req, gateway, delay), { initialProps: { req: initial } });
}

describe("useReportValidation (SCRUM-366, AC1 AC4 AC13)", () => {
  it("asks the server for the selection and exposes the verdict", async () => {
    const gateway = gatewayAnswering(verdictA);

    const { result } = render(request, gateway);
    expect(result.current.status).toBe("checking");

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.verdict).toEqual(verdictA);
    expect(result.current.message).toBeNull();
    expect(gateway.validate).toHaveBeenCalledTimes(1);
    expect(gateway.validate).toHaveBeenCalledWith(request);
  });

  // Edge: an empty pick is still asked, the server answers it as a violation and not as an error.
  it("asks for an empty selection too", async () => {
    const gateway = gatewayAnswering(reportValidation({ valid: false }));

    const { result } = render({ ...request, session_ids: [] }, gateway);

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(gateway.validate).toHaveBeenCalledWith({ ...request, session_ids: [] });
  });

  // Edge: quick clicks send one request for the last selection, not one per click.
  it("sends only the last selection when it changes within the delay", async () => {
    const gateway = gatewayAnswering(verdictB);
    const { result, rerender } = render(request, gateway, 40);
    const last = { ...request, session_ids: ["s-1", "s-3"] };

    rerender({ req: { ...request, session_ids: ["s-1"] } });
    rerender({ req: last });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(gateway.validate).toHaveBeenCalledTimes(1);
    expect(gateway.validate).toHaveBeenCalledWith(last);
  });

  // Edge (race): the first answer arrives after the second request was made and must be thrown away.
  it("drops a late answer that belongs to an older selection", async () => {
    let releaseFirst: (value: ReportValidation) => void = () => {};
    const first = new Promise<ReportValidation>((resolve) => {
      releaseFirst = resolve;
    });
    const gateway = gatewayAnswering(first, verdictB);
    const { result, rerender } = render(request, gateway);
    await waitFor(() => expect(gateway.validate).toHaveBeenCalledTimes(1));

    rerender({ req: { ...request, session_ids: ["s-1", "s-3"] } });
    await waitFor(() => expect(result.current.verdict).toEqual(verdictB));
    await act(async () => releaseFirst(verdictA));

    expect(result.current.verdict).toEqual(verdictB);
  });

  // Edge: while the next answer is on its way the form keeps the last one, so scopes do not flicker.
  it("keeps the previous verdict while checking the next selection", async () => {
    let releaseSecond: (value: ReportValidation) => void = () => {};
    const second = new Promise<ReportValidation>((resolve) => {
      releaseSecond = resolve;
    });
    const gateway = gatewayAnswering(verdictA, second);
    const { result, rerender } = render(request, gateway);
    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ req: { ...request, session_ids: ["s-1", "s-3"] } });

    await waitFor(() => expect(result.current.status).toBe("checking"));
    expect(result.current.verdict).toEqual(verdictA);
    await act(async () => releaseSecond(verdictB));
    await waitFor(() => expect(result.current.verdict).toEqual(verdictB));
  });

  // Negative: a failed check says so and drops the old verdict, which no longer describes this selection.
  it("turns a failed call into a message and no verdict", async () => {
    const validate = vi.fn().mockResolvedValueOnce(verdictA).mockRejectedValueOnce(new ApiError(500, "X"));
    const { result, rerender } = render(request, { validate });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ req: { ...request, session_ids: ["s-1", "s-3"] } });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.verdict).toBeNull();
    expect(result.current.message).toMatch(/Pemeriksaan/);
  });

  it("tells the user to remove the sessions that are gone on a 404", async () => {
    const validate = vi.fn().mockRejectedValue(new ApiError(404, "REPORT_SESSION_NOT_FOUND"));

    const { result } = render(request, { validate });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.message).toMatch(/Lepas sesi yang sudah tidak tersedia/);
  });

  it("asks again for the same selection on reload", async () => {
    const validate = vi.fn().mockRejectedValueOnce(new ApiError(500, "X")).mockResolvedValueOnce(verdictA);
    const { result } = render(request, { validate });
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(validate).toHaveBeenCalledTimes(2);
    expect(result.current.verdict).toEqual(verdictA);
  });

  // Edge: the first check must wait for the session list and the role; before that the pick is empty by default.
  it("asks nothing while disabled and asks once when enabled", async () => {
    const gateway = gatewayAnswering(verdictA);
    const { result, rerender } = renderHook(
      ({ on }) => useReportValidation(request, gateway, 0, on),
      { initialProps: { on: false } },
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(gateway.validate).not.toHaveBeenCalled();
    expect(result.current.status).toBe("checking");

    rerender({ on: true });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(gateway.validate).toHaveBeenCalledTimes(1);
  });
});

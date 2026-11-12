import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradeEstimate } from "@/test/gradingFixtures";
import type { GradeEstimate } from "@/types/grading";
import { useGradeEstimate } from "./useGradeEstimate";

// The hook takes the gateway and the judge list as parameters (DIP), so the test hands it fakes
// instead of mocking modules.
function fakeGateway(estimate: GradingGateway["estimate"]): GradingGateway {
  return { grade: vi.fn(), results: vi.fn(), sessions: vi.fn(), runs: vi.fn(), run: vi.fn(), estimate: vi.fn(estimate) };
}

function fakeJudges(names: Record<string, string> = { "judge-a": "Judge Alfa", "judge-b": "Judge Beta" }): JudgeOptionsApi {
  return {
    listJudgeOptions: vi.fn(() =>
      Promise.resolve(
        Object.entries(names).map(([id, name]) => ({ id, name, provider_type: "openai_compatible" as const, model_name: "m" })),
      ),
    ),
  };
}

describe("useGradeEstimate (PBI-14 AC6)", () => {
  it("loads the estimate for the session and the chosen judge and rubric version", async () => {
    const gateway = fakeGateway(() => Promise.resolve(gradeEstimate({ judge_provider_id: "judge-b" })));
    const options = { judgeProviderId: "judge-b", rubricVersion: "v2" };

    const { result } = renderHook(() => useGradeEstimate("s-1", options, gateway, fakeJudges()));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(gateway.estimate).toHaveBeenCalledWith("s-1", options);
    const data = result.current.status === "ready" ? result.current.data : null;
    expect(data?.rows.find((row) => row.label === "LLM judge")?.value).toBe("Judge Beta");
  });

  it("estimates with no options for the first grading", async () => {
    const gateway = fakeGateway(() => Promise.resolve(gradeEstimate()));

    renderHook(() => useGradeEstimate("s-1", {}, gateway, fakeJudges()));

    await waitFor(() => expect(gateway.estimate).toHaveBeenCalledWith("s-1", {}));
  });

  // Re-grading has no judge until the Admin picks one; an estimate then would describe the wrong judge.
  it("does not ask the server while no options are given", async () => {
    const gateway = fakeGateway(() => Promise.resolve(gradeEstimate()));

    const { result } = renderHook(() => useGradeEstimate("s-1", null, gateway, fakeJudges()));

    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: null }));
    expect(gateway.estimate).not.toHaveBeenCalled();
  });

  it("loads again when the judge changes and does not show the previous judge's estimate meanwhile", async () => {
    let finishSecond: (value: GradeEstimate) => void = () => {};
    const estimate = vi
      .fn<GradingGateway["estimate"]>()
      .mockResolvedValueOnce(gradeEstimate({ judge_provider_id: "judge-a" }))
      .mockReturnValueOnce(new Promise<GradeEstimate>((resolve) => (finishSecond = resolve)));
    const gateway = fakeGateway(estimate);

    const { result, rerender } = renderHook(({ judge }) => useGradeEstimate("s-1", { judgeProviderId: judge }, gateway, fakeJudges()), {
      initialProps: { judge: "judge-a" },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender({ judge: "judge-b" });

    expect(result.current.status).toBe("loading");
    await act(async () => finishSecond(gradeEstimate({ judge_provider_id: "judge-b" })));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(estimate).toHaveBeenLastCalledWith("s-1", { judgeProviderId: "judge-b" });
  });

  it("loads again when the rubric version changes", async () => {
    const gateway = fakeGateway(() => Promise.resolve(gradeEstimate()));

    const { rerender } = renderHook(({ version }) => useGradeEstimate("s-1", { rubricVersion: version }, gateway, fakeJudges()), {
      initialProps: { version: "v1" },
    });
    await waitFor(() => expect(gateway.estimate).toHaveBeenCalledWith("s-1", { rubricVersion: "v1" }));
    rerender({ version: "v2" });

    await waitFor(() => expect(gateway.estimate).toHaveBeenCalledWith("s-1", { rubricVersion: "v2" }));
  });

  // A slow answer for the old judge must not overwrite the answer for the judge now chosen.
  it("drops a late answer that belongs to a previous choice", async () => {
    let finishFirst: (value: GradeEstimate) => void = () => {};
    const estimate = vi
      .fn<GradingGateway["estimate"]>()
      .mockReturnValueOnce(new Promise<GradeEstimate>((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce(gradeEstimate({ judge_provider_id: "judge-b", attempts_to_grade: 3 }));
    const gateway = fakeGateway(estimate);

    const { result, rerender } = renderHook(({ judge }) => useGradeEstimate("s-1", { judgeProviderId: judge }, gateway, fakeJudges()), {
      initialProps: { judge: "judge-a" },
    });
    rerender({ judge: "judge-b" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => finishFirst(gradeEstimate({ judge_provider_id: "judge-a", attempts_to_grade: 99 })));

    const data = result.current.status === "ready" ? result.current.data : null;
    expect(data?.rows[0]).toEqual({ label: "Jumlah percobaan", value: "3" });
  });

  it("explains a refusal in the estimate's own words", async () => {
    const gateway = fakeGateway(() => Promise.reject(new ApiError(422, "JUDGE_PRICING_MISSING")));

    const { result } = renderHook(() => useGradeEstimate("s-1", {}, gateway, fakeJudges()));

    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: "error",
        message: "Harga token penilai ini belum lengkap, jadi biayanya belum bisa diperkirakan. Lengkapi harga di halaman Provider.",
      }),
    );
  });

  it("falls back to a retry message for an unexpected failure and loads again on reload", async () => {
    const estimate = vi
      .fn<GradingGateway["estimate"]>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(gradeEstimate());
    const gateway = fakeGateway(estimate);

    const { result } = renderHook(() => useGradeEstimate("s-1", {}, gateway, fakeJudges()));
    await waitFor(() => expect(result.current).toMatchObject({ status: "error", message: "Perkiraan biaya gagal dimuat. Coba lagi." }));
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(estimate).toHaveBeenCalledTimes(2);
  });

  // The judge list is only for the name; an estimate must still show when that list cannot load.
  it("still shows the estimate when the judge list fails to load", async () => {
    const gateway = fakeGateway(() => Promise.resolve(gradeEstimate()));
    const judgeApi: JudgeOptionsApi = { listJudgeOptions: vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))) };

    const { result } = renderHook(() => useGradeEstimate("s-1", {}, gateway, judgeApi));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    const data = result.current.status === "ready" ? result.current.data : null;
    expect(data?.rows.find((row) => row.label === "LLM judge")?.value).toBe("Judge yang dipilih");
  });
});

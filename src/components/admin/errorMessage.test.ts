import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { adminErrorMessage, confirmationQuestion } from "./errorMessage";

describe("confirmationQuestion", () => {
  // Positif: the sentence is fixed by the ticket (PBI-24 AC8).
  it("asks the admin to confirm with the number of waiting cases", () => {
    // Arrange / Act
    const question = confirmationQuestion(3);

    // Assert
    expect(question).toBe("3 kasus menunggu penilaian akan masuk daftar penugasan ulang. Lanjutkan?");
  });

  // Corner: one case reads the same, no special plural form in the ticket.
  it("uses the same sentence for a single case", () => {
    expect(confirmationQuestion(1)).toBe(
      "1 kasus menunggu penilaian akan masuk daftar penugasan ulang. Lanjutkan?",
    );
  });
});

describe("adminErrorMessage", () => {
  // Negatif: a 409 that is not the confirm question must not show a raw code.
  it("shows the fallback, not the raw code, for an unknown 409", () => {
    const error = new ApiError(409, "SOMETHING_ELSE");

    expect(adminErrorMessage(error, "Gagal mengubah peran pengguna.")).toBe("Gagal mengubah peran pengguna.");
  });

  it("reports a network error for anything that is not an ApiError", () => {
    expect(adminErrorMessage(new Error("offline"), "x")).toBe("Terjadi kesalahan jaringan.");
  });
});

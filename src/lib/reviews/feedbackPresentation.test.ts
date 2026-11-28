import { describe, expect, it } from "vitest";
import { feedbackPresentation } from "./feedbackPresentation";

describe("feedbackPresentation", () => {
  // Positive: after approval the comment moves into the drawer, which is read-only.
  it("puts the comment behind a button and makes the thread read-only once the case is approved", () => {
    // Act
    const view = feedbackPresentation("approved");

    // Assert
    expect(view).toEqual({
      commentInDrawer: true,
      launcherLabel: "Lihat komentar",
      readOnlyNotice: "Kasus sudah disetujui. Komentar dan thread hanya dapat dibaca.",
    });
  });

  // Positive: the author keeps working with the comment in front of them while the case needs revision.
  it("keeps the comment inline and offers a reply button while the case needs revision", () => {
    // Act
    const view = feedbackPresentation("needs_revision");

    // Assert
    expect(view).toEqual({ commentInDrawer: false, launcherLabel: "Balas komentar", readOnlyNotice: null });
  });

  // Edge: every other status, and an unknown one, reads the discussion without a promise to reply.
  it.each(["draft", "in_review", null] as const)("opens the discussion without a read-only notice for %s", (status) => {
    // Act
    const view = feedbackPresentation(status);

    // Assert
    expect(view).toEqual({ commentInDrawer: false, launcherLabel: "Buka diskusi komentar", readOnlyNotice: null });
  });
});

describe("feedbackPresentation in English", () => {
  it("names the launcher and the read-only notice in English", () => {
    expect(feedbackPresentation("approved", "en")).toEqual({
      commentInDrawer: true,
      launcherLabel: "View comment",
      readOnlyNotice: "The case is approved. Comments and the thread are read-only.",
    });
    expect(feedbackPresentation("needs_revision", "en")).toEqual({
      commentInDrawer: false,
      launcherLabel: "Reply to comment",
      readOnlyNotice: null,
    });
    expect(feedbackPresentation(null, "en")).toEqual({
      commentInDrawer: false,
      launcherLabel: "Open comment discussion",
      readOnlyNotice: null,
    });
  });
});

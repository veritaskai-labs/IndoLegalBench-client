import { describe, expect, it } from "vitest";
import { actorIdentity, actorOptionLabel } from "./actorLabel";

describe("actorIdentity", () => {
  // Positive: two people with the same name are told apart by email.
  it("puts the email first and the name second", () => {
    const result = actorIdentity({
      actor_user_id: "u1",
      actor_name: "Rina Sari",
      actor_email: "rina.a@veritask.ai",
    });

    expect(result).toEqual({ primary: "rina.a@veritask.ai", secondary: "Rina Sari" });
  });

  // Positive
  it("gives two actors with the same name different primary labels", () => {
    const a = actorIdentity({
      actor_user_id: "u1",
      actor_name: "Rina Sari",
      actor_email: "rina.a@veritask.ai",
    });
    const b = actorIdentity({
      actor_user_id: "u2",
      actor_name: "Rina Sari",
      actor_email: "rina.b@veritask.ai",
    });

    expect(a.primary).not.toBe(b.primary);
  });

  // Corner: older or partial data without an email still shows who it was.
  it("falls back to the name when there is no email", () => {
    const result = actorIdentity({
      actor_user_id: "u1",
      actor_name: "Rina Sari",
      actor_email: null,
    });

    expect(result).toEqual({ primary: "Rina Sari", secondary: null });
  });

  // Corner: the field is optional in the contract, so it can be missing entirely.
  it("treats a missing email field like a null email", () => {
    const result = actorIdentity({ actor_user_id: "u1", actor_name: "Rina Sari" });

    expect(result).toEqual({ primary: "Rina Sari", secondary: null });
  });

  // Corner
  it("does not repeat the name when it is the same as the email", () => {
    const result = actorIdentity({
      actor_user_id: "u1",
      actor_name: "rina@veritask.ai",
      actor_email: "rina@veritask.ai",
    });

    expect(result).toEqual({ primary: "rina@veritask.ai", secondary: null });
  });

  // Corner: a blank email is not a usable label.
  it("ignores an email that is only spaces", () => {
    const result = actorIdentity({
      actor_user_id: "u1",
      actor_name: "Rina Sari",
      actor_email: "   ",
    });

    expect(result).toEqual({ primary: "Rina Sari", secondary: null });
  });

  // Corner: same rule for the name when there is no email either.
  it("shows Sistem when the name is only spaces and there is no email", () => {
    const result = actorIdentity({
      actor_user_id: "u1",
      actor_name: "   ",
      actor_email: null,
    });

    expect(result).toEqual({ primary: "Sistem", secondary: null });
  });

  // Positive: system events keep the existing wording.
  it("calls an event without an actor Sistem", () => {
    const result = actorIdentity({
      actor_user_id: null,
      actor_name: null,
      actor_email: null,
    });

    expect(result).toEqual({ primary: "Sistem", secondary: null });
  });

  // Corner: an actor whose user row is gone has neither name nor email.
  it("keeps showing Sistem when the actor has neither a name nor an email", () => {
    const result = actorIdentity({
      actor_user_id: "u1",
      actor_name: null,
      actor_email: null,
    });

    expect(result).toEqual({ primary: "Sistem", secondary: null });
  });
});

describe("actorOptionLabel", () => {
  // Positive
  it("shows the name with the email in brackets", () => {
    const label = actorOptionLabel({
      name: "Rina Sari",
      email: "rina.a@veritask.ai",
      is_active: true,
    });

    expect(label).toBe("Rina Sari (rina.a@veritask.ai)");
  });

  // Positive: PBI-1 AC5, a deactivated user can still be picked to read their trail.
  it("marks a deactivated user", () => {
    const label = actorOptionLabel({
      name: "Rina Lama",
      email: "rina.lama@veritask.ai",
      is_active: false,
    });

    expect(label).toBe("Rina Lama (rina.lama@veritask.ai) (nonaktif)");
  });

  // Corner
  it("gives two users with the same name different labels", () => {
    const a = actorOptionLabel({ name: "Rina Sari", email: "rina.a@veritask.ai", is_active: true });
    const b = actorOptionLabel({ name: "Rina Sari", email: "rina.b@veritask.ai", is_active: true });

    expect(a).not.toBe(b);
  });
});

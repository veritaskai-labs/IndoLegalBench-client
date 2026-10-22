import type { AuditActor } from "@/lib/audit/auditApi";
import type { AuditEntry } from "@/types/audit";

export type ActorIdentity = {
  /** Email when known, since it is unique and the name is not. */
  primary: string;
  /** The name, shown smaller under the email. Null when it adds nothing. */
  secondary: string | null;
};

type ActorFields = Pick<AuditEntry, "actor_user_id" | "actor_name"> &
  Partial<Pick<AuditEntry, "actor_email">>;

const SYSTEM = "Sistem";

/** One place decides how an audit actor reads, for the table and the log detail. */
export function actorIdentity(entry: ActorFields): ActorIdentity {
  const email = entry.actor_email?.trim() || null;
  const name = entry.actor_name?.trim() || null;
  if (email) {
    return { primary: email, secondary: name && name !== email ? name : null };
  }
  return { primary: name ?? SYSTEM, secondary: null };
}

/** Option text in the actor filter: the email tells apart users who share a name. */
export function actorOptionLabel(actor: Pick<AuditActor, "name" | "email" | "is_active">): string {
  const label = `${actor.name} (${actor.email})`;
  return actor.is_active ? label : `${label} (nonaktif)`;
}

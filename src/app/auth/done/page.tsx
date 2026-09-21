import type { Metadata } from "next";

import { isAuthErrorCode } from "@/lib/auth";

import { AuthDoneHandler } from "./AuthDoneHandler";

export const metadata: Metadata = {
  title: "Memproses Login | IndoLegalBench",
};

type AuthDonePageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function AuthDonePage({
  searchParams,
}: AuthDonePageProps) {
  const { error } = await searchParams;
  const errorValue = Array.isArray(error) ? error[0] : error;

  // TODO(SCRUM-94): PROPOSAL, not agreed with BE yet. Reading `?error=<CODE>`
  // assumes the backend redirects failed callbacks to /auth/done?error=<CODE>.
  // Adjust or remove once BE confirms how USER_NOT_REGISTERED and
  // USER_DEACTIVATED reach the frontend.
  const initialErrorCode = isAuthErrorCode(errorValue) ? errorValue : undefined;

  return <AuthDoneHandler initialErrorCode={initialErrorCode} />;
}
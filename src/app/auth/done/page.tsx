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

  // Confirmed with BE (server #7, SCRUM-90): failed callbacks redirect to
  // /auth/done?error=<CODE> with USER_NOT_REGISTERED or USER_DEACTIVATED.
  const initialErrorCode = isAuthErrorCode(errorValue) ? errorValue : undefined;

  return <AuthDoneHandler initialErrorCode={initialErrorCode} />;
}
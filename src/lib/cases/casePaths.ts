/** Editor kasus (SCRUM-108). */
export const caseEditPath = (caseId: string) => `/cases/${encodeURIComponent(caseId)}/edit`;

/** Halaman baca kasus untuk Developer AI (SCRUM-184). */
export const caseReadPath = (caseId: string) => `/cases/${encodeURIComponent(caseId)}`;

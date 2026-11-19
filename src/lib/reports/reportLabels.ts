import type { MeasurementKind, ReportLanguage, ReportMarker, ScoreSplit } from "@/types/reports";

export const REPORT_CONTACT_EMAIL = "indolegalbench@veritask.ai";

export type ReportLabels = {
  automatic: string;
  manual: string;
  notApplicable: string;
  rubric: string;
  judgeModel: string;
  caseBasis: string;
  caseVersions: string;
  created: string;
  devBanner: string;
  noResults: string;
  contact: string;
  /** Sebelas kolom tabel peringkat, urutannya sama dengan PDF. */
  columns: readonly string[];
  deterministic: string;
  llm: string;
  splits: Readonly<Record<ScoreSplit, string>>;
  markers: Readonly<Record<string, string>>;
  months: readonly string[];
};

/**
 * Teks isi laporan dalam bahasa laporan (Fase 0 K3). Disalin apa adanya dari _LABELS di pembuat PDF server
 * (PR #145, app/modules/reports/pdf.py) supaya web dan PDF memakai kata yang sama. Kalau label di sana berubah,
 * misalnya lewat SCRUM-355 (PBI-26), ubah di sini juga; tes paritasnya akan gagal sampai keduanya sama.
 * Bagian aplikasi di sekitar laporan (breadcrumb, tombol, status) tidak di sini dan tetap Bahasa Indonesia.
 */
export const REPORT_LABELS: Readonly<Record<ReportLanguage, ReportLabels>> = {
  id: {
    automatic: "Otomatis",
    manual: "Manual",
    notApplicable: "Tidak berlaku",
    rubric: "Rubrik",
    judgeModel: "Model penilai",
    caseBasis: "Jumlah kasus dasar perbandingan",
    caseVersions: "Versi kasus",
    created: "Dibuat",
    devBanner: "Laporan berisi skor dev, hanya untuk internal dan tidak dapat diterbitkan.",
    noResults: "Tidak ada hasil untuk laporan ini.",
    contact: `Untuk mendapatkan isi kasus, kirim email ke ${REPORT_CONTACT_EMAIL}.`,
    columns: [
      "Peringkat",
      "Produk",
      "Jenis",
      "Skor deterministik",
      "Skor penilai LLM",
      "Kasus dinilai",
      "Kasus dasar",
      "Tingkat kegagalan",
      "Percobaan",
      "Versi model",
      "Penanda",
    ],
    deterministic: "Skor deterministik",
    llm: "Skor penilai LLM",
    splits: { test: "Kasus test", dev: "Kasus dev", combined: "Gabungan dev + test" },
    markers: {
      trial: "Uji Coba",
      model_version_differs: "Versi model berbeda",
      repetitions_differ: "Jumlah percobaan berbeda",
      manual_date_span_over_7_days: "Rentang jawaban manual lebih dari 7 hari",
      refusals: "Menolak menjawab",
    },
    months: [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ],
  },
  en: {
    automatic: "Automatic",
    manual: "Manual",
    notApplicable: "Not applicable",
    rubric: "Rubric",
    judgeModel: "Judge model",
    caseBasis: "Cases used for comparison",
    caseVersions: "Case versions",
    created: "Created",
    devBanner: "This report contains dev scores. Internal only, it cannot be published.",
    noResults: "This report has no results.",
    contact: `To get the case contents, email ${REPORT_CONTACT_EMAIL}.`,
    columns: [
      "Rank",
      "Product",
      "Type",
      "Deterministic score",
      "LLM judge score",
      "Cases graded",
      "Basis cases",
      "Failure rate",
      "Attempts",
      "Model version",
      "Markers",
    ],
    deterministic: "Deterministic score",
    llm: "LLM judge score",
    splits: { test: "Test cases", dev: "Dev cases", combined: "Dev + test combined" },
    markers: {
      trial: "Trial",
      model_version_differs: "Different model version",
      repetitions_differ: "Different number of attempts",
      manual_date_span_over_7_days: "Manual answers span more than 7 days",
      refusals: "Refused to answer",
    },
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
  },
};

/** Label otomatis/manual untuk kolom Jenis (PBI-15 AC5). */
export function measurementKindLabel(kind: MeasurementKind, language: ReportLanguage): string {
  const labels = REPORT_LABELS[language];
  return kind === "manual" ? labels.manual : labels.automatic;
}

/**
 * Satu penanda D2 dalam bahasa laporan. Kode yang belum punya label tetap ditampilkan apa adanya, sama dengan
 * pdf.py, supaya penanda baru dari server tidak hilang. Detail yang tidak kosong ditulis dalam kurung.
 */
export function markerLabel(marker: ReportMarker, language: ReportLanguage): string {
  const text = REPORT_LABELS[language].markers[marker.code] ?? marker.code;
  return marker.detail ? `${text} (${marker.detail})` : text;
}

/** Semua penanda satu produk untuk satu sel tabel, dipisah titik koma seperti di PDF. */
export function markersText(markers: readonly ReportMarker[], language: ReportLanguage): string {
  return markers.map((marker) => markerLabel(marker, language)).join("; ");
}

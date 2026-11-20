import type { MeasurementKind, ReportLanguage, ReportMarkerRead, ReportDetailSessionRead, ScoreSplit } from "@/types/reports";

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
  /** Tanda sesi Uji Coba (AC4), dari is_trial, bukan dari penanda D2. */
  trial: string;
  /** Sebelas kolom tabel peringkat, urutannya sama dengan PDF. */
  columns: readonly string[];
  deterministic: string;
  llm: string;
  splits: Readonly<Record<ScoreSplit, string>>;
  markers: Readonly<Record<string, string>>;
  months: readonly string[];
};

/** Satu teks dalam dua bahasa, Indonesia lalu Inggris, berdampingan supaya pasangannya mudah dicek. */
type Pair = readonly [id: string, en: string];

type TextKey = Exclude<keyof ReportLabels, "columns" | "splits" | "markers" | "months">;

/*
 * Teks isi laporan (Fase 0 K3), disalin apa adanya dari _LABELS di pembuat PDF server (PR #145,
 * app/modules/reports/pdf.py) supaya web dan PDF memakai kata yang sama. Kalau label di sana berubah, misalnya
 * lewat SCRUM-355 (PBI-26), ubah di sini juga; tes paritasnya gagal sampai keduanya sama. Bagian aplikasi di
 * sekitar laporan (breadcrumb, tombol, status) tidak di sini dan tetap Bahasa Indonesia.
 */
const TEXT: Readonly<Record<TextKey, Pair>> = {
  automatic: ["Otomatis", "Automatic"],
  manual: ["Manual", "Manual"],
  notApplicable: ["Tidak berlaku", "Not applicable"],
  rubric: ["Rubrik", "Rubric"],
  judgeModel: ["Model penilai", "Judge model"],
  caseBasis: ["Jumlah kasus dasar perbandingan", "Cases used for comparison"],
  caseVersions: ["Versi kasus", "Case versions"],
  created: ["Dibuat", "Created"],
  devBanner: [
    "Laporan berisi skor dev, hanya untuk internal dan tidak dapat diterbitkan.",
    "This report contains dev scores. Internal only, it cannot be published.",
  ],
  noResults: ["Tidak ada hasil untuk laporan ini.", "This report has no results."],
  contact: [
    `Untuk mendapatkan isi kasus, kirim email ke ${REPORT_CONTACT_EMAIL}.`,
    `To get the case contents, email ${REPORT_CONTACT_EMAIL}.`,
  ],
  trial: ["Uji Coba", "Trial"],
  deterministic: ["Skor deterministik", "Deterministic score"],
  llm: ["Skor penilai LLM", "LLM judge score"],
};

/** Urutan kunci di objek ini adalah urutan kolom tabel, sama dengan PDF. */
const COLUMNS: Readonly<Record<string, Pair>> = {
  rank: ["Peringkat", "Rank"],
  product: ["Produk", "Product"],
  kind: ["Jenis", "Type"],
  deterministic: ["Skor deterministik", "Deterministic score"],
  llm: ["Skor penilai LLM", "LLM judge score"],
  graded: ["Kasus dinilai", "Cases graded"],
  basis: ["Kasus dasar", "Basis cases"],
  failureRate: ["Tingkat kegagalan", "Failure rate"],
  attempts: ["Percobaan", "Attempts"],
  modelVersion: ["Versi model", "Model version"],
  markers: ["Penanda", "Markers"],
};

const SPLITS: Readonly<Record<ScoreSplit, Pair>> = {
  test: ["Kasus test", "Test cases"],
  dev: ["Kasus dev", "Dev cases"],
  combined: ["Gabungan dev + test", "Dev + test combined"],
};

/** Penanda D2 yang sudah punya label; kode lain tetap ditampilkan apa adanya (markerLabel). */
const MARKERS: Readonly<Record<string, Pair>> = {
  model_version_differs: ["Versi model berbeda", "Different model version"],
  repetitions_differ: ["Jumlah percobaan berbeda", "Different number of attempts"],
  manual_date_span_over_7_days: ["Rentang jawaban manual lebih dari 7 hari", "Manual answers span more than 7 days"],
  refusals: ["Menolak menjawab", "Refused to answer"],
};

const SIDE: Readonly<Record<ReportLanguage, 0 | 1>> = { id: 0, en: 1 };
const LOCALE: Readonly<Record<ReportLanguage, string>> = { id: "id-ID", en: "en-US" };

function pickAll<K extends string>(table: Readonly<Record<K, Pair>>, side: 0 | 1): Record<K, string> {
  return Object.fromEntries(Object.entries<Pair>(table).map(([key, pair]) => [key, pair[side]])) as Record<K, string>;
}

/** Nama bulan lengkap dari Intl: sama persis dengan daftar bulan di pdf.py untuk kedua bahasa (dicek tes). */
function monthNames(language: ReportLanguage): string[] {
  const format = new Intl.DateTimeFormat(LOCALE[language], { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, month) => format.format(Date.UTC(2026, month, 1)));
}

function labelsFor(language: ReportLanguage): ReportLabels {
  const side = SIDE[language];
  return {
    ...pickAll(TEXT, side),
    columns: Object.values(COLUMNS).map((pair) => pair[side]),
    splits: pickAll(SPLITS, side),
    markers: pickAll(MARKERS, side),
    months: monthNames(language),
  };
}

export const REPORT_LABELS: Readonly<Record<ReportLanguage, ReportLabels>> = {
  id: labelsFor("id"),
  en: labelsFor("en"),
};

/** Label otomatis/manual untuk kolom Jenis (PBI-15 AC5). */
export function measurementKindLabel(kind: MeasurementKind, language: ReportLanguage): string {
  const labels = REPORT_LABELS[language];
  return kind === "manual" ? labels.manual : labels.automatic;
}

/**
 * Satu penanda D2 dalam bahasa laporan. Kode yang belum punya label tetap ditampilkan apa adanya, sama dengan
 * pdf.py, supaya penanda baru dari server tidak hilang. Detail yang tidak kosong ditulis dalam kurung.
 * Object.hasOwn menjaga kode seperti "toString" agar tidak membaca properti bawaan objek.
 */
export function markerLabel(marker: ReportMarkerRead, language: ReportLanguage): string {
  const labels = REPORT_LABELS[language].markers;
  const text = Object.hasOwn(labels, marker.code) ? labels[marker.code] : marker.code;
  return marker.detail ? `${text} (${marker.detail})` : text;
}

/** Sel Penanda satu produk, sama dengan pdf.py _penanda_sesi: Uji Coba (is_trial) dulu, lalu penanda D2. */
export function sessionMarkersText(session: ReportDetailSessionRead, language: ReportLanguage): string {
  const trial = session.is_trial ? [REPORT_LABELS[language].trial] : [];
  return [...trial, ...(session.markers ?? []).map((marker) => markerLabel(marker, language))].join("; ");
}

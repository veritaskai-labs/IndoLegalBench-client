import type { GraderPath } from "@/types/rubric";

/**
 * Draf form versi baru rubrik (PBI-14 AC7). Semua isian berupa teks seperti di form; baru
 * diubah menjadi permintaan server saat dikirim. Server yang menilai isinya (422).
 */
export interface DraftAspect {
  /** Identitas aspek hanya untuk form (key React); tidak dikirim ke server. */
  id: string;
  name: string;
  graderPath: GraderPath;
  /** Teks kosong berarti tanpa bobot, seperti rubrik holistik klien. */
  weight: string;
  definition: string;
  /** Deskripsi aspek ini per skor level. */
  descriptors: Record<number, string>;
}

export interface DraftLevel {
  score: number;
  label: string;
  isPassing: boolean;
}

export interface RubricDraft {
  effectiveDate: string;
  approvedByName: string;
  approvedAt: string;
  judgePromptQuality: string;
  judgePromptFormat: string;
  aspects: DraftAspect[];
  levels: DraftLevel[];
}

let lastAspectId = 0;

/** Id baru yang belum pernah dipakai di draf mana pun, supaya aspek lama tidak cocok dengan yang baru. */
export function newAspectId(): string {
  lastAspectId += 1;
  return `aspek-${lastAspectId}`;
}

/** Skala klien: 5 sampai 0, lulus 4 dan 5 (jawaban klien No. 48). */
const SCORES_HIGH_TO_LOW = [5, 4, 3, 2, 1, 0];
const LOWEST_PASSING_SCORE = 4;

/**
 * Isi Rubrik Penilaian Kualitas Jawaban Hukum AI v1 (dokumen klien, 27 Okt 2026), disalin apa
 * adanya. Hanya yang tertulis di dokumen: penyetuju, tanggal, prompt penilai, dan definisi
 * aspek tidak ada di sana, jadi tidak diisi.
 */
const V1_LEVEL_LABELS: Record<number, string> = {
  5: "Sempurna dan Komprehensif",
  4: "Baik (Ada Kekurangan Minor)",
  3: "Kurang (Benar, tetapi Dangkal)",
  2: "Berisiko (Kesimpulan Kebetulan Benar, Penalaran Cacat)",
  1: "Sangat Kurang (Meleset dan Terlalu Umum)",
  0: "Fatal (Halusinasi atau Menyesatkan)",
};

const V1_DIMENSIONS: ReadonlyArray<{ name: string; descriptors: Record<number, string> }> = [
  {
    name: "Kesimpulan",
    descriptors: {
      5: "AI memberikan jawaban yang sepenuhnya benar dan tepat sasaran.",
      4: "AI memberikan jawaban yang benar.",
      3: "AI memberikan jawaban akhir yang benar.",
      2: "AI memberikan kesimpulan akhir yang seolah-olah benar atau sesuai dengan fakta yang diharapkan.",
      1: "AI memberikan jawaban yang sebagian salah, tidak menjawab inti pertanyaan, atau terlalu normatif/mengambang.",
      0: "AI memberikan jawaban yang sepenuhnya salah atau berkebalikan dengan hukum positif.",
    },
  },
  {
    name: "Dasar Hukum",
    descriptors: {
      5: "AI menggunakan peraturan yang akurat, spesifik (menyebut ayat/pasal yang tepat), dan mutakhir.",
      4: "AI menggunakan peraturan yang relevan dan tepat.",
      3: "AI menyebutkan payung hukum yang tepat secara umum, meski mungkin kurang spesifik pada pasal dan/atau ayat tertentu, serta belum lengkap atau belum mencakup seluruh regulasi yang seharusnya digunakan.",
      2: "AI menggunakan dasar hukum yang salah sasaran, sudah dicabut, atau sama sekali tidak relevan.",
      1: "AI menggunakan aturan hukum yang melenceng dari konteks permasalahan.",
      0: "AI mengarang pasal fiktif (halusinasi hukum) atau menggunakan undang-undang dari negara lain tanpa peringatan.",
    },
  },
  {
    name: "Argumentasi",
    descriptors: {
      5: "AI merangkai analisis yang sangat logis dan sistematis. AI berhasil membongkar unsur-unsur hukum dari pasal tersebut dan menerapkannya pada kasus pengguna secara runut. Tidak ada celah logika. Jawaban ini siap pengguna jadikan draft argumen awal.",
      4: "AI menyajikan penalaran yang logis dan mengarah pada kesimpulan yang benar. Namun, AI melewatkan sedikit kedalaman analisis, misalnya kurang mengelaborasi pengecualian hukum tertentu, atau penjelasannya terasa agak kaku. Secara keseluruhan, argumennya tetap valid dan aman pengguna ikuti.",
      3: "AI gagal memberikan analisis yang memadai. AI cenderung hanya melakukan copy-paste bunyi pasal dan langsung melompat pada kesimpulan (logical leap). AI tidak menjelaskan mengapa atau bagaimana pasal tersebut membenarkan kesimpulan akhirnya. Jawaban ini tidak salah, tetapi kurang memiliki nilai analitis.",
      2: "AI membangun argumentasi yang cacat secara logika (fallacy). Kesimpulan akhir yang benar tersebut lahir secara kebetulan atau hasil dari asumsi liar, bukan dari deduksi hukum yang diturunkan AI pada bagian pembahasan.",
      1: "AI kehilangan fokus. Analisis yang AI berikan membahas topik lain yang tidak relevan dengan pertanyaan pengguna. Kesalahan ini tidak sampai fatal atau membahayakan, tetapi jawaban tersebut sama sekali tidak berguna bagi pengguna.",
      0: "AI memberikan penalaran yang menyesatkan. Jawaban ini berpotensi merugikan pengguna secara fatal jika pengguna menerapkan saran tersebut di dunia nyata.",
    },
  },
];

function buildLevels(label: (score: number) => string): DraftLevel[] {
  return SCORES_HIGH_TO_LOW.map((score) => ({
    score,
    label: label(score),
    isPassing: score >= LOWEST_PASSING_SCORE,
  }));
}

function emptyTexts() {
  return { effectiveDate: "", approvedByName: "", approvedAt: "", judgePromptQuality: "", judgePromptFormat: "" };
}

/**
 * Draf awal dari rubrik v1 klien. Semua dimensi di jalur LLM: rubrik ini menilai kualitas jawaban,
 * dan jalur deterministik (sitasi) punya rumus sendiri. Admin bisa mengubahnya di form.
 * Objek baru di tiap panggilan, karena form mengubah draf langsung.
 */
export function createRubricV1Draft(): RubricDraft {
  return {
    ...emptyTexts(),
    aspects: V1_DIMENSIONS.map(({ name, descriptors }) => ({
      id: newAspectId(),
      name,
      graderPath: "llm",
      weight: "",
      definition: "",
      descriptors: { ...descriptors },
    })),
    levels: buildLevels((score) => V1_LEVEL_LABELS[score]),
  };
}

/** Form tanpa template: skala 0 sampai 5 siap diisi dan satu aspek kosong (versi butuh minimal satu). */
export function createEmptyDraft(): RubricDraft {
  return {
    ...emptyTexts(),
    aspects: [{ id: newAspectId(), name: "", graderPath: "llm", weight: "", definition: "", descriptors: {} }],
    levels: buildLevels(() => ""),
  };
}

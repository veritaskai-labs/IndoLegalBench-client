"use client";

import { useRouter } from "next/navigation";

import { RubricVersionForm } from "@/components/rubrics/RubricVersionForm";
import { useToast } from "@/components/ui/Toast";
import { useRubricVersions } from "@/hooks/useRubricVersions";
import { nextVersionNo } from "@/lib/rubrics/rubricVersion";

const LIST = "/admin/rubrics";

/**
 * Buat versi baru rubrik (SCRUM-375 B), halaman sendiri seperti prototipe. Daftar versi hanya dibaca
 * untuk judul "Akan disimpan sebagai Versi N"; bila gagal dimuat, form tetap bisa dipakai tanpa nomor.
 * Setelah tersimpan Admin kembali ke daftar, dan pesannya memakai nomor dari jawaban server.
 */
export default function NewRubricVersionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const versions = useRubricVersions();

  return (
    <RubricVersionForm
      nextVersionNo={versions.status === "ready" ? nextVersionNo(versions.data) : null}
      onCreated={(created) => {
        showToast(`Versi ${created.version_no} berhasil dibuat.`);
        router.push(LIST);
      }}
      onCancel={() => router.push(LIST)}
    />
  );
}

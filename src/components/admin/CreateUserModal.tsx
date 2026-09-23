"use client";

import { useState } from "react";
import type { Role } from "@/types";
import type { UserCreateRequest } from "@/types/user-management";
import { ApiError } from "@/lib/apiClient";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: UserCreateRequest) => Promise<void>;
}

export function CreateUserModal({ isOpen, onClose, onSubmit }: CreateUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setName("");
    setEmail("");
    setRole("");
    setErrorMessage(null);
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !role) {
      setErrorMessage("Semua kolom (Nama, Email, Peran) wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onSubmit({ name: name.trim(), email: email.trim(), role: role as Role });
      handleClose();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMessage(`Email '${email.trim()}' sudah terdaftar dalam sistem.`);
      } else if (err instanceof ApiError) {
        setErrorMessage(err.code || "Gagal menambahkan pengguna.");
      } else {
        setErrorMessage("Terjadi kesalahan jaringan.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl border border-slate-100">
        <h2 className="text-xl font-bold text-center text-slate-900 mb-6">
          Tambah Pengguna Baru
        </h2>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label htmlFor="name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama
            </label>
            <input
              id="name-input"
              type="text"
              placeholder="Nama lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              required
            />
          </div>

          <div>
            <label htmlFor="email-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              required
            />
          </div>

          <div>
            <label htmlFor="role-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Peran
            </label>
            <select
              id="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              required
            >
              <option value="" disabled>Pilih peran</option>
              <option value="admin">Admin</option>
              <option value="author">Author</option>
              <option value="reviewer">Reviewer</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div className="mt-8 flex justify-between gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-1/2 rounded-lg border border-slate-300 bg-white py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-1/2 rounded-lg bg-indigo-600 py-2.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Menyimpan…" : "Tambah pengguna"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
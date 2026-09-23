"use client";

import { useState } from "react";
import type { Role } from "@/types";
import type { StatusFilter } from "@/types/user-management";

interface FilterPopoverProps {
  isOpen: boolean;
  selectedRoles: Role[];
  activeStatus: StatusFilter;
  onClose: () => void;
  onApply: (roles: Role[], status: StatusFilter) => void;
}

const ROLES: { label: string; value: Role }[] = [
  { label: "Admin", value: "admin" },
  { label: "Author", value: "author" },
  { label: "Reviewer", value: "reviewer" },
  { label: "Viewer", value: "viewer" },
];

export function FilterPopover({
  isOpen,
  selectedRoles: initialRoles,
  activeStatus: initialStatus,
  onClose,
  onApply,
}: FilterPopoverProps) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);

  if (!isOpen) return null;

  const toggleRole = (role: Role) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleApply = () => {
    onApply(roles, status);
    onClose();
  };

  return (
    <div className="absolute right-0 top-12 z-40 w-72 rounded-xl bg-white p-5 shadow-xl border border-slate-200 text-xs">
      <div className="grid grid-cols-2 gap-4 pb-4">
        <div>
          <h4 className="font-semibold text-slate-900 mb-2">Peran</h4>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={roles.includes(r.value)}
                  onChange={() => toggleRole(r.value)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900 mb-2">Keaktifan</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="radio"
                name="filter-status"
                checked={status === "active"}
                onChange={() => setStatus("active")}
                className="border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Aktif
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="radio"
                name="filter-status"
                checked={status === "inactive"}
                onChange={() => setStatus("inactive")}
                className="border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Non-aktif
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="radio"
                name="filter-status"
                checked={status === "all"}
                onChange={() => setStatus("all")}
                className="border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Semua
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="w-1/2 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="w-1/2 rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
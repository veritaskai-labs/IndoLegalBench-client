"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { User, UserCreateRequest, StatusFilter } from "@/types/user-management";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import { DeactivateConfirmModal } from "@/components/admin/DeactivateConfirmModal";
import { FilterPopover } from "@/components/admin/FilterPopover";

export default function AdminMembersPage() {
  const auth = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoles, setFilterRoles] = useState<Role[]>([]);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);

  // Hook RBAC: Redirect jika bukan admin
  useEffect(() => {
    if (auth.status === "authenticated" && auth.user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [auth, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setIsLoading(true);
      setApiError(null);
      try {
        const queryParam =
          filterStatus === "active"
            ? "?is_active=true"
            : filterStatus === "inactive"
            ? "?is_active=false"
            : "";

        const data = await apiFetch<User[]>(`/admin/users${queryParam}`);
        if (!cancelled) {
          setUsers(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setApiError(err.code);
          } else {
            setApiError("Gagal menghubungi server");
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (auth.status === "authenticated" && auth.user.role === "admin") {
      loadInitialData();
    }

    return () => {
      cancelled = true;
    };
  }, [auth.status, auth.user?.role, filterStatus]);

  const displayedUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query);

      const matchesRole = filterRoles.length === 0 || filterRoles.includes(user.role);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && user.is_active) ||
        (filterStatus === "inactive" && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, filterRoles, filterStatus]);

  const refreshUsers = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const queryParam =
        filterStatus === "active"
          ? "?is_active=true"
          : filterStatus === "inactive"
          ? "?is_active=false"
          : "";

      const data = await apiFetch<User[]>(`/admin/users${queryParam}`);
      setUsers(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.code);
      } else {
        setApiError("Gagal menghubungi server");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (payload: UserCreateRequest) => {
    await apiFetch<User>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await refreshUsers();
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    const previous = [...users];
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    try {
      await apiFetch<User>(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
    } catch {
      setUsers(previous);
      alert("Gagal mengubah peran pengguna.");
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingUser) return;

    await apiFetch<User>(`/admin/users/${deactivatingUser.id}/deactivate`, {
      method: "POST",
    });

    setUsers((prev) =>
      prev.map((u) => (u.id === deactivatingUser.id ? { ...u, is_active: false } : u))
    );
  };

  if (auth.status === "loading") {
    return <div className="p-8 text-xs text-slate-500">Memeriksa hak akses…</div>;
  }

  if (auth.status === "authenticated" && auth.user.role !== "admin") {
    return null;
  }

  return (
    <div className="w-full">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 max-w-2xl gap-2">
          <input
            type="text"
            placeholder="Cari ID, nama atau email pengguna"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-xs"
          />
          <button
            type="button"
            aria-label="Cari"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 relative">
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer ${
              filterRoles.length > 0 || filterStatus !== "all"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
            }`}
          >
            Filter
          </button>

          <FilterPopover
            isOpen={isFilterOpen}
            selectedRoles={filterRoles}
            activeStatus={filterStatus}
            onClose={() => setIsFilterOpen(false)}
            onApply={(roles, status) => {
              setFilterRoles(roles);
              setFilterStatus(status);
            }}
          />

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors"
          >
            Tambah pengguna
          </button>
        </div>
      </div>

      {/* Error API State */}
      {apiError && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between"
        >
          <p className="text-xs text-red-800">Galat memuat data: {apiError}</p>
          <button
            onClick={refreshUsers}
            className="text-xs text-red-700 hover:text-red-900 font-medium px-2 py-1 rounded bg-red-100 cursor-pointer"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Tabel Pengguna */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs text-slate-700 border-collapse table-fixed">
          <thead>
            <tr className="border-b border-slate-200 bg-white text-slate-900 font-semibold">
              <th className="py-3.5 pl-6 pr-2 w-36">ID</th>
              <th className="py-3.5 pl-2 pr-6">Nama Lengkap</th>
              <th className="py-3.5 px-6">Email</th>
              <th className="py-3.5 px-6 w-36">Peran</th>
              <th className="py-3.5 px-6 text-right w-24">Aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 pl-6 pr-2"><div className="h-3.5 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-4 pl-2 pr-6"><div className="h-3.5 w-32 bg-slate-200 rounded" /></td>
                  <td className="py-4 px-6"><div className="h-3.5 w-44 bg-slate-200 rounded" /></td>
                  <td className="py-4 px-6"><div className="h-7 w-24 bg-slate-200 rounded" /></td>
                  <td className="py-4 px-6 text-right"><div className="inline-block h-5 w-9 bg-slate-200 rounded-full" /></td>
                </tr>
              ))
            ) : displayedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <p className="font-medium text-slate-600 mb-1">Tidak ada anggota ditemukan</p>
                  <p className="text-[11px] text-slate-400">
                    {searchQuery || filterRoles.length > 0 || filterStatus !== "all"
                      ? "Coba sesuaikan kata kunci pencarian atau filter."
                      : "Belum ada anggota yang terdaftar."}
                  </p>
                </td>
              </tr>
            ) : (
              displayedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pl-6 pr-2 font-mono text-slate-500 whitespace-nowrap">
                    <span title={user.id}>
                      {user.id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="py-3 pl-2 pr-6 font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="py-3 px-6 text-slate-600 truncate">{user.email}</td>
                  <td className="py-3 px-6">
                    <select
                      aria-label={`Ubah peran ${user.name}`}
                      value={user.role}
                      disabled={!user.is_active}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs hover:border-slate-300 focus:border-indigo-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="author">Author</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button
                      type="button"
                      aria-label={`Toggle aktif ${user.name}`}
                      onClick={() => {
                        if (user.is_active) setDeactivatingUser(user);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        user.is_active ? "bg-indigo-600 cursor-pointer" : "bg-slate-200 cursor-not-allowed"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          user.is_active ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateUser}
      />

      <DeactivateConfirmModal
        user={deactivatingUser}
        isOpen={!!deactivatingUser}
        onClose={() => setDeactivatingUser(null)}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
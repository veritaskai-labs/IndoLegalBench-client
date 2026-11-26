"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { User, UserCreateRequest, StatusFilter } from "@/types/user-management";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import { ActivateConfirmModal } from "@/components/admin/ActivateConfirmModal";
import { DeactivateConfirmModal } from "@/components/admin/DeactivateConfirmModal";
import { PendingReviewsModal } from "@/components/admin/PendingReviewsModal";
import { useMemberChange } from "@/hooks/useMemberChange";
import { FilterPopover } from "@/components/admin/FilterPopover";
import { adminErrorMessage } from "@/components/admin/errorMessage";
import { memberToggleAction, replaceMember } from "@/lib/members/memberToggle";
import { ROLE_OPTIONS } from "@/lib/members/roleOptions";
import { activateUser } from "@/lib/userApi";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";

const LOAD_ERROR = "Gagal memuat daftar anggota.";
const SELF_LOCKED = "Anda tidak dapat mengubah akun Anda sendiri.";
const STATUS_SUMMARY: Record<StatusFilter, string | null> = { all: null, active: "Aktif", inactive: "Nonaktif" };

/** Teks pada tombol Filter, supaya filter yang aktif terlihat tanpa membuka popover. */
function rolesSummary(roles: Role[]): string {
  if (roles.length === 0) return "Semua peran";
  if (roles.length > 1) return `${roles.length} peran`;
  return ROLE_OPTIONS.find((option) => option.value === roles[0])?.label ?? "1 peran";
}

function fetchUsers(status: StatusFilter): Promise<User[]> {
  const queryParam =
    status === "active" ? "?is_active=true" : status === "inactive" ? "?is_active=false" : "";
  return apiFetch<User[]>(`/admin/users${queryParam}`);
}

export default function AdminMembersPage() {
  const auth = useAuth();
  const router = useRouter();

  // Ambil status & role dengan aman untuk discriminated union
  const isAuthenticated = auth.status === "authenticated";
  const userRole = isAuthenticated ? auth.user.role : null;
  const currentUserId = isAuthenticated ? auth.user.id : null;

  // 1. Deklarasi State
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoles, setFilterRoles] = useState<Role[]>([]);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [activatingUser, setActivatingUser] = useState<User | null>(null);
  const change = useMemberChange((updated) => setUsers((prev) => replaceMember(prev, updated)));

  // 2. Hook RBAC: Redirect jika bukan admin
  useEffect(() => {
    if (isAuthenticated && userRole !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, userRole, router]);

  // 3. Hook Data Fetching
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setIsLoading(true);
      setApiError(null);
      try {
        const data = await fetchUsers(filterStatus);
        if (!cancelled) {
          setUsers(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setApiError(adminErrorMessage(err, LOAD_ERROR));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (isAuthenticated && userRole === "admin") {
      loadInitialData();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userRole, filterStatus]);

  // 4. Hook useMemo
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

  // 5. Fungsi Refresh & Mutasi
  const refreshUsers = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      setUsers(await fetchUsers(filterStatus));
    } catch (err: unknown) {
      setApiError(adminErrorMessage(err, LOAD_ERROR));
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

  // Tidak ada pembaruan optimistik: baris baru berubah setelah server menyimpan, jadi 409 dan
  // Batal tidak perlu dikembalikan. Alur konfirmasinya ada di useMemberChange.
  const handleRoleChange = async (user: User, newRole: Role) => {
    setApiError(null);
    await change.changeRole(user, newRole);
  };

  const handleConfirmDeactivate = (target: User) => change.deactivate(target);

  const handleConfirmActivate = async (target: User) => {
    const updated = await activateUser(target.id);
    setUsers((prev) => replaceMember(prev, updated));
  };

  // 6. Early returns setelah semua hook
  if (auth.status === "loading") {
    return <div className="p-8 text-xs text-slate-500">Memeriksa hak akses…</div>;
  }

  if (isAuthenticated && userRole !== "admin") {
    return null;
  }

  const alertMessage = apiError ?? change.error;

  const filterSummary = [rolesSummary(filterRoles), STATUS_SUMMARY[filterStatus]].filter(Boolean).join(", ");

  return (
    <div className="w-full space-y-6">
      <header>
        <h1 className="font-serif text-4xl leading-10 text-ink">Pengguna</h1>
        <p className="mt-2 text-muted">Kelola pengguna platform, peran akses, dan status aktifnya.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Cari pengguna</span>
            <Icon name="cari" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              placeholder="Cari ID, nama atau email pengguna"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </label>
          <div className="relative">
            <button
              type="button"
              aria-label="Filter"
              aria-expanded={isFilterOpen}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-control border px-3 text-sm transition-colors ${
                filterRoles.length > 0 || filterStatus !== "all"
                  ? "border-accent bg-accent-wash text-accent-ink"
                  : "border-line bg-paper text-ink hover:bg-surface"
              }`}
            >
              <span className="text-muted">Filter:</span> {filterSummary}
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
          </div>
        </div>

        <Button variant="accent" onClick={() => setIsCreateOpen(true)}>
          <Icon name="tambah" />
          Tambah pengguna
        </Button>
      </div>

      {/* Error API State */}
      {alertMessage && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-control border border-danger/30 bg-danger/5 p-4"
        >
          <p className="text-sm text-danger-deep">{alertMessage}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              change.clearError();
              void refreshUsers();
            }}
          >
            Coba lagi
          </Button>
        </div>
      )}

      {/* Tabel Pengguna */}
      <div className="overflow-x-auto rounded-control border border-line bg-paper">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm text-ink">
          <thead>
            <tr className="bg-surface text-ink-soft">
              <th className="w-36 py-2.5 pr-2 pl-4 font-medium">ID</th>
              <th className="py-2.5 pr-4 pl-2 font-medium">Nama Lengkap</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="w-40 px-4 py-2.5 font-medium">Peran</th>
              <th className="w-24 px-4 py-2.5 text-right font-medium">Aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {isLoading && (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 pr-2 pl-4"><div className="h-3.5 w-20 rounded bg-surface" /></td>
                  <td className="py-4 pr-4 pl-2"><div className="h-3.5 w-32 rounded bg-surface" /></td>
                  <td className="px-4 py-4"><div className="h-3.5 w-44 rounded bg-surface" /></td>
                  <td className="px-4 py-4"><div className="h-8 w-28 rounded bg-surface" /></td>
                  <td className="px-4 py-4 text-right"><div className="inline-block h-6 w-10 rounded-full bg-surface" /></td>
                </tr>
              ))
            )}
            {!isLoading && displayedUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <p className="mb-1 font-medium text-ink">Tidak ada anggota ditemukan</p>
                  <p className="text-xs text-muted">
                    {searchQuery || filterRoles.length > 0 || filterStatus !== "all"
                      ? "Coba sesuaikan kata kunci pencarian atau filter."
                      : "Belum ada anggota yang terdaftar."}
                  </p>
                </td>
              </tr>
            )}
            {!isLoading && displayedUsers.length > 0 && (
              displayedUsers.map((user) => {
                // Backend menolak ubah peran / nonaktifkan akun sendiri
                // (CANNOT_CHANGE_OWN_ROLE, CANNOT_DEACTIVATE_SELF), jadi
                // kontrolnya dikunci di sini juga.
                const isSelf = user.id === currentUserId;
                const toggleAction = memberToggleAction(user, currentUserId);
                return (
                <tr key={user.id} className="transition-colors hover:bg-surface-hover">
                  <td className="py-3 pr-2 pl-4 font-mono text-xs whitespace-nowrap text-muted">
                    <span title={user.id}>
                      {user.id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="py-3 pr-4 pl-2">
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-medium text-ink-soft"
                      >
                        {user.name.trim()[0]?.toUpperCase()}
                      </span>
                      <span className="truncate font-medium">{user.name}</span>
                    </span>
                  </td>
                  <td className="truncate px-4 py-3 text-ink-soft">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Ubah peran ${user.name}`}
                      value={user.role}
                      disabled={!user.is_active || isSelf}
                      title={isSelf ? SELF_LOCKED : undefined}
                      onChange={(e) => handleRoleChange(user, e.target.value as Role)}
                      className="h-8 w-full cursor-pointer rounded-control border-0 bg-surface px-3 text-sm text-ink hover:bg-surface-press disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-subtle"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Toggle aktif ${user.name}`}
                      disabled={toggleAction === null}
                      title={isSelf ? SELF_LOCKED : undefined}
                      onClick={() => {
                        if (toggleAction === "deactivate") setDeactivatingUser(user);
                        if (toggleAction === "activate") setActivatingUser(user);
                      }}
                      className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:cursor-not-allowed ${
                        user.is_active ? "bg-ink" : "bg-line"
                      } ${toggleAction ? "cursor-pointer" : "opacity-50"}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-paper shadow-md ring-0 transition duration-200 ease-in-out ${
                          user.is_active ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
                );
              })
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

      <PendingReviewsModal
        pending={change.pending}
        onConfirm={change.confirmPending}
        onCancel={change.cancelPending}
      />

      <ActivateConfirmModal
        user={activatingUser}
        isOpen={!!activatingUser}
        onClose={() => setActivatingUser(null)}
        onConfirm={handleConfirmActivate}
      />
    </div>
  );
}
"use client";

import { api, type User } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, History, Plus, ShieldCheck, UserRoundCog, Users } from "lucide-react";
import { useState } from "react";

type AuditLog = {
  id: number;
  actor_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: Record<string, unknown>;
  created_at: string;
};

export default function UsersPage() {
  const client = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/admin/users") });
  const auditLogs = useQuery({ queryKey: ["audit-logs"], queryFn: () => api<AuditLog[]>("/admin/audit-logs") });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roleChanges, setRoleChanges] = useState<Record<number, User["role"]>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const update = useMutation({
    mutationFn: ({ user, role, active }: { user: User; role: User["role"]; active: boolean }) =>
      api<User>(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ full_name: user.full_name, role, is_active: active }),
      }),
    onSuccess: (data) => {
      void client.invalidateQueries({ queryKey: ["users"] });
      void client.invalidateQueries({ queryKey: ["audit-logs"] });
      setRoleChanges((prev) => {
        const next = { ...prev };
        delete next[data.id];
        return next;
      });
      setError("");
      setSuccess(`Account for ${data.full_name} was updated.`);
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (reason) => {
      setError(reason instanceof Error ? reason.message : "Could not update account");
      setSuccess("");
    },
  });

  const create = useMutation({
    mutationFn: (payload: { full_name: string; email: string; password: string; role: User["role"] }) =>
      api<User>("/admin/users", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (newUser) => {
      void client.invalidateQueries({ queryKey: ["users"] });
      void client.invalidateQueries({ queryKey: ["audit-logs"] });
      setShowCreate(false);
      setError("");
      setSuccess(`Created account for ${newUser.full_name} (${newUser.role}).`);
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (reason) => {
      setError(reason instanceof Error ? reason.message : "Could not create account");
      setSuccess("");
    },
  });

  const createUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({
      full_name: String(form.get("full_name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      role: String(form.get("role")) as User["role"],
    });
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-10 md:py-10">
      <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy">
        <ArrowLeft size={16} />Workspace
      </a>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Administration</div>
          <h1 className="mt-2 text-3xl font-semibold text-navy">User management</h1>
          <p className="mt-2 text-sm text-slate-500">Review registered accounts, promote roles, and manage access to ALIENX.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowLogs((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <History size={16} />
            {showLogs ? "Hide audit trail" : "View audit trail"}
          </button>
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-[#076f79]"
          >
            <Plus size={16} />
            Create account
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={createUser} className="card mt-6 grid gap-4 p-5 md:grid-cols-4">
          <label className="text-sm font-semibold text-navy">
            Full name
            <input required name="full_name" maxLength={160} placeholder="e.g. Dr. Jane Smith" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal" />
          </label>
          <label className="text-sm font-semibold text-navy">
            Email
            <input required name="email" type="email" placeholder="jane@university.edu" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal" />
          </label>
          <label className="text-sm font-semibold text-navy">
            Initial password
            <input required name="password" type="password" minLength={10} maxLength={128} placeholder="Min 10 characters" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal" />
          </label>
          <label className="text-sm font-semibold text-navy">
            Role
            <select name="role" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal">
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <div className="flex gap-2 md:col-span-4">
            <button disabled={create.isPending} className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {create.isPending ? "Creating…" : "Save account"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {success && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

      <div className="card mt-7 overflow-hidden">
        {users.isLoading ? (
          <div className="p-8 text-sm text-slate-400">Loading accounts…</div>
        ) : users.error ? (
          <div role="alert" className="p-8 text-sm text-rose-700">{(users.error as Error).message}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.data?.map((user) => {
              const pendingRole = roleChanges[user.id];
              const hasRoleChange = pendingRole && pendingRole !== user.role;
              return (
                <article key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-500">
                    <Users size={17} />
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm font-semibold text-navy">{user.full_name}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Role for ${user.full_name}`}
                      value={pendingRole ?? user.role}
                      onChange={(e) => setRoleChanges((state) => ({ ...state, [user.id]: e.target.value as User["role"] }))}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold capitalize text-slate-600 outline-none focus:border-teal"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Administrator</option>
                    </select>
                    {hasRoleChange && (
                      <button
                        onClick={() => update.mutate({ user, role: pendingRole, active: user.is_active })}
                        disabled={update.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal px-2.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#076f79] disabled:opacity-50"
                      >
                        <Check size={13} />
                        Apply
                      </button>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {user.is_active ? "ACTIVE" : "DEACTIVATED"}
                  </span>
                  <button
                    onClick={() => update.mutate({ user, role: pendingRole ?? user.role, active: !user.is_active })}
                    disabled={update.isPending}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {user.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <UserRoundCog size={14} />
        Changing roles or account access is recorded in the permanent audit log.
      </div>

      {showLogs && (
        <section className="card mt-8 p-5 md:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="eyebrow">Audit log</div>
              <h2 className="mt-1 text-base font-semibold text-navy">Security and system events</h2>
            </div>
            <div className="text-xs text-slate-400">{auditLogs.data?.length ?? 0} events recorded</div>
          </div>
          {auditLogs.isLoading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading audit trail…</div>
          ) : (auditLogs.data ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No audit events recorded yet.</div>
          ) : (
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
              {(auditLogs.data ?? []).map((entry) => (
                <div key={entry.id} className="flex flex-col justify-between gap-1 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded bg-navy/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-navy">
                      {entry.action}
                    </span>
                    <span className="text-slate-600">
                      on <strong className="font-semibold text-navy">{entry.entity_type}</strong>
                      {entry.entity_id ? ` #${entry.entity_id}` : ""}
                    </span>
                    {entry.actor_id && <span className="text-slate-400">by actor #{entry.actor_id}</span>}
                  </div>
                  <time className="text-slate-400" dateTime={entry.created_at}>
                    {new Date(entry.created_at).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

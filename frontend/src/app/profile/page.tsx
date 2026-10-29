"use client";

import { api, type User } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const profile = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/auth/me") });
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (profile.data) setName(profile.data.full_name); }, [profile.data]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setMessage(""); setError("");
    try {
      await api<User>("/auth/me", { method: "PATCH", body: JSON.stringify({ full_name: name }) });
      setMessage("Your profile was updated.");
      void profile.refetch();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update profile"); }
  }
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 md:px-10 md:py-10"><a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/>Workspace</a><div className="mt-8"><div className="eyebrow">Account</div><h1 className="mt-2 text-3xl font-semibold text-navy">Profile settings</h1><p className="mt-2 text-sm text-slate-500">Manage your ALIENX account details.</p></div><form onSubmit={save} className="card mt-7 p-6"><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf4f5] text-teal"><UserRound size={20}/></div><div><div className="font-semibold text-navy">{profile.data?.email ?? "Loading…"}</div><div className="text-xs capitalize text-slate-400">{profile.data?.role}</div></div></div><label className="mt-5 block text-sm font-semibold">Full name<input required minLength={1} maxLength={160} value={name} onChange={(e)=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-teal"/></label>{message && <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16}/>{message}</div>}{error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}<button className="mt-5 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white">Save profile</button></form></main>;
}

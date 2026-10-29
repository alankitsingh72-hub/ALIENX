"use client";

import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type User } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: String(form.get("full_name") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        }),
      });
      router.push("/login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  return <main className="grid min-h-screen place-items-center px-5 py-12">
    <form onSubmit={submit} className="card w-full max-w-md p-8">
      <a href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/>Back to sign in</a>
      <div className="mb-5 flex items-center gap-2 font-bold tracking-widest text-navy"><BookOpenCheck className="text-teal"/>ALIENX</div>
      <div className="eyebrow">Get started</div><h1 className="mt-2 text-3xl font-semibold text-navy">Create your account</h1>
      <p className="mt-2 text-sm text-slate-500">Student registration is open to everyone.</p>
      <label className="mt-7 block text-sm font-semibold">Full name<input required name="full_name" maxLength={160} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal"/></label>
      <label className="mt-4 block text-sm font-semibold">University email<input required name="email" type="email" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal"/></label>
      <label className="mt-4 block text-sm font-semibold">Password<input required name="password" type="password" minLength={10} maxLength={128} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal"/><span className="mt-1 block text-xs font-normal text-slate-400">Use at least 10 characters.</span></label>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <button disabled={busy} className="mt-6 w-full rounded-xl bg-teal px-4 py-3.5 font-semibold text-white disabled:opacity-60">{busy ? "Creating account..." : "Create account"}</button>
    </form>
  </main>;
}

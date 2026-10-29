"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BookOpenCheck, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, type User } from "@/lib/api";
import { useAuth } from "@/lib/store";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuth((state) => state.setUser);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError("");
    setBusy(true);
    try {
      const result = await api<{
        access_token: string;
        refresh_token: string;
        user: User;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      localStorage.setItem("alienx_access_token", result.access_token);
      localStorage.setItem("alienx_refresh_token", result.refresh_token);
      setUser(result.user);
      router.push("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#102a43] px-5 py-10 lg:grid lg:grid-cols-[1.05fr_.95fr] lg:p-0">
      <section className="relative hidden overflow-hidden px-16 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-40 top-40 h-[520px] w-[520px] rounded-full border border-white/10" />
        <div className="absolute -left-24 top-56 h-[360px] w-[360px] rounded-full border border-white/10" />
        <a className="relative flex items-center gap-3 text-lg font-bold tracking-[.2em]" href="/"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal"><BookOpenCheck size={21}/></span>ALIENX</a>
        <div className="relative max-w-xl">
          <div className="mb-5 text-xs font-bold uppercase tracking-[.24em] text-teal-300">Built for better learning</div>
          <h1 className="text-5xl font-semibold leading-[1.12]">A clearer way to<br/>show what you know.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">Thoughtful assessments. Fair, consistent grading. A calmer exam experience from first question to final result.</p>
        </div>
        <div className="relative flex items-center gap-3 text-sm text-slate-400"><span className="h-px w-9 bg-teal"/>Learning, measured with care.</div>
      </section>
      <section className="flex items-center justify-center bg-[#f7f9fb] px-4 py-8 lg:rounded-l-[32px] lg:px-14">
        <div className="w-full max-w-[410px]">
          <a className="mb-12 flex items-center gap-2 font-bold tracking-[.18em] text-navy lg:hidden" href="/"><BookOpenCheck className="text-teal"/> ALIENX</a>
          <div className="eyebrow">Welcome back</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy">Sign in to your account</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Pick up where you left off in your learning journey.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-5">
            <label className="block text-sm font-semibold text-slate-700">Email address
              <input {...register("email")} type="email" autoComplete="email" placeholder="you@university.edu" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"/>
              {errors.email && <span className="mt-1 block text-xs text-rose-600">Enter a valid email address.</span>}
            </label>
            <label className="block text-sm font-semibold text-slate-700">Password
              <input {...register("password")} type="password" autoComplete="current-password" placeholder="Enter your password" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"/>
              {errors.password && <span className="mt-1 block text-xs text-rose-600">Password is required.</span>}
            </label>
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal/20 transition hover:bg-[#076f79] disabled:opacity-60">
              <LockKeyhole size={16}/>{busy ? "Signing in..." : "Sign in"}<ArrowRight size={16}/>
            </button>
          </form>
          <p className="mt-7 text-center text-xs leading-5 text-slate-400">Demo accounts &amp; credentials are listed in the project README.</p>
          <p className="mt-5 text-center text-sm text-slate-500">New to ALIENX? <a href="/register" className="font-semibold text-teal hover:underline">Create a student account</a></p>
        </div>
      </section>
    </main>
  );
}

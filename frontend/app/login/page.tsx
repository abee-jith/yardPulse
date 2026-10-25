"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest, getPayloadData, TOKEN_KEY } from "@/lib/api";

type LoginResponse = { accessToken: string; fullName: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) router.replace("/");
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await apiRequest<LoginResponse>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const login = getPayloadData(result);
      if (!login?.accessToken) throw new Error("The login response did not include an access token.");
      localStorage.setItem(TOKEN_KEY, login.accessToken);
      router.replace("/");
    } catch (cause) {
      setError(
        cause instanceof ApiError || cause instanceof Error
          ? cause.message
          : "Unable to sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-9">
          <div className="mb-7 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--green)] text-lg font-bold text-white">
              Y
            </span>
            <span className="text-lg font-bold tracking-tight">YardPulse</span>
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--green)]">
            Container operations
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Sign in to search the yard and manage appointments.
          </p>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <label className="block text-sm font-semibold">
            Email
            <input
              className="mt-2 w-full rounded-xl border border-[var(--line)] px-4 py-3 font-normal"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input
              className="mt-2 w-full rounded-xl border border-[var(--line)] px-4 py-3 font-normal"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            className="w-full rounded-xl bg-[var(--green)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

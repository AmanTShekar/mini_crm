"use client";

import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, Field, PrimaryButton } from "@/components/ui";
import TopBar from "@/components/TopBar";

function LoginInner() {
  const [email, setEmail] = useState("admin@stay.local");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/admin";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError("Wrong email or password. Try the demo login below.");
      } else if (res?.ok) {
        router.push(res.url || callbackUrl);
        router.refresh();
      } else {
        setError("Couldn't sign in — check your connection and try again.");
      }
    } catch {
      setError("Couldn't reach the server. Is it running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 py-6">
      <TopBar title="Admin login" fallback="/" />
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b6f6b]">
        Stay CRM · Admin
      </p>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <Card className="mt-4">
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Email">
            <input
              className={cn("input", error && "input-error")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </Field>
          <Field label="Password" error={error ?? undefined}>
            <input
              className={cn("input", error && "input-error")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>
          <PrimaryButton disabled={busy}>{busy ? "Signing in…" : "Sign in"}</PrimaryButton>
        </form>
      </Card>
      <p className="mt-3 text-center text-xs text-[#6b6f6b]">
        Demo: admin@stay.local / admin123
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

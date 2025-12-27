"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase/client";
import { useAuthSession } from "../../hooks/useAuthSession";

export default function LoginPage() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [router, session]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
    }
    setIsLoading(false);
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setError("Cadastro criado. Verifique seu email para confirmar.");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Finezza RB
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Acesse sua clinica
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Entre para acompanhar agenda, pacientes e financeiro.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs text-slate-500">Nome completo</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs text-slate-500">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
              placeholder="voce@email.com"
              type="email"
              autoComplete="email"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs text-slate-500">Senha</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-1 ring-transparent focus:ring-indigo-500/40"
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-xs text-slate-600">
              {error}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="glow"
              className="w-full"
              onClick={handleSignIn}
              disabled={isLoading}
            >
              Entrar
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSignUp}
              disabled={isLoading}
            >
              Criar conta
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";
import type { AuthUser } from "@/context/auth-context";
 
export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated) {
      const isMadrinha = auth.user?.roles?.includes("Madrinha") ?? false;
      if (isMadrinha) {
        navigate({ to: "/areamadrinha" });
      } else {
        navigate({ to: "/minha-viagem" });
      }
    }
  }, [auth.isAuthenticated, auth.ready, auth.user, navigate]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedSenha = senha.trim();

    if (!trimmedEmail || !trimmedSenha) {
      setError("E-mail e senha são obrigatórios.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email: trimmedEmail,
        senha: trimmedSenha,
      });

      const payload = response.data as {
        token?: string;
        accessToken?: string;
        usuario?: AuthUser;
        data?: { token?: string; accessToken?: string };
      };

      const token = payload.token ?? payload.accessToken ?? payload.data?.token ?? payload.data?.accessToken;
      const usuario = payload.usuario ?? null;

      if (!token) {
        throw new Error("O backend não retornou um token de autenticação.");
      }

      auth.login(token, usuario);
      const isMadrinha = usuario?.roles?.includes("Madrinha") ?? false;
      if (isMadrinha) {
        navigate({ to: "/areamadrinha" });
      } else {
        navigate({ to: "/minha-viagem" });
      }
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <SiteShell>
    <main className=" bg-[radial-gradient(circle_at_top,_rgba(210,174,149,0.28),_transparent_40%),linear-gradient(180deg,_#fbf7f2_0%,_#fffdfb_100%)] px-6 py-12 flex items-center justify-center">
      <section className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white/90 p-8 shadow-[0_24px_80px_rgba(56,38,25,0.12)] backdrop-blur">
        <div className="mb-8 space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--terracotta)]">Porto Segura</p>
          <h1 className="text-3xl font-medium leading-tight">Entrar na sua conta</h1>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[var(--moss)] focus:ring-2 focus:ring-[var(--moss)]/15"
              placeholder="voce@exemplo.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[var(--moss)] focus:ring-2 focus:ring-[var(--moss)]/15"
              placeholder="Sua senha"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--moss)] px-6 py-3.5 font-medium text-white transition hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <button
            onClick={() => navigate({ to: "/cadastro" })}
            className="inline-flex mt-4 w-full items-center justify-center rounded-full bg-[var(--sand)] px-6 py-3.5 font-medium text-black transition hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cadastre-se
          </button>
      </section>
    </main>
    </SiteShell>
  );
}
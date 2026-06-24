import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const isMadrinha = auth.user?.roles?.includes("Madrinha") ?? false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--moss)] text-white flex items-center justify-center">
              <Heart size={16} className="fill-white" />
            </div>
            <span className="font-serif text-xl">Porto Segura</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm flex-wrap justify-end">
            {auth.isAuthenticated ? (
              <>
                {!isMadrinha && (
                  <Link
                    to="/carteira"
                    activeProps={{ className: "bg-[var(--moss)] text-white" }}
                    className="px-3 py-1.5 rounded-full bg-[var(--moss)]/10 text-[var(--moss)] font-semibold text-xs border border-[var(--moss)]/20 hover:bg-[var(--moss)]/20 transition cursor-pointer mr-1"
                  >
                    Saldo: {auth.user?.saldoCreditos ?? 0} {auth.user?.saldoCreditos === 1 ? "crédito" : "créditos"}
                  </Link>
                )}
                {isMadrinha && (
                  <Link
                    to="/areamadrinha"
                    activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                    className="px-3 py-2 rounded-full hover:bg-muted"
                  >
                    Área Madrinha
                  </Link>
                )}
                
                {!isMadrinha && (
                  <Link
                    to="/minha-viagem"
                    activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                    className="px-3 py-2 rounded-full hover:bg-muted"
                  >
                    Minha viagem
                  </Link>
                )}
                {!isMadrinha && (
                  <Link
                    to="/busca"
                    activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                    className="px-3 py-2 rounded-full hover:bg-muted"
                  >
                    Destinos
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    auth.logout();
                    navigate({ to: "/" });
                  }}
                  className="px-3 py-2 rounded-full hover:bg-muted cursor-pointer"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/jornada-madrinha"
                  activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                  className="px-3 py-2 rounded-full hover:bg-muted"
                >
                  Seja Madrinha
                </Link>

                <Link
                  to="/login"
                  activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                  className="px-3 py-2 rounded-full hover:bg-muted"
                >
                  Entrar
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t py-10 px-6 text-center text-sm text-muted-foreground">
        <p className="font-serif text-base text-foreground mb-1">Porto Segura</p>
        <p>Mulheres acolhendo mulheres pelo Brasil afora.</p>
      </footer>
    </div>
  );
}

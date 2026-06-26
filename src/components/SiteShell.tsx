import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Menu } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const isMadrinha = auth.user?.roles?.includes("Madrinha") ?? false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[var(--moss)] text-white flex items-center justify-center">
              <Heart size={16} className="fill-white" />
            </div>
            <span className="font-serif text-xl">Porto Segura</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-sm justify-end">
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

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-3">
            <div id="mobile-chat-portal" />
            {auth.isAuthenticated && !isMadrinha && (
              <Link
                to="/carteira"
                activeProps={{ className: "bg-[var(--moss)] text-white" }}
                className="px-2.5 py-1 rounded-full bg-[var(--moss)]/10 text-[var(--moss)] font-semibold text-[10px] border border-[var(--moss)]/20 hover:bg-[var(--moss)]/20 transition cursor-pointer"
              >
                Saldo: {auth.user?.saldoCreditos ?? 0} {auth.user?.saldoCreditos === 1 ? "crédito" : "créditos"}
              </Link>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="p-2 -mr-2 text-foreground hover:bg-muted rounded-xl transition cursor-pointer flex items-center justify-center"
                  aria-label="Menu de navegação"
                >
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-6 flex flex-col gap-6">
                <div className="flex items-center gap-2 border-b pb-4 mt-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--moss)] text-white flex items-center justify-center">
                    <Heart size={16} className="fill-white" />
                  </div>
                  <span className="font-serif text-lg">Porto Segura</span>
                </div>

                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                <SheetDescription className="sr-only">Acesse as seções do Porto Segura</SheetDescription>

                <nav className="flex flex-col gap-1">
                  {auth.isAuthenticated ? (
                    <>
                      {isMadrinha && (
                        <SheetClose asChild>
                          <Link
                            to="/areamadrinha"
                            activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                            className="px-4 py-3 rounded-xl hover:bg-muted text-sm transition"
                          >
                            Área Madrinha
                          </Link>
                        </SheetClose>
                      )}
                      
                      {!isMadrinha && (
                        <SheetClose asChild>
                          <Link
                            to="/minha-viagem"
                            activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                            className="px-4 py-3 rounded-xl hover:bg-muted text-sm transition"
                          >
                            Minha viagem
                          </Link>
                        </SheetClose>
                      )}
                      {!isMadrinha && (
                        <SheetClose asChild>
                          <button
                            onClick={() => {
                              navigate({ to: "/minha-viagem" }).then(() => {
                                setTimeout(() => {
                                  const btn = document.getElementById("mobile-chat-portal")?.firstChild as HTMLButtonElement;
                                  if (btn) btn.click();
                                }, 50);
                              });
                            }}
                            className="px-4 py-3 rounded-xl hover:bg-muted text-sm transition text-left cursor-pointer"
                          >
                            Minhas Conversas
                          </button>
                        </SheetClose>
                      )}
                      {!isMadrinha && (
                        <SheetClose asChild>
                          <Link
                            to="/busca"
                            activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                            className="px-4 py-3 rounded-xl hover:bg-muted text-sm transition"
                          >
                            Destinos
                          </Link>
                        </SheetClose>
                      )}

                      <div className="border-t pt-2 mt-2">
                        <SheetClose asChild>
                          <button
                            type="button"
                            onClick={() => {
                              auth.logout();
                              navigate({ to: "/" });
                            }}
                            className="w-full text-left px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 text-sm transition cursor-pointer font-medium"
                          >
                            Sair
                          </button>
                        </SheetClose>
                      </div>
                    </>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Link
                          to="/jornada-madrinha"
                          activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                          className="px-4 py-3 rounded-xl hover:bg-muted text-sm transition"
                        >
                          Seja Madrinha
                        </Link>
                      </SheetClose>

                      <SheetClose asChild>
                        <Link
                          to="/login"
                          activeProps={{ className: "bg-[var(--moss)]/10 text-[var(--moss)] font-semibold" }}
                          className="px-4 py-3 rounded-xl hover:bg-muted text-sm transition"
                        >
                          Entrar
                        </Link>
                      </SheetClose>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
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

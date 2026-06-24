import { useEffect, useState } from "react";
import { ArrowRight, Check, MapPin, Shield, Sparkles, Star, Users, Calendar, AlertCircle } from "lucide-react";
import { useNavigate, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/context/auth-context";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";

export function Madrinhas() {
  const auth = useRequireAuth();
  const navigate = useNavigate();

  const [destino, setDestino] = useState("Recife");
  const [dataInicio, setDataInicio] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split("T")[0];
  });

  const [loading, setLoading] = useState(false);
  const [loadingMadrinhas, setLoadingMadrinhas] = useState(false);
  const [error, setError] = useState("");
  const [madrinhasTime, setMadrinhasTime] = useState<any[]>([]);
  const [successRegistered, setSuccessRegistered] = useState(false);

  const fetchMadrinhasTime = async (cidadeDestino: string) => {
    setLoadingMadrinhas(true);
    try {
      const res = await api.get(`/madrinha?destino=${cidadeDestino}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setMadrinhasTime(res.data);
    } catch (err) {
      console.error("Erro ao carregar time local:", err);
    } finally {
      setLoadingMadrinhas(false);
    }
  };

  useEffect(() => {
    if (auth.token && destino) {
      const cidade = destino.split(",")[0].trim();
      void fetchMadrinhasTime(cidade);
    }
  }, [auth.token, destino]);

  const handleCadastrarViagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) return;

    setLoading(true);
    setError("");

    try {
      await api.post("solicitacoes/cadastrar-viagem", {
        destino: destino.trim() || "Recife",
        dataInicio: dataInicio ? new Date(dataInicio).toISOString() : null,
        dataFim: dataFim ? new Date(dataFim).toISOString() : null
      }, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      setSuccessRegistered(true);

    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!auth.ready || !auth.isAuthenticated) {
    return null;
  }

  const isRecife = destino.trim().toLowerCase() === "recife";

  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <Badge tone="terracotta">
            <Sparkles size={14} /> Jornada de Autonomia Assistida
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-medium mt-3 mb-4 leading-tight">
            Cadastre seu Destino
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
            Informe para onde você vai e as datas da sua viagem. Você terá acesso aos perfis detalhados e ao suporte da nossa equipe local de especialistas.
          </p>

          <form onSubmit={handleCadastrarViagem} className="bg-card border rounded-3xl p-6 shadow-md max-w-2xl mx-auto space-y-4">
            <div className="grid sm:grid-cols-3 gap-4 text-left">
              <div>
                <label className="block text-[10px] text-muted-foreground font-semibold uppercase mb-1">Destino</label>
                <div className="relative">
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full bg-secondary/50 border border-transparent rounded-xl pl-9 pr-3 py-3 text-xs focus:outline-none focus:border-[var(--moss)] transition appearance-none cursor-pointer font-medium"
                  >
                    <option value="Recife">Recife, PE</option>
                  </select>
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" size={14} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground font-semibold uppercase mb-1">Data de Ida</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-secondary/50 border border-transparent rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[var(--moss)] transition font-medium"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" size={14} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground font-semibold uppercase mb-1">Data de Volta</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full bg-secondary/50 border border-transparent rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[var(--moss)] transition font-medium"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" size={14} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isRecife}
              className="w-full bg-[var(--moss)] text-white hover:opacity-90 py-3.5 rounded-xl font-medium transition cursor-pointer text-sm shadow-xs flex items-center justify-center gap-2"
            >
              {loading ? "Cadastrando..." : "Confirmar e Cadastrar Viagem (Gratuito)"} <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm max-w-xl mx-auto flex items-start gap-2">
            <AlertCircle className="shrink-0 text-red-600 mt-0.5" size={16} />
            <span>{error}</span>
          </div>
        )}

        {isRecife ? (
          <div className="space-y-8 max-w-5xl mx-auto">
            
            {/* Madrinha Team Curadoria */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif font-semibold">Equipe Regional: Recife, PE</h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Conheça as Madrinhas qualificadas ativas na região de Recife prontas para lhe prestar assistência.
              </p>
            </div>

            {loadingMadrinhas ? (
              <div className="flex items-center justify-center py-10 gap-2 text-sm text-muted-foreground">
                <RefreshCw className="animate-spin" size={18} /> Carregando equipe local...
              </div>
            ) : madrinhasTime.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">Nenhuma Madrinha cadastrada para esta região.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {madrinhasTime.map((m) => (
                  <Link
                    key={m.id}
                    to="/madrinha/$id"
                    params={{
                      id: m.id.toString()
                    }}
                    search={{
                      ida: dataInicio,
                      volta: dataFim
                    }}
                    className="bg-card border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 cursor-pointer text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-16 h-16 rounded-full border-2 border-[var(--moss)] bg-cover bg-center shrink-0 group-hover:scale-105 transition"
                        style={{ backgroundImage: `url(${m.fotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'})` }}
                      />
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm text-foreground group-hover:text-[var(--moss)] transition">{m.nome}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Star className="fill-amber-400 text-amber-400" size={11} />
                          <span>{m.mediaAvaliacao.toFixed(1)}</span>
                          <span>•</span>
                          <span>{m.qtdSolicitacoes} atendimentos</span>
                        </div>
                        <span className="inline-flex bg-[var(--moss)]/10 text-[var(--moss)] text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Recife, PE
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                      {m.bio || "Especialista experiente pronta para prestar acompanhamento, suporte de voz e dicas personalizadas na região de Recife."}
                    </p>

                    <div className="border-t pt-3 flex flex-wrap gap-1.5">
                      {m.servicos && m.servicos.map((s: string) => (
                        <span key={s} className="bg-secondary px-2.5 py-0.5 rounded-full text-[9px] font-medium text-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Certificacoes de Confiança */}
            <div className="bg-gradient-to-br from-[var(--sand)]/40 to-transparent border rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <h3 className="font-serif font-semibold text-lg flex items-center justify-center sm:justify-start gap-2">
                  <Shield size={18} className="text-[var(--moss)]" /> Nossa Garantia de Segurança
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Todas as especialistas passam por checagem documental rigorosa e Liveness Check (Biometria Facial). Monitoramos SLAs e as conexões do time local em tempo real.
                </p>
              </div>
              <div className="flex gap-4 text-xs font-semibold text-foreground/80 shrink-0">
                <span className="inline-flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-full shadow-xs">
                  ✓ Liveness Check
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-full shadow-xs">
                  ✓ SLA de 15m
                </span>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-16 bg-muted/30 border border-dashed rounded-3xl max-w-xl mx-auto">
            <MapPin className="mx-auto text-muted-foreground mb-4" size={40} />
            <h3 className="text-lg font-semibold mb-2">Destino em planejamento</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              No momento, nosso MVP e curadoria de Times Locais estão ativos em <strong>Recife</strong>. Selecione "Recife, PE" no dropdown acima para prosseguir!
            </p>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {successRegistered && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl space-y-6 text-center animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[var(--moss)]/10 text-[var(--moss)] flex items-center justify-center mx-auto">
              <Shield size={32} className="stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-serif">Viagem Cadastrada!</h3>
              <p className="text-muted-foreground text-sm">
                Sua viagem foi registrada no sistema. Agora você tem acesso completo ao painel da viagem.
              </p>
            </div>

            <div className="bg-secondary/40 border p-5 rounded-3xl space-y-3">
              <div className="flex -space-x-2 items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-white bg-cover bg-center" style={{ backgroundImage: "url('https://randomuser.me/api/portraits/women/44.jpg')" }} />
                <div className="w-12 h-12 rounded-full border-2 border-white bg-cover bg-center" style={{ backgroundImage: "url('https://randomuser.me/api/portraits/women/68.jpg')" }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--moss)] font-semibold">Time Recife Ativo</p>
                <p className="text-xs text-muted-foreground">Especialistas qualificadas prontas para lhe atender sob demanda.</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Você poderá adquirir créditos na sua carteira e contratar serviços (como dicas ou ligações) a qualquer momento durante a sua viagem.
            </div>

            <button
              onClick={() => navigate({ to: "/minha-viagem" })}
              className="w-full bg-[var(--moss)] text-white py-4 rounded-2xl font-medium hover:opacity-90 transition cursor-pointer text-sm shadow-xs"
            >
              Acessar Painel de Viagem
            </button>
          </div>
        </div>
      )}
    </SiteShell>
  );
}

function Badge({
  children,
  tone = "moss",
}: {
  children: React.ReactNode;
  tone?: "moss" | "terracotta" | "sand";
}) {
  const styles = {
    moss: "bg-[var(--moss)]/10 text-[var(--moss)] border-[var(--moss)]/20",
    terracotta: "bg-[var(--terracotta)]/10 text-[var(--terracotta)] border-[var(--terracotta)]/20",
    sand: "bg-[var(--sand)] text-foreground border-transparent",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

function RefreshCw({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 16}
      height={size || 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M16 3h5v5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 21H3v-5" />
    </svg>
  );
}
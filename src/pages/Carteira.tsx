import { useEffect, useState, useCallback } from "react";
import { ArrowRight, Check, Shield, Sparkles, RefreshCw, Calendar, ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/context/auth-context";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";

type Pacote = {
  nome: string;
  creditos: number;
  valor: string;
  valorOriginal: string;
  economia: string;
  percentualDesconto: number;
  descricao: string;
  popular: boolean;
  beneficios: string[];
};

type Transacao = {
  id: number;
  quantidade: number;
  tipo: string;
  descricao: string;
  precoPago?: number;
  dataCriacao: string;
};

export function Carteira() {
  const auth = useRequireAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [historicoTransacoes, setHistoricoTransacoes] = useState<Transacao[]>([]);

  // Estado para créditos avulsos
  const [qtdAvulsa, setQtdAvulsa] = useState(5);

  const pacotes: Pacote[] = [
    {
      nome: "Exploradora",
      creditos: 20,
      valor: "R$ 130,00",
      valorOriginal: "R$ 140,00",
      economia: "R$ 10,00",
      percentualDesconto: 7,
      descricao: "Ideal para viagens curtas e dúvidas pontuais.",
      popular: false,
      beneficios: ["20 créditos de consumo para contratação de serviços"]
    },
    {
      nome: "Segurança Total",
      creditos: 40,
      valor: "R$ 250,00",
      valorOriginal: "R$ 280,00",
      economia: "R$ 30,00",
      percentualDesconto: 11,
      descricao: "O equilíbrio perfeito para quem busca suporte e acompanhamento.",
      popular: true,
      beneficios: ["40 créditos de consumo para contratação de serviços"]
    },
    {
      nome: "Imersão Recife",
      creditos: 70,
      valor: "R$ 400,00",
      valorOriginal: "R$ 490,00",
      economia: "R$ 90,00",
      percentualDesconto: 18,
      descricao: "Máxima economia para viagens longas ou grupos.",
      popular: false,
      beneficios: ["70 créditos de consumo para contratação de serviços"]
    }
  ];

  const fetchHistory = useCallback(async () => {
    if (!auth.token) return;
    setLoadingHistory(true);
    try {
      const resProfile = await api.get<{ saldoCreditos: number }>("/Usuaria", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (auth.user && auth.user.saldoCreditos !== resProfile.data.saldoCreditos) {
        auth.updateUser({
          ...auth.user,
          saldoCreditos: resProfile.data.saldoCreditos
        });
      }

      const resHist = await api.get<Transacao[]>("/carteira/historico", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setHistoricoTransacoes(resHist.data);
    } catch (err) {
      console.error("Erro ao obter histórico de transações:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [auth.token]);

  useEffect(() => {
    void fetchHistory();
  }, [auth.token, fetchHistory]);

  const handleComprarPacote = async (pacoteNome: string) => {
    if (!auth.token) return;

    setLoading(true);
    setError("");
    setFeedbackMessage("");
    
    try {
      const response = await api.post<{
        mensagem: string;
        destino?: string;
        saldo: number;
      }>("carteira/comprar-pacote", {
        pacoteNome,
        destino: null,
        dataInicio: null,
        dataFim: null
      }, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (auth.user) {
        auth.updateUser({
          ...auth.user,
          saldoCreditos: response.data.saldo
        });
      }

      setFeedbackMessage(response.data.mensagem);
      void fetchHistory();

    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleComprarCreditosIndividuais = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) return;

    setLoading(true);
    setError("");
    setFeedbackMessage("");

    try {
      const response = await api.post<{
        mensagem: string;
        saldo: number;
      }>("carteira/comprar-creditos-individuais", {
        quantidade: qtdAvulsa
      }, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (auth.user) {
        auth.updateUser({
          ...auth.user,
          saldoCreditos: response.data.saldo
        });
      }

      setFeedbackMessage(response.data.mensagem);
      void fetchHistory();

    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!auth.ready || !auth.isAuthenticated) {
    return null;
  }

  return (
    <SiteShell>
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate({ to: "/minha-viagem" })}
            className="self-start inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <ArrowLeft size={14} /> Voltar para Minha Viagem
          </button>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground mb-2">Finanças & Créditos</p>
              <h1 className="text-3xl sm:text-4xl font-serif">Minha Carteira Porto Segura</h1>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm">
            {error}
          </div>
        )}

        {feedbackMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-sm">
            {feedbackMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Column Left (Wallet Balance & Transaction History) */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[var(--moss)] to-[var(--moss)]/85 text-white rounded-[2rem] p-8 shadow-sm space-y-6">
              <div className="space-y-2">
                <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                  Saldo Disponível
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-serif font-bold">
                    {auth.user?.saldoCreditos ?? 0}
                  </span>
                  <span className="text-sm text-white/85 font-semibold">créditos</span>
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-4 text-xs text-white/70 leading-relaxed">
                Utilize seus créditos para contratar serviços sob demanda com as Madrinhas do seu time regional em Recife.
              </div>
            </div>

            {/* History Section */}
            <div className="bg-card border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-lg font-serif font-semibold">Histórico de Transações</h3>
              
              {loadingHistory ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                  <RefreshCw className="animate-spin" size={14} /> Carregando transações...
                </div>
              ) : historicoTransacoes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">Nenhuma transação registrada nesta carteira.</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {historicoTransacoes.map((t) => (
                    <div key={t.id} className="border-b pb-3 last:border-b-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">{t.descricao}</p>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                          <Calendar size={10} />
                          <span>{new Date(t.dataCriacao).toLocaleDateString("pt-BR")}</span>
                          <span>•</span>
                          <span>{t.tipo}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-bold ${t.quantidade > 0 ? "text-emerald-600" : "text-amber-700"}`}>
                          {t.quantidade > 0 ? `+${t.quantidade}` : t.quantidade} cr
                        </span>
                        {t.precoPago && t.precoPago > 0 ? (
                          <p className="text-[10px] text-muted-foreground">R$ {t.precoPago.toFixed(2)}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Column Right (Purchase Area) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Compra de Créditos Individuais (Avulsos) */}
            <div className="bg-card border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-4">
              <div className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-[var(--moss)]/10 text-[var(--moss)] border-[var(--moss)]/20">
                <Plus size={12} /> Compra Sob Medida
              </div>
              <h3 className="text-xl font-serif font-bold">Compra de Créditos Individuais</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Precisa de apenas alguns créditos extras para completar a contratação de um serviço específico? Adquira créditos individuais sem precisar comprar um pacote inteiro. Cada crédito individual custa **R$ 7,00**.
              </p>

              <form onSubmit={handleComprarCreditosIndividuais} className="bg-secondary/20 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] text-muted-foreground font-semibold uppercase">Quantidade de Créditos</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={qtdAvulsa}
                      onChange={(e) => setQtdAvulsa(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 bg-background border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--moss)] text-center"
                    />
                    <span className="text-xs text-muted-foreground font-medium">créditos avulsos</span>
                  </div>
                </div>

                <div className="text-right sm:text-left space-y-1 sm:mr-auto sm:ml-6">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Preço Total</p>
                  <p className="text-2xl font-bold text-[var(--moss)]">R$ {(qtdAvulsa * 7).toFixed(2)}</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[var(--moss)] text-white hover:opacity-90 px-6 py-3 rounded-xl font-medium transition cursor-pointer text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                >
                  {loading ? "Processando..." : "Adquirir Créditos"} <ArrowRight size={14} />
                </button>
              </form>
            </div>

            {/* Compra de Pacotes */}
            <div className="bg-card border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold">Pacotes de Créditos</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Adquira pacotes com maiores volumes de créditos para aproveitar descontos e simplificar seu planejamento de consumo.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {pacotes.map((pacote) => (
                  <div
                    key={pacote.nome}
                    className={`relative bg-card border rounded-[2rem] p-5 shadow-xs flex flex-col justify-between transition hover:shadow-sm ${
                      pacote.popular ? "ring-2 ring-[var(--moss)]" : ""
                    }`}
                  >
                    {pacote.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--moss)] text-white text-[9px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Recomendado
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold">{pacote.nome}</h4>
                        <p className="text-muted-foreground text-[11px] mt-1 leading-normal line-clamp-2">{pacote.descricao}</p>
                      </div>

                      <div className="py-3 border-y border-dashed space-y-1.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-serif text-[var(--moss)] font-bold">{pacote.creditos}</span>
                          <span className="text-muted-foreground text-[10px] font-medium">créditos</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground line-through font-medium">
                              {pacote.valorOriginal}
                            </span>
                            <span className="text-base font-bold text-foreground">
                              {pacote.valor}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                              {pacote.percentualDesconto}% OFF
                            </span>
                          </div>
                          <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 mt-1 inline-flex items-center gap-1 self-start">
                            <span>Economize {pacote.economia}</span>
                          </div>
                        </div>
                      </div>

                      <ul className="space-y-1 text-[11px] text-foreground/80">
                        {pacote.beneficios.map((b) => (
                          <li key={b} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[var(--moss)]/10 text-[var(--moss)] flex items-center justify-center shrink-0">
                              <Check size={6} />
                            </div>
                            <span className="truncate">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleComprarPacote(pacote.nome)}
                      disabled={loading}
                      className={`w-full mt-5 py-2.5 rounded-xl font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition text-xs ${
                        pacote.popular
                          ? "bg-[var(--moss)] text-white hover:opacity-90"
                          : "bg-secondary text-foreground hover:bg-secondary/80 border"
                      }`}
                    >
                      {loading ? "Processando..." : "Adquirir Pacote"} <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </SiteShell>
  );
}

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, CheckCircle2, MapPin, Search, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { useRequireAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { readErrorMessage } from "@/lib/utils";
import { useCallback } from "react";

type SolicitacaoApi = {
  id: number;
  usuariaId: number;
  madrinhaId: number;
  descricao: string;
  destino?: string | null;
  dataInicio: string;
  dataFim: string;
  qtdDiarias: number;
  valor: number;
  status: string;
  dataCriacao: string;
  madrinha: {
    id: number;
    nome: string;
    telefone?: string | null;
    precoDiaria: number;
    verificadoIdentidade: boolean;
    verificadoResidencia: boolean;
    trilhaCursoCompleto: boolean;
  };
};

const MINHAS_SOLICITACOES_ENDPOINT = "/solicitacoes/minhas-solicitacoes";
const CANCELAR_SOLICITACAO_ENDPOINT = (id: number) => `solicitacoes/${id}/cancelar`;

function formatarData(data: string) {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return data;
  return valor.toLocaleDateString("pt-BR");
}

function normalizarData(data: string) {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return null;
  valor.setHours(0, 0, 0, 0);
  return valor;
}

function hojeSemHorario() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function tituloDoStatus(status: string, dataInicio: string, dataFim: string) {
  const statusNormalizado = status.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const hoje = hojeSemHorario();
  const inicio = normalizarData(dataInicio);
  const fim = normalizarData(dataFim);

  if (statusNormalizado === "aberto" || statusNormalizado === "aberta" || statusNormalizado === "abertar") {
    return "Aguardando madrinha";
  }

  if (statusNormalizado === "aceito" || statusNormalizado === "aceita") {
    if (!inicio || !fim) {
      return "Confirmado pela madrinha";
    }

    if (hoje < inicio) {
      return "Confirmado pela madrinha";
    }

    if (hoje >= inicio && hoje <= fim) {
      return "Em andamento";
    }

    if (hoje > fim) {
      return "Concluída";
    }

    return "Confirmado pela madrinha";
  }

  if (statusNormalizado === "concluida") {
    return "Concluída";
  }

  if (statusNormalizado === "recusada") {
    return "Recusada";
  }

  if (statusNormalizado === "cancelada") {
    return "Cancelada";
  }

  return status;
}

function classeDoStatus(status: string) {
  const valor = status.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  if (valor === "aberto" || valor === "aberta" || valor === "abertar") return "bg-amber-100 text-amber-900 border-amber-200";
  if (valor === "aceito" || valor === "aceita" || valor === "andamento" || valor === "em andamento") return "bg-[var(--moss)]/10 text-[var(--moss)] border-[var(--moss)]/20";
  if (valor === "concluida") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (valor === "recusada" || valor === "cancelada") return "bg-red-100 text-red-900 border-red-200";

  return "bg-muted text-muted-foreground border-border";
}

function formatoStatusChips(status: string) {
  const valor = status.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (valor === "aberto" || valor === "aberta" || valor === "abertar") return 1;
  if (valor === "aceito" || valor === "aceita") return 2;
  if (valor === "andamento" || valor === "em andamento") return 3;
  if (valor === "concluida") return 4;
  return 1;
}

function ehSolicitacaoAtiva(status: string) {
  const valor = status.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return valor === "aberto" || valor === "aberta" || valor === "abertar" || valor === "aceito" || valor === "aceita" || valor === "andamento" || valor === "em andamento";
}

export function MinhaViagem() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const carregarSolicitacoes = useCallback(async () => {
    if (!auth.ready || !auth.token) {
      setSolicitacoes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get<SolicitacaoApi[]>(MINHAS_SOLICITACOES_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setSolicitacoes(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setSolicitacoes([]);
      setError(await readErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [auth.ready, auth.token]);

  useEffect(() => {
    void carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  const solicitacaoAtual = useMemo(() => solicitacoes[0] ?? null, [solicitacoes]);
  const solicitacoesAtivas = useMemo(() => solicitacoes.filter((solicitacao) => ehSolicitacaoAtiva(solicitacao.status)), [solicitacoes]);
  const solicitacoesHistorico = useMemo(
    () => solicitacoes.filter((solicitacao) => !ehSolicitacaoAtiva(solicitacao.status)),
    [solicitacoes],
  );

  const solicitacaoAtiva = useMemo(() => solicitacoesAtivas[0] ?? null, [solicitacoesAtivas]);

  const statusExibicao = useMemo(() => {
    if (!solicitacaoAtiva) return "";
    return tituloDoStatus(solicitacaoAtiva.status, solicitacaoAtiva.dataInicio, solicitacaoAtiva.dataFim);
  }, [solicitacaoAtiva]);

  const etapaAtual = useMemo(() => {
    if (!solicitacaoAtiva) return 0;
    return formatoStatusChips(solicitacaoAtiva.status);
  }, [solicitacaoAtiva]);

  const whatsappUrl = useMemo(() => {
    const telefone = solicitacaoAtiva?.madrinha.telefone?.replace(/\D/g, "") ?? "";

    if (!telefone) {
      return "";
    }

    const numero = telefone.startsWith("55") ? telefone : `55${telefone}`;
    return `https://wa.me/${numero}`;
  }, [solicitacaoAtual]);

  const podeCancelar = Boolean(solicitacaoAtiva && !["cancelada", "recusada", "concluida"].includes(solicitacaoAtiva.status.trim().toLowerCase()));

  const cancelarSolicitacao = async () => {
    if (!solicitacaoAtiva || !auth.token || cancelando) {
      return;
    }

    setCancelando(true);

    try {
      await api.post(
        CANCELAR_SOLICITACAO_ENDPOINT(solicitacaoAtiva.id),
        {},
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        },
      );

      await carregarSolicitacoes();
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setCancelando(false);
    }
  };

  const etapas = [
    { chave: "aberto", label: "Aguardando madrinha" },
    { chave: "aceito", label: "Confirmada" },
    { chave: "andamento", label: "Em andamento" },
    { chave: "concluida", label: "Concluída" },
  ] as const;

  if (!auth.ready || !auth.isAuthenticated) {
    return null;
  }

  return (
    <SiteShell>
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground mb-2">Minha viagem</p>
            <h1 className="text-3xl sm:text-4xl">Acompanhe sua solicitação</h1>
          </div>
          <button
            onClick={() => navigate({ to: "/busca" })}
            className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium hover:bg-muted"
          >
            <Search size={16} /> Agendar madrinha
          </button>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Carregando sua solicitação...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && !solicitacaoAtiva && (
          <div className="bg-card border rounded-3xl p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--sand)]/50 flex items-center justify-center text-[var(--moss)]">
              <MapPin size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl">Não foi localizada uma solicitação</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Você ainda não tem uma viagem agendada. Pesquise uma madrinha e crie sua solicitação para começar o acompanhamento.
              </p>
            </div>
            <button
              onClick={() => navigate({ to: "/busca" })}
              className="inline-flex items-center justify-center gap-2 bg-[var(--moss)] text-white rounded-full px-7 py-4 font-medium hover:opacity-90"
            >
              Ir para busca de madrinhas <ArrowRight size={18} />
            </button>
          </div>
        )}

        {!loading && !error && solicitacaoAtiva && (
          <>
            <div className="bg-[var(--moss)] text-white rounded-3xl p-8 shadow-sm">
              <p className="text-white/80 text-sm uppercase tracking-[0.18em] mb-2">Sua próxima viagem</p>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h2 className="text-3xl sm:text-4xl mb-1">
                    {solicitacaoAtiva.destino}
                  </h2>
                  <p className="text-white/85">Madrinha escolhida: {solicitacaoAtiva.madrinha.nome}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-white/70 text-sm">Valor total</p>
                  <p className="font-serif text-4xl">R$ {solicitacaoAtiva.valor}</p>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-3xl p-7">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                <div>
                  <h2 className="text-xl">Status da viagem</h2>
                  <p className="text-sm text-muted-foreground">{statusExibicao}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <span className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium ${classeDoStatus(solicitacaoAtiva.status)}`}>
                    {statusExibicao}
                  </span>
                  {podeCancelar && (
                    <button
                      onClick={() => void cancelarSolicitacao()}
                      disabled={cancelando}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--terracotta)]/30 px-4 py-2 text-sm font-medium text-[var(--terracotta)] hover:bg-[var(--terracotta)]/10 disabled:opacity-60"
                    >
                      {cancelando ? "Cancelando..." : "Cancelar solicitação"}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {etapas.map((etapa, indice) => {
                  const numeroEtapa = indice + 1;
                  const ativa = numeroEtapa <= etapaAtual;

                  return (
                    <div
                      key={etapa.chave}
                      className={`rounded-2xl border p-4 ${ativa ? "border-[var(--moss)]/20 bg-[var(--moss)]/5" : "border-border bg-background"}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${ativa ? "bg-[var(--moss)] text-white" : "bg-muted text-muted-foreground"}`}>
                          {ativa ? <CheckCircle2 size={16} /> : numeroEtapa}
                        </div>
                        <p className="text-sm font-medium">{etapa.label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {etapa.chave === "aberto" && "Aguardando a madrinha aceitar sua solicitação."}
                        {etapa.chave === "aceito" && "A madrinha confirmou sua viagem."}
                        {etapa.chave === "andamento" && "Sua viagem já está em andamento."}
                        {etapa.chave === "concluida" && "A viagem foi concluída."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {statusExibicao.toLowerCase().includes("confirmado") && whatsappUrl && (
              <div className="bg-card border rounded-3xl p-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-14 h-14">
                    <AvatarFallback>{solicitacaoAtual.madrinha.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{solicitacaoAtual.madrinha.nome}</p>
                    <p className="text-sm text-muted-foreground">Sua madrinha em {solicitacaoAtual.destino ?? solicitacaoAtual.descricao}</p>
                  </div>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-full py-3 font-medium"
                >
                  <MessageCircle size={18} /> Conversar no WhatsApp
                </a>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--sand)]/60 overflow-hidden flex items-center justify-center text-[var(--moss)] font-semibold">
                    {solicitacaoAtiva.madrinha.nome
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((parte) => parte[0]?.toUpperCase())
                      .join("")}
                  </div>
                  <div>
                    <p className="font-semibold">{solicitacaoAtiva.madrinha.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      Madrinha verificada e disponível na sua solicitação
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-2xl bg-muted/40 p-4">
                    <p className="text-muted-foreground mb-1">Ida</p>
                    <p className="font-medium">{formatarData(solicitacaoAtiva.dataInicio)}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-4">
                    <p className="text-muted-foreground mb-1">Volta</p>
                    <p className="font-medium">{formatarData(solicitacaoAtiva.dataFim)}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-4">
                    <p className="text-muted-foreground mb-1">Diárias</p>
                    <p className="font-medium">{solicitacaoAtiva.qtdDiarias}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-4">
                    <p className="text-muted-foreground mb-1">Preço da diária</p>
                    <p className="font-medium">R$ {solicitacaoAtiva.madrinha.precoDiaria}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--sand)]/50 flex items-center justify-center text-[var(--moss)]">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="font-semibold">Resumo da solicitação</p>
                    <p className="text-sm text-muted-foreground">Criada em {formatarData(solicitacaoAtiva.dataCriacao)}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{solicitacaoAtiva.status}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <span className="text-muted-foreground">Valor total</span>
                    <span className="font-medium">R$ {solicitacaoAtiva.valor}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Descrição</span>
                    <span className="font-medium text-right">{solicitacaoAtiva.descricao}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && !error && solicitacoesHistorico.length > 0 && (
          <div className="space-y-6">
            <div className="bg-card border rounded-3xl p-7">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                <div>
                  <h2 className="text-xl">Histórico de solicitações</h2>
                  <p className="text-sm text-muted-foreground">Solicitações concluídas, canceladas ou recusadas</p>
                </div>
              </div>

              <div className="space-y-3">
                {solicitacoesHistorico.map((solicitacao) => (
                  <div key={solicitacao.id} className="border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-semibold">{solicitacao.destino ?? solicitacao.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {solicitacao.madrinha.nome} · {formatarData(solicitacao.dataInicio)} → {formatarData(solicitacao.dataFim)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${classeDoStatus(solicitacao.status)}`}>
                        {tituloDoStatus(solicitacao.status, solicitacao.dataInicio, solicitacao.dataFim)}
                      </span>
                      <span className="text-sm text-muted-foreground">R$ {solicitacao.valor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

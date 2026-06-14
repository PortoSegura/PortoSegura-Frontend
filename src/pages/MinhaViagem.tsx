/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, CheckCircle2, MapPin, Search, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    fotoPerfilUrl?: string | null;
  };
  avaliacao?: {
    id: number;
    nota: number;
    comentario?: string | null;
    dataCriacao: string;
  } | null;
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

  if (statusNormalizado === "avaliada") {
    return "Avaliada";
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
  if (valor === "concluida" || valor === "avaliada") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (valor === "recusada" || valor === "cancelada") return "bg-red-100 text-red-900 border-red-200";

  return "bg-muted text-muted-foreground border-border";
}

function formatoStatusChips(status: string) {
  const valor = status.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (valor === "aberto" || valor === "aberta" || valor === "abertar") return 1;
  if (valor === "aceito" || valor === "aceita") return 2;
  if (valor === "andamento" || valor === "em andamento") return 3;
  if (valor === "concluida" || valor === "avaliada") return 4;
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
  const [concluindo, setConcluindo] = useState(false);

  const [modalAvaliacaoAberto, setModalAvaliacaoAberto] = useState(false);
  const [solicitacaoParaAvaliar, setSolicitacaoParaAvaliar] = useState<SolicitacaoApi | null>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState("");
  const [confirmarConclusaoAberto, setConfirmarConclusaoAberto] = useState(false);

  const [fotoLoading, setFotoLoading] = useState(false);
  const [fotoError, setFotoError] = useState("");

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFotoError("");
    const file = e.target.files?.[0];
    if (!file || !auth.token || !auth.user) return;

    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type.toLowerCase()) && !file.name.toLowerCase().endsWith(".webp") && !file.name.toLowerCase().endsWith(".jpg") && !file.name.toLowerCase().endsWith(".jpeg") && !file.name.toLowerCase().endsWith(".png")) {
      setFotoError("Formato de imagem inválido. Use JPG, JPEG, PNG ou WEBP.");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      setFotoError("O arquivo excede o tamanho máximo permitido (5 MB).");
      return;
    }

    setFotoLoading(true);
    try {
      const uploadReq = await api.post<{ url: string; nomeArquivo: string }>("documentos/solicitar-upload", {
        tipoDocumento: "FotoPerfil",
        tipoMime: file.type || "image/jpeg",
        tamanhoEmBytes: file.size,
      });

      const uploadRes = await fetch(uploadReq.data.url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/jpeg",
          "x-ms-blob-type": "BlockBlob",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Falha ao enviar arquivo para o armazenamento.");
      }

      const response = await api.put<{ fotoPerfilUrl: string | null }>("Usuaria", {
        fotoPerfilUrl: uploadReq.data.nomeArquivo
      }, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (auth.user) {
        auth.updateUser({
          ...auth.user,
          fotoPerfilUrl: response.data.fotoPerfilUrl
        });
      }
    } catch (err) {
      setFotoError(await readErrorMessage(err));
    } finally {
      setFotoLoading(false);
    }
  };

  const handleFotoRemove = async () => {
    if (!auth.token || !auth.user || fotoLoading) return;
    setFotoError("");
    setFotoLoading(true);
    try {
      await api.put("Usuaria", {
        fotoPerfilUrl: null
      }, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      auth.updateUser({
        ...auth.user,
        fotoPerfilUrl: null
      });
    } catch (err) {
      setFotoError(await readErrorMessage(err));
    } finally {
      setFotoLoading(false);
    }
  };

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

  const concluirSolicitacao = async (id: number) => {
    if (!auth.token || concluindo) return;
    setConcluindo(true);
    try {
      await api.post(`/solicitacoes/${id}/concluir`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      const response = await api.get<SolicitacaoApi[]>(MINHAS_SOLICITACOES_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      const updatedList = Array.isArray(response.data) ? response.data : [];
      setSolicitacoes(updatedList);

      const completedSol = updatedList.find(s => s.id === id);
      if (completedSol) {
        setSolicitacaoParaAvaliar(completedSol);
        setModalAvaliacaoAberto(true);
      }
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setConcluindo(false);
    }
  };

  const enviarAvaliacao = async () => {
    if (!solicitacaoParaAvaliar || !auth.token || enviandoAvaliacao) return;
    
    setEnviandoAvaliacao(true);
    setErroAvaliacao("");

    try {
      await api.post("/avaliacao", {
        solicitacaoId: solicitacaoParaAvaliar.id,
        madrinhaId: solicitacaoParaAvaliar.madrinhaId,
        nota,
        comentario: comentario.trim() || null
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      setModalAvaliacaoAberto(false);
      setSolicitacaoParaAvaliar(null);
      setNota(5);
      setComentario("");
      await carregarSolicitacoes();
    } catch (err) {
      setErroAvaliacao(await readErrorMessage(err));
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

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

  const podeConcluirViagem = useMemo(() => {
    if (!solicitacaoAtiva) return false;
    const hoje = hojeSemHorario();
    const fim = normalizarData(solicitacaoAtiva.dataFim);
    return fim ? hoje >= fim : false;
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
                  {solicitacaoAtiva.status.trim().toLowerCase() === "aceita" && podeConcluirViagem && (
                    <button
                      onClick={() => setConfirmarConclusaoAberto(true)}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--moss)] border border-transparent px-4 py-2 text-sm font-medium text-white hover:opacity-90 cursor-pointer"
                    >
                      Concluir viagem
                    </button>
                  )}
                  {podeCancelar && (
                    <button
                      onClick={() => void cancelarSolicitacao()}
                      disabled={cancelando}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--terracotta)]/30 px-4 py-2 text-sm font-medium text-[var(--terracotta)] hover:bg-[var(--terracotta)]/10 disabled:opacity-60 cursor-pointer"
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
                    {solicitacaoAtual.madrinha.fotoPerfilUrl && (
                      <AvatarImage src={solicitacaoAtual.madrinha.fotoPerfilUrl} alt={solicitacaoAtual.madrinha.nome} className="object-cover" />
                    )}
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
                  <div key={solicitacao.id} className="border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold">{solicitacao.destino ?? solicitacao.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {solicitacao.madrinha.nome} · {formatarData(solicitacao.dataInicio)} → {formatarData(solicitacao.dataFim)}
                      </p>
                      {solicitacao.status.trim().toLowerCase() === "avaliada" && solicitacao.avaliacao && (
                        <div className="mt-2 bg-muted/40 border rounded-2xl p-3 text-xs max-w-md space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">Sua avaliação:</span>
                            <span className="text-[var(--gold)]">
                              {"★".repeat(solicitacao.avaliacao.nota)}{"☆".repeat(5 - solicitacao.avaliacao.nota)}
                            </span>
                          </div>
                          {solicitacao.avaliacao.comentario && (
                            <p className="italic text-foreground/80">"{solicitacao.avaliacao.comentario}"</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap sm:self-center">
                      {solicitacao.status.trim().toLowerCase() === "concluida" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSolicitacaoParaAvaliar(solicitacao);
                            setModalAvaliacaoAberto(true);
                          }}
                          className="inline-flex items-center justify-center rounded-full bg-[var(--moss)] text-white px-4 py-2 text-xs font-medium hover:opacity-90 transition cursor-pointer"
                        >
                          Avaliar Madrinha
                        </button>
                      )}
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${classeDoStatus(solicitacao.status)}`}>
                        {tituloDoStatus(solicitacao.status, solicitacao.dataInicio, solicitacao.dataFim)}
                      </span>
                      <span className="text-sm font-medium">R$ {solicitacao.valor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-card border rounded-3xl p-7">
          <h2 className="text-xl mb-4 font-medium flex items-center gap-2">Configurações de perfil</h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[var(--sand)]/60 overflow-hidden flex items-center justify-center text-[var(--moss)] font-semibold text-2xl border shrink-0">
              {auth.user?.fotoPerfilUrl ? (
                <img src={auth.user.fotoPerfilUrl} alt={auth.user.nome} className="w-full h-full object-cover" />
              ) : (
                <span>{auth.user?.nome ? auth.user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("") : "U"}</span>
              )}
            </div>
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="text-sm font-semibold">{auth.user?.nome}</span>
              <span className="text-xs text-muted-foreground">{auth.user?.email}</span>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <label className="cursor-pointer bg-[var(--moss)] text-white hover:bg-[var(--moss)]/90 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm inline-block transition disabled:opacity-60">
                  {fotoLoading ? "Enviando..." : "Alterar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoUpload}
                    disabled={fotoLoading}
                    className="hidden"
                  />
                </label>
                {auth.user?.fotoPerfilUrl && (
                  <button
                    type="button"
                    onClick={handleFotoRemove}
                    disabled={fotoLoading}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-2 border border-red-200 hover:bg-red-50 rounded-xl transition disabled:opacity-60"
                  >
                    Remover foto
                  </button>
                )}
              </div>
              {fotoError && <span className="text-xs text-red-600 mt-1">{fotoError}</span>}
              <span className="text-xs text-muted-foreground mt-1 block">Formatos aceitos: JPG, JPEG, PNG ou WEBP. Máx. 5MB.</span>
            </div>
          </div>
        </div>

      {confirmarConclusaoAberto && solicitacaoAtiva && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-card border w-full max-w-md rounded-[2rem] p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="space-y-2">
              <h3 className="text-2xl font-serif">Concluir Viagem</h3>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja marcar esta viagem como concluída? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmarConclusaoAberto(false)}
                className="flex-1 border rounded-full py-3.5 text-sm font-medium hover:bg-muted transition cursor-pointer"
                disabled={concluindo}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmarConclusaoAberto(false);
                  void concluirSolicitacao(solicitacaoAtiva.id);
                }}
                className="flex-1 bg-[var(--moss)] text-white rounded-full py-3.5 text-sm font-medium hover:opacity-90 transition cursor-pointer disabled:opacity-60"
                disabled={concluindo}
              >
                {concluindo ? "Concluindo..." : "Sim, concluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAvaliacaoAberto && solicitacaoParaAvaliar && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-card border w-full max-w-md rounded-[2rem] p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="space-y-2">
              <h3 className="text-2xl font-serif">Avaliar Madrinha</h3>
              <p className="text-sm text-muted-foreground">
                Como foi sua experiência com a madrinha <strong>{solicitacaoParaAvaliar.madrinha.nome}</strong> na sua viagem para {solicitacaoParaAvaliar.destino ?? solicitacaoParaAvaliar.descricao}?
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block">Sua nota</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNota(num)}
                    className="text-3xl hover:scale-110 transition cursor-pointer font-medium"
                  >
                    {num <= nota ? (
                      <span className="text-[var(--gold)]">★</span>
                    ) : (
                      <span className="text-muted-foreground/30">★</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Comentário / Feedback (opcional)</span>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ex: Ela foi maravilhosa, me acolheu super bem..."
                rows={4}
                className="w-full rounded-2xl border border-black/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-[var(--moss)] focus:ring-2 focus:ring-[var(--moss)]/15 resize-none"
              />
            </label>

            {erroAvaliacao && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
                {erroAvaliacao}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalAvaliacaoAberto(false);
                  setSolicitacaoParaAvaliar(null);
                  setNota(5);
                  setComentario("");
                  setErroAvaliacao("");
                }}
                className="flex-1 border rounded-full py-3.5 text-sm font-medium hover:bg-muted transition cursor-pointer"
                disabled={enviandoAvaliacao}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviarAvaliacao}
                className="flex-1 bg-[var(--moss)] text-white rounded-full py-3.5 text-sm font-medium hover:opacity-90 transition cursor-pointer disabled:opacity-60"
                disabled={enviandoAvaliacao}
              >
                {enviandoAvaliacao ? "Enviando..." : "Enviar avaliação"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </SiteShell>
  );
}

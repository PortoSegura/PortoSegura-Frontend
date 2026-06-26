import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowLeft,
  FileText,
  Inbox,
  Wallet,
  MapPin,
  Calendar,
  X,
  Sparkles,
  Plus,
  MessageCircle,
  Send,
  Clock,
  AlertTriangle,
  Shield,
  RefreshCw,
  Users,
  Phone,
  PhoneCall,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";
import { toast } from "sonner";

// Web Audio API helpers to synthesize telephone tones
const playRingingTone = () => {
  if (typeof window === "undefined") return { stop: () => {} };
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    
    let isPlaying = false;
    let osc1: OscillatorNode | null = null;
    let osc2: OscillatorNode | null = null;
    let gain: GainNode | null = null;
    let timer: any = null;

    const startRing = () => {
      if (isPlaying) return;
      isPlaying = true;
      osc1 = ctx.createOscillator();
      osc2 = ctx.createOscillator();
      gain = ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
    };

    const stopRing = () => {
      if (!isPlaying) return;
      isPlaying = false;
      try {
        if (osc1) osc1.stop();
        if (osc2) osc2.stop();
        if (osc1) osc1.disconnect();
        if (osc2) osc2.disconnect();
        if (gain) gain.disconnect();
      } catch {}
    };

    // 1.5 seconds on, 1.5 seconds off cadence
    const tick = () => {
      startRing();
      setTimeout(() => {
        stopRing();
      }, 1500);
    };

    tick();
    timer = setInterval(tick, 3000);

    return {
      stop: () => {
        clearInterval(timer);
        stopRing();
        try {
          ctx.close();
        } catch {}
      }
    };
  } catch (e) {
    console.error("AudioContext error:", e);
    return { stop: () => {} };
  }
};

const playConnectTone = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.error("AudioContext error:", e);
  }
};

type Secao = "cadastro" | "solicitacoes" | "ganhos" | "conversas";

const nav: Array<{
  k: Secao;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}> = [
  { k: "cadastro", label: "Cadastro", icon: FileText },
  { k: "solicitacoes", label: "Solicitações", icon: Inbox },
  { k: "ganhos", label: "Ganhos", icon: Wallet },
  { k: "conversas", label: "Atendimentos", icon: MessageCircle },
];

const COMISSAO = 0.15;
const PROFILE_MADRINHA_ENDPOINT = "madrinha/profile";
const ADICIONAR_SERVICO_ENDPOINT = "madrinha/add-servico";
const REMOVER_SERVICO_ENDPOINT = "madrinha/remove-servico";
const SOLIICITACOES_MADRINHA_ENDPOINT = "solicitacoes/solicitacoes-madrinha";

type Solic = {
  id: string;
  nome: string;
  cidade: string;
  ida: string;
  volta: string;
  diarias: number;
  preco: number;
  mensagem: string;
  status: "aberto" | "aceita" | "recusada" | "cancelada";
};

type SolicitacaoApi = {
  id: number;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  qtdDiarias: number;
  valor: number;
  status: string;
  dataCriacao: string;
  usuaria: {
    id: number;
    nome: string;
    email: string;
    telefone: string;
    bio: string;
    estado: string;
    cidade: string;
  };
};

type ServicoApi = {
  id: number;
  descricao: string;
};

type MadrinhaProfileApi = {
  id: number;
  precoDiaria: number;
  fotoPerfilUrl?: string | null;
  motivacao: string;
  usuarioId: number;
  nome: string;
  cidade: string;
  estado: string;
  bio: string;
  telefone: string;
  email: string;
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  timeLocalNome?: string;
  ativaFilaAlocacao?: boolean;
  slaMinutos?: number;
  disponivel?: boolean;
  cargaAtendimentosAtivos?: number;
  qtdSolicitacoes: number;
  solicitacaoes: SolicitacaoApi[];
  servicos: ServicoApi[];
};

type Mimo = {
  id: string;
  descricao: string;
};

type UsuarioCadastro = {
  nome: string;
  email: string;
  telefone: string;
  bio: string;
  estado: string;
  cidade: string;
  urlLinkedin?: string | null;
  urlInstagram?: string | null;
  urlFacebook?: string | null;
  fotoPerfilUrl?: string | null;
};

type UsuarioCadastroSource = Partial<UsuarioCadastro> & {
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  FotoPerfilUrl?: string | null;
};

type Ganho = {
  id: string;
  viajante: string;
  periodo: string;
  diarias: number;
  preco: number;
  status: "pago" | "processando";
};

function formatPeriodo(dataInicio: string, dataFim: string) {
  const formatador = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  return `${formatador.format(new Date(dataInicio))} → ${formatador.format(new Date(dataFim))}`;
}

function formatDataApenasDia(data: string) {
  const base = data.includes("T") ? data.split("T")[0] : data;
  const [ano, mes, dia] = base.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function formatarTelefone(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return telefone;
}

function mapSolicitacaoApi(item: SolicitacaoApi): Solic {
  const status = item.status.toLowerCase();

  return {
    id: String(item.id),
    nome: item.usuaria?.nome ?? "Viajante",
    cidade: item.usuaria ? `${item.usuaria.cidade}, ${item.usuaria.estado}` : "—",
    ida: item.dataInicio,
    volta: item.dataFim,
    diarias: item.qtdDiarias,
    preco: item.qtdDiarias > 0 ? item.valor / item.qtdDiarias : item.valor,
    mensagem: item.descricao,
    status:
      status === "aceita" || status === "recusada" || status === "cancelada"
        ? (status as Solic["status"])
        : "aberto",
  };
}

function extrairSolicitacoes(payload: unknown): SolicitacaoApi[] {
  if (Array.isArray(payload)) {
    return payload as SolicitacaoApi[];
  }

  if (payload && typeof payload === "object") {
    const data = payload as { data?: unknown; solicitacoes?: unknown; items?: unknown };

    if (Array.isArray(data.solicitacoes)) {
      return data.solicitacoes as SolicitacaoApi[];
    }

    if (Array.isArray(data.data)) {
      return data.data as SolicitacaoApi[];
    }

    if (Array.isArray(data.items)) {
      return data.items as SolicitacaoApi[];
    }
  }

  return [];
}

function toSolicitacaoActionPath(action: "aceitar" | "recusar" | "cancelar", id: string) {
  return `solicitacoes/${id}/${action}`;
}

function calcularGanhos(solicitacoes: Solic[]) {
  return solicitacoes
    .filter((solicitacao) => solicitacao.status === "aceita")
    .map<Ganho>((solicitacao) => ({
      id: solicitacao.id,
      viajante: solicitacao.nome,
      periodo: formatPeriodo(solicitacao.ida, solicitacao.volta),
      diarias: solicitacao.diarias,
      preco: solicitacao.preco,
      status: new Date(solicitacao.volta) <= new Date() ? "pago" : "processando",
    }));
}

function normalizarUsuarioCadastro(
  usuario: UsuarioCadastroSource | null | undefined,
): UsuarioCadastro | null {
  if (!usuario) {
    return null;
  }

  return {
    nome: usuario.nome ?? "",
    email: usuario.email ?? "",
    telefone: usuario.telefone ?? "",
    bio: usuario.bio ?? "",
    estado: usuario.estado ?? "",
    cidade: usuario.cidade ?? "",
    urlLinkedin: usuario.urlLinkedin ?? usuario.linkedin ?? null,
    urlInstagram: usuario.urlInstagram ?? usuario.instagram ?? null,
    urlFacebook: usuario.urlFacebook ?? usuario.facebook ?? null,
    fotoPerfilUrl: usuario.fotoPerfilUrl ?? usuario.FotoPerfilUrl ?? null,
  };
}

export function AreaMadrinha({ secaoInicial = "cadastro" }: { secaoInicial?: Secao }) {
  const [secao, setSecao] = useState<Secao>(secaoInicial);
  const navigate = useNavigate();
  const auth = useAuth();
  const [profile, setProfile] = useState<MadrinhaProfileApi | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [solicitacoesApi, setSolicitacoesApi] = useState<any[]>([]);
  const [solicitacoesLoading, setSolicitacoesLoading] = useState(true);
  const [solicitacoesError, setSolicitacoesError] = useState("");

  const [sessoesChat, setSessoesChat] = useState<any[]>([]);
  const [sessoesChatLoading, setSessoesChatLoading] = useState(true);
  const [sessoesChatError, setSessoesChatError] = useState("");

  const [chamadaTocando, setChamadaTocando] = useState<any | null>(null);
  const [chamadasRecusadas, setChamadasRecusadas] = useState<number[]>([]);

  // Play ringing sound when a call is incoming (chamadaTocando is active)
  useEffect(() => {
    if (!chamadaTocando) return;
    const ringTone = playRingingTone();
    return () => {
      ringTone.stop();
    };
  }, [chamadaTocando]);

  const isMadrinha = auth.user?.roles?.includes("Madrinha") ?? false;
  
  const lastDemandaIdsRef = useRef<number[]>([]);
  const isFirstLoadRef = useRef<boolean>(true);

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated && !isMadrinha) {
      navigate({ to: "/" });
    }
  }, [auth.isAuthenticated, auth.ready, isMadrinha, navigate]);

  // Polling para novas solicitações
  useEffect(() => {
    if (!auth.token || !isMadrinha) return;

    const verificarNovasSolicitacoes = async () => {
      try {
        const response = await api.get<any[]>("chat/sessoes/demandas-disponiveis", {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        const currentDemandas = response.data || [];
        const currentIds = currentDemandas.map((d: any) => d.id);

        if (!isFirstLoadRef.current) {
          // Detectar novos IDs que não existiam no lastDemandaIdsRef
          const novos = currentDemandas.filter(
            (d: any) => !lastDemandaIdsRef.current.includes(d.id)
          );

          if (novos.length > 0) {
            novos.forEach((d: any) => {
              const ganho = (d.creditosConsumidos || 0) * 7 * 0.85;
              toast.info(`Nova solicitação de ${d.viajanteNome}`, {
                description: `Serviço: ${d.servicoTipo} | Ganho Líquido: R$ ${ganho.toFixed(2)}`,
                action: {
                  label: "Visualizar",
                  onClick: () => {
                    setSecao("solicitacoes");
                  },
                },
                duration: 10000,
              });
            });

            // Atualiza a lista na tela
            setSolicitacoesApi(currentDemandas);
          }
        } else {
          isFirstLoadRef.current = false;
        }

        lastDemandaIdsRef.current = currentIds;
      } catch (err) {
        console.error("Erro no polling de novas solicitações:", err);
      }
    };

    const interval = setInterval(verificarNovasSolicitacoes, 6000);
    return () => clearInterval(interval);
  }, [auth.token, isMadrinha]);

  useEffect(() => {
    if (!auth.token || !profile?.disponivel) {
      setChamadaTocando(null);
      return;
    }

    const verificarChamadas = async () => {
      try {
        const res = await api.get("chat/sessoes/demandas-disponiveis", {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        // Procurar por ligação/suporte pendente não recusada
        const ligacao = res.data.find((d: any) => 
          (d.servicoTipo.toLowerCase().includes("ligação") || d.servicoTipo.toLowerCase().includes("ligacao") || d.servicoTipo.toLowerCase().includes("suporte")) && 
          d.status === "Pendente" && 
          !chamadasRecusadas.includes(d.id || d.Id)
        );
        if (ligacao) {
          setChamadaTocando(ligacao);
        } else {
          setChamadaTocando(null);
        }
      } catch (err) {
        console.error("Erro ao verificar chamadas:", err);
      }
    };

    void verificarChamadas();
    const interval = setInterval(() => {
      void verificarChamadas();
    }, 4000); // verifica a cada 4 segundos

    return () => clearInterval(interval);
  }, [auth.token, profile?.disponivel, chamadasRecusadas]);

  useEffect(() => {
    let ativo = true;

    const carregarProfile = async () => {
      if (!auth.ready || !auth.token) {
        if (ativo) {
          setProfile(null);
          setProfileLoading(false);
        }
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      try {
        const response = await api.get<MadrinhaProfileApi>(PROFILE_MADRINHA_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        if (!ativo) return;

        setProfile(response.data);
      } catch (err) {
        if (!ativo) return;

        setProfile(null);
        setProfileError(await readErrorMessage(err));
      } finally {
        if (ativo) {
          setProfileLoading(false);
        }
      }
    };

    void carregarProfile();

    return () => {
      ativo = false;
    };
  }, [auth.ready, auth.token]);

  const carregarSolicitacoes = useCallback(async () => {
    if (!auth.ready || !auth.token) {
      setSolicitacoesApi([]);
      setSolicitacoesLoading(false);
      return;
    }

    setSolicitacoesLoading(true);
    setSolicitacoesError("");

    try {
      const response = await api.get<any[]>("chat/sessoes/demandas-disponiveis", {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      const data = response.data || [];
      setSolicitacoesApi(data);
      lastDemandaIdsRef.current = data.map((d: any) => d.id);
    } catch (err) {
      setSolicitacoesApi([]);
      setSolicitacoesError(await readErrorMessage(err));
    } finally {
      setSolicitacoesLoading(false);
    }
  }, [auth.ready, auth.token]);

  const carregarSessoesChat = useCallback(async () => {
    if (!auth.token) {
      setSessoesChat([]);
      setSessoesChatLoading(false);
      return;
    }
    setSessoesChatLoading(true);
    setSessoesChatError("");
    try {
      const res = await api.get("/chat/sessoes", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setSessoesChat(res.data);
    } catch (err) {
      console.error(err);
      setSessoesChatError("Erro ao carregar sessões de chat.");
    } finally {
      setSessoesChatLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    void carregarSolicitacoes();
    void carregarSessoesChat();
  }, [carregarSolicitacoes, carregarSessoesChat]);

  const perfilUsuario = normalizarUsuarioCadastro(profile ?? auth.user);
  const mimos =
    profile?.servicos?.map((servico) => ({
      id: String(servico.id),
      descricao: servico.descricao,
    })) ?? [];

  if (!auth.ready || !auth.isAuthenticated || !isMadrinha) return null;

  return (
    <SiteShell>
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* <button
        onClick={() => navigate({ to: "/jornada-madrinha" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Voltar
      </button> */}

      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--terracotta)]/20 bg-[var(--terracotta)]/10 text-[var(--terracotta)] px-3 py-1 text-xs font-medium">
          <Sparkles size={14} /> Área da Madrinha
        </span>
        <h1 className="text-3xl sm:text-4xl mt-3">Olá, {perfilUsuario?.nome ?? "Madrinha"}</h1>
        <p className="text-muted-foreground mt-1">
          {perfilUsuario?.cidade
            ? `${perfilUsuario.cidade}${perfilUsuario.estado ? `, ${perfilUsuario.estado}` : ""}`
            : "Seu perfil salvo"}
          .
        </p>
      </div>

      {/* Painel de Governança e Sustentabilidade */}
      <div className="bg-card border rounded-3xl p-5 mb-8 grid sm:grid-cols-2 md:grid-cols-4 gap-6 shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Time Local</span>
          <p className="text-lg font-semibold">{profile?.timeLocalNome ?? "Time Recife"}</p>
          <p className="text-xs text-muted-foreground">Região Metropolitana</p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Status da Fila de Alocação</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${profile?.ativaFilaAlocacao ? "bg-emerald-500" : "bg-[var(--terracotta)]"}`} />
            <p className="text-sm font-semibold">{profile?.ativaFilaAlocacao ? "Ativa na fila" : "Suspensa por SLA"}</p>
          </div>
          {!profile?.ativaFilaAlocacao && (
            <button
              onClick={async () => {
                if (!auth.token) return;
                await api.put("madrinha/profile/reativar-fila", {}, { headers: { Authorization: `Bearer ${auth.token}` } });
                const res = await api.get<MadrinhaProfileApi>("madrinha/profile", { headers: { Authorization: `Bearer ${auth.token}` } });
                setProfile(res.data);
              }}
              className="text-[10px] text-[var(--moss)] hover:underline font-semibold cursor-pointer"
            >
              Reativar na Fila
            </button>
          )}
        </div>
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Disponibilidade</span>
          <div>
            <button
              onClick={async () => {
                if (!auth.token) return;
                await api.put("madrinha/profile/disponibilidade", {}, { headers: { Authorization: `Bearer ${auth.token}` } });
                const res = await api.get<MadrinhaProfileApi>("madrinha/profile", { headers: { Authorization: `Bearer ${auth.token}` } });
                setProfile(res.data);
              }}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border cursor-pointer transition ${
                profile?.disponivel
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {profile?.disponivel ? "Disponível" : "Indisponível"}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">Alternar pareamentos automáticos</p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Atendimentos Ativos</span>
          <p className="text-sm font-semibold">{profile?.cargaAtendimentosAtivos ?? 0} Ativos</p>
          <p className="text-xs text-muted-foreground">Verifique na aba conversas</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 md:gap-1 p-2 bg-card border rounded-2xl md:sticky md:top-20 self-start scrollbar-none shrink-0">
          {nav.map((n) => {
            const Icon = n.icon;
            const ativo = secao === n.k;
            return (
              <button
                key={n.k}
                onClick={() => setSecao(n.k)}
                className={`whitespace-nowrap flex items-center gap-2 md:gap-3 px-4 py-2.5 md:px-3 md:py-3 rounded-xl text-sm transition ${
                  ativo
                    ? "bg-[var(--moss)] text-white font-medium shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span>{n.label}</span>
                {n.k === "solicitacoes" && solicitacoesApi.length > 0 && (
                  <span
                    className={`font-sans font-bold text-[10px] px-1.5 py-0.5 rounded-full ${
                      ativo ? "bg-white text-[var(--moss)]" : "bg-red-500 text-white"
                    }`}
                  >
                    {solicitacoesApi.length}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        <div>
          {secao === "cadastro" && (
            <Cadastro
              user={perfilUsuario}
              motivacao={profile?.motivacao ?? "—"}
              precoDiaria={profile?.precoDiaria ?? 0}
              solicitacoes={[]}
              mimos={mimos}
              profileLoading={profileLoading}
              profileError={profileError}
              onAdicionarMimo={async (descricao) => {
                if (!auth.token) return;

                await api.post(
                  ADICIONAR_SERVICO_ENDPOINT,
                  { descricao },
                  {
                    headers: {
                      Authorization: `Bearer ${auth.token}`,
                    },
                  },
                );

                const response = await api.get<MadrinhaProfileApi>(PROFILE_MADRINHA_ENDPOINT, {
                  headers: {
                    Authorization: `Bearer ${auth.token}`,
                  },
                });

                setProfile(response.data);
              }}
              onRemoverMimo={async (servicoId) => {
                if (!auth.token) return;

                await api.delete(`${REMOVER_SERVICO_ENDPOINT}/${servicoId}`, {
                  headers: {
                    Authorization: `Bearer ${auth.token}`,
                  },
                });

                const response = await api.get<MadrinhaProfileApi>(PROFILE_MADRINHA_ENDPOINT, {
                  headers: {
                    Authorization: `Bearer ${auth.token}`,
                  },
                });

                setProfile(response.data);
              }}
            />
          )}
          {secao === "solicitacoes" && (
            <Solicitacoes
              demandas={solicitacoesApi}
              loading={solicitacoesLoading}
              error={solicitacoesError || profileError}
              token={auth.token ?? ""}
              onAtualizar={carregarSolicitacoes}
              onAceitarSucesso={() => setSecao("conversas")}
            />
          )}
          {secao === "ganhos" && (
            <Ganhos sessoes={sessoesChat} loading={sessoesChatLoading} error={sessoesChatError || profileError} />
          )}
          {secao === "conversas" && (
            <Conversas token={auth.token ?? ""} />
          )}
        </div>
      </div>
    </div>

    {chamadaTocando && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-card border border-red-500/30 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl space-y-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-3">
            <div className="w-20 h-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto animate-pulse">
              <Phone size={36} className="stroke-[1.5] animate-bounce" />
            </div>
            <h3 className="text-xl font-serif">Chamada de Emergência/Suporte</h3>
            <p className="text-muted-foreground text-sm">
              A viajante iniciou uma ligação por voz de dúvidas ou emergência!
            </p>
          </div>

          <div className="bg-secondary/40 border p-6 rounded-3xl space-y-2">
            <p className="text-xs uppercase tracking-wider text-[var(--moss)] font-semibold">Viajante Chamando</p>
            <p className="text-xl font-bold">{chamadaTocando.viajanteNome}</p>
            <p className="text-xs text-muted-foreground">Destino: Recife, PE</p>
            <div className="border-t pt-3 mt-2">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Seu Ganho Líquido (85%)</p>
              <p className="text-3xl text-emerald-700 font-extrabold tracking-tight mt-0.5">
                R$ {((chamadaTocando.creditosConsumidos || 0) * 7 * 0.85).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setChamadasRecusadas(prev => [...prev, chamadaTocando.id || chamadaTocando.Id]);
                setChamadaTocando(null);
              }}
              className="flex-1 bg-secondary hover:bg-muted text-foreground py-3.5 rounded-2xl font-medium transition cursor-pointer"
            >
              Recusar
            </button>
            <button
              onClick={async () => {
                try {
                  await api.post(`/chat/sessoes/${chamadaTocando.id || chamadaTocando.Id}/aceitar`, {}, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                  });
                  setChamadaTocando(null);
                  setSecao("conversas");
                } catch (err: any) {
                  const msg = err.response?.data?.mensagem || "Esta chamada já foi atendida por outra madrinha.";
                  alert(msg);
                  setChamadasRecusadas(prev => [...prev, chamadaTocando.id || chamadaTocando.Id]);
                  setChamadaTocando(null);
                }
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PhoneCall size={18} /> Atender
            </button>
          </div>
        </div>
      </div>
    )}
    </SiteShell>
  );
}

function Cadastro({
  user,
  motivacao,
  precoDiaria,
  solicitacoes,
  mimos,
  profileLoading,
  profileError,
  onAdicionarMimo,
  onRemoverMimo,
}: {
  user: UsuarioCadastro | null;
  motivacao: string;
  precoDiaria: number;
  solicitacoes: Solic[];
  mimos: Mimo[];
  profileLoading: boolean;
  profileError: string;
  onAdicionarMimo: (descricao: string) => Promise<void>;
  onRemoverMimo: (servicoId: string) => Promise<void>;
}) {
  const [novo, setNovo] = useState("");
  const [bio, setBio] = useState<string>(user?.bio ?? "");

  const auth = useAuth();
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

  useEffect(() => {
    setBio(user?.bio ?? "");
  }, [user?.bio]);

  const redesSociais = [user?.urlInstagram, user?.urlFacebook, user?.urlLinkedin].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card title="Seus dados" icon={FileText}>
        {profileLoading && (
          <p className="text-sm text-muted-foreground mb-4">Carregando profile da madrinha...</p>
        )}
        {profileError && <p className="text-sm text-red-600 mb-4">{profileError}</p>}
        
        <div className="flex flex-col sm:flex-row items-center gap-5 border-b pb-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-[var(--sand)]/60 overflow-hidden flex items-center justify-center text-[var(--moss)] font-semibold text-2xl border shrink-0">
            {user?.fotoPerfilUrl ? (
              <img src={user.fotoPerfilUrl} alt={user.nome} className="w-full h-full object-cover" />
            ) : (
              <span>{user?.nome ? user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("") : "M"}</span>
            )}
          </div>
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="text-sm font-medium">Foto de Perfil</span>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
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
              {user?.fotoPerfilUrl && (
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
            <span className="text-xs text-muted-foreground mt-1">Formatos aceitos: JPG, JPEG, PNG ou WEBP. Máx. 5MB.</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Linha k="Nome" v={user?.nome ?? "—"} />
          <Linha k="E-mail" v={user?.email ?? "—"} />
          <Linha k="WhatsApp" v={user?.telefone ? formatarTelefone(user.telefone) : "—"} />
          <Linha k="Cidade" v={user ? `${user.cidade}, ${user.estado}` : "—"} />
          <div className="sm:col-span-2">
            <label className="text-muted-foreground text-sm">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre você"
              className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--moss)]"
              rows={4}
            />
          </div>
          <Linha k="Redes sociais" v={redesSociais > 0 ? "Cadastradas" : "Não informadas"} />
          <Linha k="Comissão plataforma" v="15%" />
        </div>
      </Card>

      <Card title="Dados de madrinha" icon={Sparkles}>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="sm:col-span-2">
            <label className="text-muted-foreground text-sm">Motivação</label>
            <textarea
              value={motivacao}
              readOnly
              className="w-full mt-1 border rounded-xl px-3 py-2.5 bg-background text-sm leading-relaxed resize-none"
              rows={4}
            />
          </div>
        </div>
      </Card>

      {/* <Card title="O que você oferece além do suporte" icon={Sparkles}>
        <p className="text-sm text-muted-foreground mb-4">
          Mimos e diferenciais aparecem no seu perfil — é o que te diferencia das outras madrinhas
          além do preço.
        </p>
        <ul className="space-y-2 mb-4">
          {mimos.map((mimo) => (
            <li
              key={mimo.id}
              className="flex items-center justify-between gap-3 bg-[var(--sand)]/40 rounded-xl px-4 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--terracotta)]" /> {mimo.descricao}
              </span>
              <button
                onClick={() => void onRemoverMimo(mimo.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="Ex: Café da tarde mineiro no primeiro dia"
            className="flex-1 border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--moss)]"
          />
          <button
            onClick={async () => {
              const descricao = novo.trim();

              if (!descricao) {
                return;
              }

              await onAdicionarMimo(descricao);
              setNovo("");
            }}
            className="inline-flex items-center gap-1.5 bg-[var(--moss)] text-white rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </Card> */}
    </div>
  );
}

function Solicitacoes({
  demandas,
  loading,
  error,
  token,
  onAtualizar,
  onAceitarSucesso,
}: {
  demandas: any[];
  loading: boolean;
  error: string;
  token: string;
  onAtualizar: () => Promise<void>;
  onAceitarSucesso: () => void;
}) {
  const [demandaSelecionada, setDemandaSelecionada] = useState<any | null>(null);
  const [processando, setProcessando] = useState(false);

  const handleAceitar = async (id: number) => {
    setProcessando(true);
    try {
      await api.post(`/chat/sessoes/${id}/aceitar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemandaSelecionada(null);
      await onAtualizar();
      onAceitarSucesso();
    } catch (err: any) {
      const msg = err.response?.data?.mensagem || "Ocorreu um erro ao aceitar esta solicitação.";
      alert(msg);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title={`Fila de Serviços Pendentes (${demandas.length})`} icon={Inbox}>
        {loading && <p className="text-sm text-muted-foreground">Carregando fila de solicitações...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && demandas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum serviço pendente no momento na região.</p>
        )}
        
        <div className="grid gap-6 sm:grid-cols-2">
          {demandas.map((d) => {
            const ganhoLiquido = (d.creditosConsumidos || 0) * 7 * 0.85;
            return (
              <div
                key={d.id}
                onClick={() => setDemandaSelecionada(d)}
                className="border rounded-3xl p-6 hover:border-[var(--moss)] hover:shadow-lg transition cursor-pointer bg-background flex flex-col justify-between space-y-5"
              >
                <div className="flex flex-col gap-4">
                  {/* Informações básicas do usuário */}
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-full border bg-cover bg-center shrink-0 shadow-sm"
                      style={{ backgroundImage: `url(${d.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'})` }}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-foreground truncate">{d.viajanteNome}</h4>
                        <span className="bg-amber-100/80 text-amber-900 text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-full shrink-0 tracking-wider">
                          {d.servicoTipo}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Origem: {d.viajanteCidade ? `${d.viajanteCidade}, ${d.viajanteEstado}` : "Não informada"}
                      </p>
                    </div>
                  </div>

                  {/* Informações de contato e bio do usuário */}
                  <div className="text-xs border-t pt-3 space-y-1.5 text-foreground/75">
                    {/* <p className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">📧</span> <strong>E-mail:</strong> {d.viajanteEmail || "Não informado"}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="text-sm">📞</span> <strong>Telefone:</strong> {d.viajanteTelefone || "Não informado"}
                    </p> */}
                    {d.viajanteBio && (
                      <p className="mt-2 text-xs italic text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-dashed truncate max-w-full">
                        "{d.viajanteBio}"
                      </p>
                    )}
                  </div>

                  {/* Detalhes do Serviço */}
                  <div className="text-xs space-y-1.5 bg-secondary/35 p-3 rounded-2xl border border-dashed">
                    {/* <p className="flex items-center gap-1.5 text-foreground/80">
                      <span className="shrink-0 text-sm">📍</span> <strong>Destino:</strong> {d.viagemDestino || "Recife, PE"}
                    </p> */}
                    {d.viagemInicio && d.viagemFim && (
                      <p className="flex items-center gap-1.5 text-foreground/80">
                        <span className="shrink-0 text-sm">📅</span> <strong>Período da Viagem:</strong> {new Date(d.viagemInicio).toLocaleDateString("pt-BR")} a {new Date(d.viagemFim).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {d.aeroporto && (
                      <p className="flex items-center gap-1.5 text-foreground/80">
                        <span className="shrink-0 text-sm">✈️</span> <strong>Aeroporto:</strong> {d.aeroporto}
                      </p>
                    )}
                    {d.horarioDesembarque && (
                      <p className="flex items-center gap-1.5 text-foreground/80">
                        <span className="shrink-0 text-sm">⏱️</span> <strong>Desembarque:</strong> {new Date(d.horarioDesembarque).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {d.locaisVisitados && (
                      <p className="flex items-start gap-1.5 text-foreground/80">
                        <span className="shrink-0 text-sm">🗺️</span> <span><strong>Roteiro/Locais:</strong> {d.locaisVisitados}</span>
                      </p>
                    )}
                    {d.quantidadeHoras && (
                      <p className="flex items-center gap-1.5 text-foreground/80">
                        <span className="shrink-0 text-sm">⏱️</span> <strong>Duração Planejada:</strong> {d.quantidadeHoras}h
                      </p>
                    )}
                    {d.acompanhamentoDataInicio && (
                      <p className="flex items-center gap-1.5 text-foreground/80">
                        <span className="shrink-0 text-sm">📅</span> <strong>Atendimento:</strong> {new Date(d.acompanhamentoDataInicio).toLocaleDateString("pt-BR")} ({d.acompanhamentoHoraInicio}) a {new Date(d.acompanhamentoDataFim).toLocaleDateString("pt-BR")} ({d.acompanhamentoHoraFim})
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Ganho Líquido (85%)</p>
                    <p className="text-3xl text-emerald-700 font-extrabold tracking-tight">
                      R$ {ganhoLiquido.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleAceitar(d.id);
                    }}
                    disabled={processando}
                    className="bg-[var(--moss)] hover:bg-[var(--moss)]/90 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-sm transition active:scale-[0.98]"
                  >
                    Aceitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Detail Modal */}
      {demandaSelecionada && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-serif font-bold">Detalhes da Solicitação</h3>
              <button
                onClick={() => setDemandaSelecionada(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Viajante Profile Info */}
            <div className="bg-secondary/20 p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full border bg-cover bg-center shrink-0 shadow-sm"
                  style={{ backgroundImage: `url(${demandaSelecionada.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'})` }}
                />
                <div>
                  <h4 className="font-bold text-foreground">{demandaSelecionada.viajanteNome}</h4>
                  <p className="text-xs text-muted-foreground">
                    Origem: {demandaSelecionada.viajanteCidade ? `${demandaSelecionada.viajanteCidade}, ${demandaSelecionada.viajanteEstado}` : "Não informada"}
                  </p>
                </div>
              </div>

              <div className="text-xs text-foreground/80 space-y-2 border-t pt-3">
                {/* <p>📍 <strong>Destino da Viagem:</strong> {demandaSelecionada.viagemDestino || "Recife, PE"}</p> */}
                {demandaSelecionada.viagemInicio && demandaSelecionada.viagemFim && (
                  <p>📅 <strong>Período da Viagem:</strong> {new Date(demandaSelecionada.viagemInicio).toLocaleDateString("pt-BR")} a {new Date(demandaSelecionada.viagemFim).toLocaleDateString("pt-BR")}</p>
                )}
                {/* <p><strong>Email:</strong> {demandaSelecionada.viajanteEmail}</p>
                <p><strong>Telefone:</strong> {demandaSelecionada.viajanteTelefone || "Não informado"}</p> */}
                {demandaSelecionada.viajanteBio && (
                  <p className="italic bg-background/50 p-2.5 rounded-xl border border-dashed text-muted-foreground">
                    "{demandaSelecionada.viajanteBio}"
                  </p>
                )}
              </div>
            </div>

            {/* Service Details */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between items-center bg-amber-50 border border-amber-100 p-3 rounded-2xl">
                <span className="text-xs font-semibold text-amber-900">Serviço Solicitado</span>
                <span className="bg-amber-100 text-amber-900 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  {demandaSelecionada.servicoTipo}
                </span>
              </div>

              <div className="text-xs space-y-2 px-1">
                {demandaSelecionada.aeroporto && (
                  <p>✈️ <strong>Aeroporto:</strong> {demandaSelecionada.aeroporto}</p>
                )}
                {demandaSelecionada.horarioDesembarque && (
                  <p>⏱️ <strong>Desembarque:</strong> {new Date(demandaSelecionada.horarioDesembarque).toLocaleString("pt-BR")}</p>
                )}
                {demandaSelecionada.locaisVisitados && (
                  <p>📍 <strong>Locais/Roteiro:</strong> {demandaSelecionada.locaisVisitados}</p>
                )}
                {demandaSelecionada.quantidadeHoras && (
                  <p>⏱️ <strong>Duração Planejada:</strong> {demandaSelecionada.quantidadeHoras} horas</p>
                )}
                {demandaSelecionada.acompanhamentoDataInicio && (
                  <p>📅 <strong>Período do Serviço:</strong> {new Date(demandaSelecionada.acompanhamentoDataInicio).toLocaleDateString("pt-BR")} ({demandaSelecionada.acompanhamentoHoraInicio}) até {new Date(demandaSelecionada.acompanhamentoDataFim).toLocaleDateString("pt-BR")} ({demandaSelecionada.acompanhamentoHoraFim})</p>
                )}
              </div>

              <div className="bg-[var(--moss)]/5 border border-[var(--moss)]/10 p-5 rounded-3xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Região do Serviço</p>
                  <p className="text-sm font-semibold text-foreground">Recife, PE</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[var(--moss)] uppercase font-semibold">Seu Ganho Líquido (85%)</p>
                  <p className="text-3xl text-emerald-700 font-extrabold">
                    R$ {((demandaSelecionada.creditosConsumidos || 0) * 7 * 0.85).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDemandaSelecionada(null)}
                className="w-1/2 border py-3.5 rounded-2xl text-xs font-semibold hover:bg-muted cursor-pointer text-center"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void handleAceitar(demandaSelecionada.id)}
                disabled={processando}
                className="w-1/2 bg-[var(--moss)] text-white py-3.5 rounded-2xl text-xs font-semibold hover:opacity-90 cursor-pointer text-center"
              >
                {processando ? "Aceitando..." : "Aceitar Atendimento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Ganhos({
  sessoes,
  loading,
  error,
}: {
  sessoes: any[];
  loading: boolean;
  error: string;
}) {
  const ganhosNormalizados = useMemo(() => {
    return sessoes.map((s) => {
      const bruto = (s.creditosConsumidos || 0) * 7;
      const comissao = bruto * 0.15;
      const liquido = bruto - comissao;
      return {
        id: String(s.id),
        viajante: s.viajanteNome,
        servicoTipo: s.servicoTipo,
        creditos: s.creditosConsumidos || 0,
        bruto,
        comissao,
        liquido,
        status: s.status === "Finalizada" ? "pago" : "processando",
        data: s.dataInicio || s.dataCriacao
      };
    });
  }, [sessoes]);

  const totais = useMemo(() => {
    const bruto = ganhosNormalizados.reduce((acc, g) => acc + g.bruto, 0);
    const comissao = bruto * 0.15;
    const liquido = bruto - comissao;
    const pago = ganhosNormalizados
      .filter((g) => g.status === "pago")
      .reduce((a, g) => a + g.liquido, 0);
    const pendente = ganhosNormalizados
      .filter((g) => g.status === "processando")
      .reduce((a, g) => a + g.liquido, 0);
    return { bruto, comissao, liquido, pago, pendente };
  }, [ganhosNormalizados]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <KPI label="Recebido (líquido)" value={`R$ ${totais.pago.toFixed(2)}`} tone="moss" />
        <KPI label="A receber" value={`R$ ${totais.pendente.toFixed(2)}`} tone="terracotta" />
        <KPI label="Comissão Porto Segura (15%)" value={`- R$ ${totais.comissao.toFixed(2)}`} tone="muted" />
      </div>

      <Card title="Resumo financeiro" icon={Wallet}>
        {loading && (
          <p className="text-sm text-muted-foreground mb-4">Carregando dados...</p>
        )}
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="space-y-1 text-sm">
          <Linha k="Total bruto recebido" v={`R$ ${totais.bruto.toFixed(2)}`} />
          <Linha k="Desconto da plataforma (15%)" v={`- R$ ${totais.comissao.toFixed(2)}`} />
          <Linha k="Total líquido" v={`R$ ${totais.liquido.toFixed(2)}`} />
        </div>
        <div className="mt-4 bg-[var(--sand)]/40 rounded-xl p-3 text-xs text-muted-foreground">
          A Porto Segura repassa semanalmente os ganhos de cada serviço prestado. O desconto da plataforma é de <strong>15%</strong>.
        </div>
      </Card>

      <Card title="Histórico de serviços prestados" icon={Calendar}>
        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground tracking-wider">
                <th className="py-2 px-2">Viajante</th>
                <th className="py-2 px-2">Serviço</th>
                <th className="py-2 px-2">Créditos</th>
                <th className="py-2 px-2 text-right">Bruto</th>
                <th className="py-2 px-2 text-right">Comissão</th>
                <th className="py-2 px-2 text-right">Você recebe</th>
                <th className="py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {ganhosNormalizados.map((g) => {
                return (
                  <tr key={g.id} className="border-t">
                    <td className="py-3 px-2 font-medium">{g.viajante}</td>
                    <td className="py-3 px-2 text-muted-foreground">{g.servicoTipo}</td>
                    <td className="py-3 px-2">{g.creditos} cr</td>
                    <td className="py-3 px-2 text-right">R$ {g.bruto.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      - R$ {g.comissao.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right font-serif text-[var(--terracotta)] font-semibold">
                      R$ {g.liquido.toFixed(2)}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`text-xs rounded-full px-2.5 py-1 ${g.status === "pago" ? "bg-[var(--moss)]/15 text-[var(--moss)]" : "bg-[var(--gold)]/20 text-[var(--gold)]"}`}
                      >
                        {g.status === "pago" ? "Concluído" : "Em andamento"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="bg-card border rounded-3xl p-6 sm:p-7 shadow-sm">
      <h2 className="text-xl mb-5 flex items-center gap-2">
        <Icon size={20} className="text-[var(--moss)]" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

function KPI({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "moss" | "terracotta" | "muted";
}) {
  const map = {
    moss: "bg-[var(--moss)] text-white",
    terracotta: "bg-[var(--terracotta)] text-white",
    muted: "bg-card border text-foreground",
  }[tone];

  return (
    <div className={`${map} rounded-2xl p-5`}>
      <p
        className={`text-xs uppercase tracking-[0.16em] ${tone === "muted" ? "text-muted-foreground" : "text-white/80"}`}
      >
        {label}
      </p>
      <p className="font-serif text-3xl mt-2">{value}</p>
    </div>
  );
}

function Conversas({ token }: { token: string }) {
  const auth = useAuth();
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [demandasDisponiveis, setDemandasDisponiveis] = useState<any[]>([]);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<any | null>(null);
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const mensagensCacheRef = useRef<Record<number, any[]>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSignalTimeRef = useRef<string>(new Date().toISOString());
  const stopWaveformRef = useRef<(() => void) | null>(null);

  const cleanupWebRtc = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    if (stopWaveformRef.current) {
      stopWaveformRef.current();
      stopWaveformRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const startWaveformAnalysis = useCallback((stream: MediaStream) => {
    let animationFrameId: number;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          animationFrameId = requestAnimationFrame(draw);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#10b981";
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        animationFrameId = requestAnimationFrame(draw);
      };

      draw();
    } catch (e) {
      console.error("Waveform drawing error:", e);
    }
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleOfferRecebido = useCallback(async (sdp: string, sessaoId: number) => {
    try {
      cleanupWebRtc();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      streamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = async (event) => {
        if (event.candidate && token) {
          await api.post(`/chat/sessoes/${sessaoId}/webrtc/signal`, {
            type: "candidate",
            candidate: JSON.stringify(event.candidate)
          }, { headers: { Authorization: `Bearer ${token}` } });
        }
      };

      pc.ontrack = (event) => {
        if (!remoteAudioRef.current) {
          const audio = document.createElement("audio");
          audio.autoplay = true;
          remoteAudioRef.current = audio;
          document.body.appendChild(audio);
        }
        remoteAudioRef.current.srcObject = event.streams[0];
      };

      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (token) {
        await api.post(`/chat/sessoes/${sessaoId}/webrtc/signal`, {
          type: "answer",
          sdp: answer.sdp
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      stopWaveformRef.current = startWaveformAnalysis(stream);
    } catch (e) {
      console.error("Erro ao processar offer WebRTC:", e);
    }
  }, [token, cleanupWebRtc, startWaveformAnalysis]);

  const handleCandidateRecebido = useCallback(async (candidateStr: string) => {
    const pc = peerConnectionRef.current;
    if (pc) {
      try {
        const candidateJson = JSON.parse(candidateStr);
        await pc.addIceCandidate(new RTCIceCandidate(candidateJson));
      } catch (e) {
        console.error("Erro ao adicionar ICE candidate:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!sessaoSelecionada || !(sessaoSelecionada.servicoTipo.toLowerCase().includes("liga") || sessaoSelecionada.servicoTipo.toLowerCase().includes("suporte"))) {
      lastStatusRef.current = null;
      cleanupWebRtc();
      return;
    }

    const sessaoId = sessaoSelecionada.id || sessaoSelecionada.Id;
    const status = sessaoSelecionada.status;
    const prevStatus = lastStatusRef.current;
    lastStatusRef.current = status;

    if (status === "Ativa") {
      if (prevStatus && prevStatus !== "Ativa") {
        playConnectTone();
      }

      lastSignalTimeRef.current = new Date(Date.now() - 5000).toISOString();

      const pollSignals = async () => {
        try {
          const res = await api.get(`/chat/sessoes/${sessaoId}/webrtc/signals?sinceUtc=${lastSignalTimeRef.current}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const signals = res.data || [];
          if (signals.length > 0) {
            const maxTimestamp = new Date(Math.max(...signals.map((s: any) => new Date(s.timestamp).getTime())));
            lastSignalTimeRef.current = new Date(maxTimestamp.getTime() + 10).toISOString();
            
            for (const signal of signals) {
              if (signal.senderId === auth.user?.id) continue;
              
              if (signal.type === "offer") {
                await handleOfferRecebido(signal.sdp, sessaoId);
              } else if (signal.type === "candidate") {
                await handleCandidateRecebido(signal.candidate);
              } else if (signal.type === "hangup") {
                cleanupWebRtc();
              }
            }
          }
        } catch (e) {
          console.error("Erro ao obter sinais WebRTC:", e);
        }
      };

      const interval = setInterval(pollSignals, 2000);
      void pollSignals();

      return () => {
        clearInterval(interval);
        cleanupWebRtc();
      };
    } else {
      cleanupWebRtc();
    }
  }, [sessaoSelecionada?.status, sessaoSelecionada?.id, sessaoSelecionada?.Id, token, handleOfferRecebido, handleCandidateRecebido, cleanupWebRtc]);

  const handleSelectSessao = useCallback((sessao: any) => {
    setSessaoSelecionada(sessao);
    const sId = sessao.id || sessao.Id;
    if (mensagensCacheRef.current[sId]) {
      setMensagens(mensagensCacheRef.current[sId]);
    } else {
      setMensagens([]);
    }
  }, []);

  const carregarSessoes = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [resSess, resDem] = await Promise.all([
        api.get("/chat/sessoes", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get("/chat/sessoes/demandas-disponiveis", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSessoes(resSess.data);
      setDemandasDisponiveis(resDem.data);

      if (sessaoSelecionada) {
        const selId = sessaoSelecionada.id || sessaoSelecionada.Id;
        const matchingSess = resSess.data.find((s: any) => (s.id || s.Id) === selId);
        if (matchingSess) {
          setSessaoSelecionada(matchingSess);
        }
      } else if (resSess.data.length > 0 && !sessaoSelecionada) {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          handleSelectSessao(resSess.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [token, sessaoSelecionada, handleSelectSessao]);

  const carregarMensagens = useCallback(async (isSilent = false) => {
    if (!sessaoSelecionada) return;
    const sId = sessaoSelecionada.id || sessaoSelecionada.Id;
    const hasCache = !!mensagensCacheRef.current[sId];

    if (!isSilent && !hasCache) setLoadingMsg(true);
    try {
      const res = await api.get(`/chat/sessoes/${sId}/mensagens`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      mensagensCacheRef.current[sId] = res.data.mensagens;
      setMensagens(res.data.mensagens);

      setSessaoSelecionada((prev: any) => {
        if (!prev) return null;
        const prevId = prev.id || prev.Id;
        if (prevId !== sId) return prev;
        return {
          ...prev,
          status: res.data.sessaoStatus,
          respondida: res.data.respondida
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingMsg(false);
    }
  }, [token, sessaoSelecionada?.id, sessaoSelecionada?.Id]);

  useEffect(() => {
    void carregarSessoes(false);
    const interval = setInterval(() => {
      void carregarSessoes(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (sessaoSelecionada) {
      void carregarMensagens(false);
      const interval = setInterval(() => {
        void carregarMensagens(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sessaoSelecionada?.id, sessaoSelecionada?.Id]);

  const aceitarDemanda = async (demandaId: number) => {
    try {
      await api.post(`/chat/sessoes/${demandaId}/aceitar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Carrega sessões e demandas atualizadas
      const [resSess, resDem] = await Promise.all([
        api.get("/chat/sessoes", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get("/chat/sessoes/demandas-disponiveis", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSessoes(resSess.data);
      setDemandasDisponiveis(resDem.data);

      const novaSessao = resSess.data.find((s: any) => (s.id || s.Id || s.ID) === demandaId);
      if (novaSessao) {
        handleSelectSessao(novaSessao);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao aceitar demanda.");
    }
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentSessId = sessaoSelecionada.id || sessaoSelecionada.Id;
    if (!sessaoSelecionada || !texto.trim() || enviando) return;

    setEnviando(true);
    try {
      await api.post("/chat/sessoes/enviar-mensagem", {
        sessaoId: currentSessId,
        texto: texto.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTexto("");
      await carregarMensagens(false);
      
      const resSess = await api.get("/chat/sessoes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessoes(resSess.data);
    } catch (err) {
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-card border rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
      <h2 className="text-xl flex items-center gap-2">
        <MessageCircle size={20} className="text-[var(--moss)]" /> Central de Atendimento
      </h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando sessões...</p>
      ) : sessoes.length === 0 && demandasDisponiveis.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Nenhum chat ou atendimento acionado no momento. Fila do time local vazia.
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* List of Sessions */}
          <div className={`md:col-span-1 border rounded-2xl p-3 space-y-4 h-[450px] overflow-y-auto bg-card/50 ${sessaoSelecionada ? "hidden md:block" : "block"}`}>
            {/* 1. Demandas do Time
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users size={12} className="text-amber-500" /> Fila do Time Local
                </span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {demandasDisponiveis.length}
                </span>
              </div>
              
              {demandasDisponiveis.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic px-1 py-2">
                  Nenhuma demanda pendente na região.
                </p>
              ) : (
                <div className="space-y-2">
                  {demandasDisponiveis.map((d) => {
                    const currentId = d.id || d.Id;
                    const ganhoLiquido = (d.creditosConsumidos || 0) * 7 * 0.85;
                    return (
                      <div
                        key={currentId}
                        className="p-3.5 rounded-xl border bg-amber-50/20 border-amber-200/50 flex flex-col gap-3 shadow-xs hover:border-amber-300 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full border bg-cover bg-center shrink-0"
                            style={{ backgroundImage: `url(${d.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'})` }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs text-foreground truncate">{d.viajanteNome}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Origem: {d.viajanteCidade ? `${d.viajanteCidade}, ${d.viajanteEstado}` : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="text-[10px] text-muted-foreground leading-tight space-y-1 bg-white/40 p-2 rounded-lg border border-amber-200/20">
                          <p>📍 Destino: <strong>{d.viagemDestino || "Recife, PE"}</strong></p>
                          {d.viagemInicio && d.viagemFim && (
                            <p>📅 Viagem: {new Date(d.viagemInicio).toLocaleDateString("pt-BR")} a {new Date(d.viagemFim).toLocaleDateString("pt-BR")}</p>
                          )}
                          <p className="mt-1 font-semibold text-amber-900">
                            Serviço: <span className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">{d.servicoTipo}</span>
                          </p>
                          {d.aeroporto && (
                            <p>✈️ Aeroporto: <strong>{d.aeroporto}</strong></p>
                          )}
                          {d.quantidadeHoras && (
                            <p>⏱️ Horas: <strong>{d.quantidadeHoras}h</strong></p>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t pt-2 mt-1">
                          <div>
                            <p className="text-[8px] text-muted-foreground uppercase font-semibold">Ganho Líquido</p>
                            <p className="font-bold text-xs text-emerald-700">R$ {ganhoLiquido.toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => void aceitarDemanda(currentId)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition"
                          >
                            Aceitar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <hr className="border-border/60" /> */}

            {/* 2. Meus Atendimentos */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageCircle size={12} className="text-[var(--moss)]" /> Meus Atendimentos
                </span>
                <span className="bg-[var(--moss)]/10 text-[var(--moss)] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {sessoes.length}
                </span>
              </div>

              {sessoes.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic px-1 py-2">
                  Você não possui atendimentos ativos no momento.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessoes.map((s) => {
                    const currentId = s.id || s.Id;
                    const selId = sessaoSelecionada?.id || sessaoSelecionada?.Id;
                    const selected = selId === currentId;
                    const hasAlert = s.status === "Pendente" && !s.respondida;

                    return (
                      <button
                        key={currentId}
                        onClick={() => handleSelectSessao(s)}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                          selected
                            ? "bg-[var(--moss)] text-white border-transparent shadow-md"
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full border bg-cover bg-center shrink-0 shadow-sm"
                          style={{ backgroundImage: `url(${s.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'})` }}
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs truncate max-w-[100px]">{s.viajanteNome}</span>
                            <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                              selected ? "bg-white/20 text-white" : "bg-secondary text-foreground"
                            }`}>
                              {s.status}
                            </span>
                          </div>
                          
                          <p className={`text-[10px] truncate ${selected ? "text-white/80" : "text-muted-foreground"}`}>
                            {s.servicoTipo}
                          </p>

                          {hasAlert && (
                            <span className={`text-[8px] font-bold mt-1 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 animate-pulse ${
                              selected ? "bg-red-500 text-white" : "bg-red-50 text-red-600 border border-red-200"
                            }`}>
                              <AlertTriangle size={8} /> SLA Pendente
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className={`md:col-span-2 border rounded-2xl flex flex-col h-[450px] overflow-hidden bg-secondary/5 ${sessaoSelecionada ? "flex" : "hidden md:flex"}`}>
            {sessaoSelecionada ? (
              <>
                {/* Chat window header */}
                <div className="p-3 border-b bg-card flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSessaoSelecionada(null)}
                      className="md:hidden p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
                      aria-label="Voltar para a lista de atendimentos"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <span className="font-semibold">{sessaoSelecionada.viajanteNome}</span>
                      <span className="text-muted-foreground ml-1">({sessaoSelecionada.servicoTipo})</span>
                    </div>
                  </div>
                  {sessaoSelecionada.status === "Pendente" && !sessaoSelecionada.respondida && (
                    <span className="text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded animate-pulse">
                      Responder Urgente (SLA)
                    </span>
                  )}
                </div>

                {(sessaoSelecionada.pontoEncontro || sessaoSelecionada.duvidaInicial || sessaoSelecionada.aeroporto) && (
                  <div className="px-4 py-2 bg-amber-500/10 border-b text-[10px] text-foreground flex flex-wrap gap-x-4 gap-y-1 shrink-0">
                    {sessaoSelecionada.aeroporto && (
                      <span className="flex items-center gap-1">✈️ <strong>Aeroporto:</strong> {sessaoSelecionada.aeroporto}</span>
                    )}
                    {sessaoSelecionada.pontoEncontro && (
                      <span className="flex items-center gap-1">📍 <strong>Ponto de Encontro:</strong> {sessaoSelecionada.pontoEncontro}</span>
                    )}
                    {sessaoSelecionada.duvidaInicial && (
                      <span className="w-full flex items-start gap-1">❓ <strong>Dúvida Inicial:</strong> {sessaoSelecionada.duvidaInicial}</span>
                    )}
                  </div>
                )}

                {/* Messages body */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2">
                  {sessaoSelecionada.servicoTipo.toLowerCase().includes("liga") || sessaoSelecionada.servicoTipo.toLowerCase().includes("suporte") ? (
                    <div className="p-6 bg-card border rounded-2xl text-center space-y-4 shadow-inner max-w-xs mx-auto my-10">
                      {sessaoSelecionada.status === "Finalizada" ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                            <Phone size={28} className="stroke-[2]" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-500 text-sm">Chamada de Voz Finalizada</p>
                            <p className="text-[10px] text-muted-foreground">Esta ligação foi finalizada.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
                            <PhoneCall size={28} className="stroke-[2] animate-bounce" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-emerald-600 text-sm">Suporte de Voz Ativo!</p>
                            <p className="text-xs">Viajante: <strong>{sessaoSelecionada.viajanteNome}</strong></p>
                            <p className="text-[10px] text-muted-foreground mt-2">Você está conversando por voz diretamente.</p>
                            <canvas
                              ref={canvasRef}
                              width={200}
                              height={60}
                              className="w-full h-[60px] rounded-lg mt-3 bg-secondary/10 border border-secondary/20"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.post(`/chat/sessoes/${sessaoSelecionada.id || sessaoSelecionada.Id}/encerrar`, {}, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                void carregarSessoes(false);
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium transition cursor-pointer text-xs mt-4"
                          >
                            Encerrar Chamada
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    loadingMsg && mensagens.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground">Carregando...</p>
                    ) : (
                      mensagens.map((msg) => {
                        const isSystem = msg.remetenteId === 0;
                        const isTraveler = msg.remetenteId === sessaoSelecionada.usuariaId;
                        const isMeSender = !isSystem && !isTraveler;

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="text-center py-1.5 px-3 rounded-lg bg-secondary text-[10px] text-muted-foreground max-w-[85%] mx-auto">
                              {msg.texto}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[75%] ${isMeSender ? "ml-auto items-end" : "mr-auto items-start"}`}
                          >
                            <span className="text-[9px] text-muted-foreground mb-0.5">
                              {isMeSender ? "Você" : sessaoSelecionada.viajanteNome}
                            </span>
                            <div className={`p-2.5 rounded-2xl text-xs ${
                              isMeSender
                                ? "bg-[var(--moss)] text-white rounded-tr-none"
                                : "bg-card border text-foreground rounded-tl-none"
                            }`}>
                              {msg.texto}
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>

                {/* Input form */}
                {!(sessaoSelecionada.servicoTipo.toLowerCase().includes("liga") || sessaoSelecionada.servicoTipo.toLowerCase().includes("suporte")) && (
                  <form onSubmit={enviarMensagem} className="p-2 border-t bg-card flex gap-2">
                    <input
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder={sessaoSelecionada.status === "Finalizada" ? "Conversa encerrada" : "Digite sua resposta..."}
                      disabled={sessaoSelecionada.status === "Finalizada"}
                      className="flex-1 bg-secondary border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--moss)] disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!texto.trim() || enviando || sessaoSelecionada.status === "Finalizada"}
                      className="bg-[var(--moss)] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                    >
                      Enviar
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs">
                Selecione uma conversa ao lado para responder.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

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
  Home,
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

type Secao = "inicio" | "cadastro" | "ganhos" | "conversas";

const nav: Array<{
  k: Secao;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}> = [
  { k: "inicio", label: "Início", icon: Home },
  { k: "conversas", label: "Atendimentos", icon: MessageCircle },
  { k: "ganhos", label: "Ganhos", icon: Wallet },
  { k: "cadastro", label: "Perfil", icon: Users },
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

export function AreaMadrinha({ secaoInicial = "inicio" }: { secaoInicial?: Secao }) {
  const auth = useAuth();
  const [chatAbertoExternamente, setChatAbertoExternamente] = useState<number | null>(null);
  const [secao, setSecao] = useState<Secao>(secaoInicial);
  const navigate = useNavigate();
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
                    setSecao("inicio");
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
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

      {/* Cabeçalho Limpo e Tabs na mesma linha ou logo abaixo */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--terracotta)]/25 bg-[var(--terracotta)]/10 text-[var(--terracotta)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-sans">
              <Sparkles size={10} /> Área da Madrinha
            </span>
            <h1 className="text-3xl mt-3 font-serif font-bold text-foreground">Olá, {perfilUsuario?.nome ?? "Madrinha"}</h1>
          </div>
          
          <div className="flex flex-row overflow-x-auto pb-1 -mb-[17px] gap-6 scrollbar-none w-full md:w-auto shrink-0">
            {nav.map((n) => {
              const Icon = n.icon;
              const ativo = secao === n.k;
              return (
                <button
                  key={n.k}
                  onClick={() => setSecao(n.k)}
                  className={`whitespace-nowrap flex items-center gap-2 pb-3 border-b-2 text-sm font-semibold transition cursor-pointer select-none ${
                    ativo
                      ? "border-[var(--moss)] text-[var(--moss)]"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{n.label}</span>
                  {n.k === "inicio" && solicitacoesApi.length > 0 && (
                    <span
                      className={`font-sans font-bold text-[10px] px-1.5 py-0.5 rounded-full ${
                        ativo ? "bg-[var(--moss)] text-white" : "bg-red-500 text-white animate-pulse"
                      }`}
                    >
                      {solicitacoesApi.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full min-h-[500px]">
        {secao === "inicio" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Painel de Governança e Sustentabilidade */}
            <div className="bg-card border border-border/60 rounded-3xl p-6 grid grid-cols-2 lg:grid-cols-4 gap-6 shadow-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-sans block">Time Local</span>
                <p className="text-base font-bold text-foreground">{profile?.timeLocalNome ?? "Time Recife"}</p>
                <p className="text-[10px] text-muted-foreground">📍 {perfilUsuario?.cidade ? `${perfilUsuario.cidade}${perfilUsuario.estado ? `, ${perfilUsuario.estado}` : ""}` : "Região Metropolitana"}</p>
              </div>
              <div className="space-y-1.5 border-l border-border/40 pl-6 max-sm:border-l-0 max-sm:pl-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-sans block">Status da Alocação</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${profile?.ativaFilaAlocacao ? "bg-emerald-500 animate-pulse" : "bg-[var(--terracotta)]"}`} />
                  <p className="text-sm font-semibold text-foreground">{profile?.ativaFilaAlocacao ? "Ativa na fila" : "Suspensa por SLA"}</p>
                </div>
                {!profile?.ativaFilaAlocacao && (
                  <button
                    onClick={async () => {
                      if (!auth.token) return;
                      await api.put("madrinha/profile/reativar-fila", {}, { headers: { Authorization: `Bearer ${auth.token}` } });
                      const res = await api.get<MadrinhaProfileApi>("madrinha/profile", { headers: { Authorization: `Bearer ${auth.token}` } });
                      setProfile(res.data);
                    }}
                    className="text-[10px] text-[var(--moss)] hover:text-[var(--moss)]/80 font-bold hover:underline transition cursor-pointer flex items-center gap-1 mt-1"
                  >
                    <RefreshCw size={10} /> Reativar na Fila
                  </button>
                )}
              </div>
              <div className="space-y-1.5 border-l border-border/40 pl-6 max-lg:border-l-0 max-lg:pl-0 max-sm:border-t max-sm:pt-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-sans block">Disponibilidade</span>
                <div>
                  <button
                    onClick={async () => {
                      if (!auth.token) return;
                      await api.put("madrinha/profile/disponibilidade", {}, { headers: { Authorization: `Bearer ${auth.token}` } });
                      const res = await api.get<MadrinhaProfileApi>("madrinha/profile", { headers: { Authorization: `Bearer ${auth.token}` } });
                      setProfile(res.data);
                    }}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border transition cursor-pointer active:scale-95 ${
                      profile?.disponivel
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50"
                        : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${profile?.disponivel ? "bg-emerald-500" : "bg-muted-foreground/60"}`} />
                    {profile?.disponivel ? "Disponível" : "Indisponível"}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Alternar pareamentos automáticos</p>
              </div>
              <div className="space-y-1.5 border-l border-border/40 pl-6 max-sm:border-t max-sm:pt-4 max-sm:border-l-0 max-sm:pl-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-sans block">Atendimentos Ativos</span>
                <p className="text-base font-bold text-foreground">{profile?.cargaAtendimentosAtivos ?? 0} Ativos</p>
                <p className="text-[10px] text-muted-foreground">Verifique na aba de atendimentos</p>
              </div>
            </div>

            <Solicitacoes
              demandas={solicitacoesApi}
              loading={solicitacoesLoading}
              error={solicitacoesError || profileError}
              token={auth.token ?? ""}
              onAtualizar={carregarSolicitacoes}
              onAceitarSucesso={(id) => {
                setChatAbertoExternamente(id);
                setSecao("conversas");
              }}
            />
          </div>
        )}

        {secao === "cadastro" && (
          <div className="animate-in fade-in duration-300">
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
          </div>
        )}

        {secao === "ganhos" && (
          <div className="animate-in fade-in duration-300 space-y-8">
            <Ganhos sessoes={sessoesChat} loading={sessoesChatLoading} error={sessoesChatError || profileError} />
            <HistoricoSolicitacoes sessoes={sessoesChat} loading={sessoesChatLoading} error={sessoesChatError || profileError} />
          </div>
        )}

        {secao === "conversas" && (
          <div className="animate-in fade-in duration-300">
            <Conversas 
              token={auth.token ?? ""}
              chatAbertoExternamente={chatAbertoExternamente}
              onChatAberto={() => setChatAbertoExternamente(null)}
            />
          </div>
        )}
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
    <div className="space-y-8">
      <Card title="Seus dados" icon={FileText}>
        {profileLoading && (
          <p className="text-xs text-muted-foreground animate-pulse mb-4">Carregando profile da madrinha...</p>
        )}
        {profileError && <p className="text-xs text-red-600 mb-4">{profileError}</p>}
        
        <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-border/40 pb-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-secondary/30 overflow-hidden flex items-center justify-center text-[var(--moss)] font-serif font-bold text-2xl border border-[var(--moss)]/20 shrink-0 shadow-inner group transition hover:border-[var(--moss)]/40 relative">
            {user?.fotoPerfilUrl ? (
              <img src={user.fotoPerfilUrl} alt={user.nome} className="w-full h-full object-cover" />
            ) : (
              <span>{user?.nome ? user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("") : "M"}</span>
            )}
          </div>
          <div className="flex flex-col items-center sm:items-start gap-1.5">
            <span className="text-xs font-semibold text-foreground">Foto de Perfil</span>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
              <label className="cursor-pointer bg-[var(--moss)] text-white hover:opacity-90 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs inline-block transition disabled:opacity-60 select-none">
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
                  className="text-xs font-bold text-red-600 hover:text-red-700 px-3.5 py-2.5 border border-red-200 hover:bg-red-50/50 rounded-xl transition disabled:opacity-60 cursor-pointer"
                >
                  Remover foto
                </button>
              )}
            </div>
            {fotoError && <span className="text-xs text-red-600 mt-1">{fotoError}</span>}
            <span className="text-[10px] text-muted-foreground mt-1">Formatos aceitos: JPG, JPEG, PNG ou WEBP. Máx. 5MB.</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 text-sm">
          <Linha k="Nome" v={user?.nome ?? "—"} />
          <Linha k="E-mail" v={user?.email ?? "—"} />
          <Linha k="WhatsApp" v={user?.telefone ? formatarTelefone(user.telefone) : "—"} />
          <Linha k="Cidade" v={user ? `${user.cidade}, ${user.estado}` : "—"} />
          <div className="sm:col-span-2 space-y-1.5 mt-2">
            <label className="text-muted-foreground text-xs font-semibold block">Biografia / Apresentação</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre você..."
              className="w-full border border-border/60 rounded-xl px-4 py-3 bg-background text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--moss)] focus:border-[var(--moss)] transition placeholder:text-muted-foreground/55"
              rows={4}
            />
          </div>
          <Linha k="Redes sociais" v={redesSociais > 0 ? "Cadastradas" : "Não informadas"} />
          <Linha k="Comissão Porto Segura" v="15%" />
        </div>
      </Card>

      <Card title="Dados de madrinha" icon={Sparkles}>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold block">Sua Motivação</label>
            <textarea
              value={motivacao}
              readOnly
              className="w-full border border-border/60 rounded-xl px-4 py-3 bg-secondary/5 text-xs leading-relaxed resize-none text-muted-foreground"
              rows={4}
            />
          </div>
        </div>
      </Card>
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
  onAceitarSucesso: (id: number) => void;
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
      onAceitarSucesso(id);
    } catch (err: any) {
      const msg = err.response?.data?.mensagem || "Ocorreu um erro ao aceitar esta solicitação.";
      alert(msg);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title={`Solicitações (${demandas.length})`} icon={Inbox}>
        {loading && <p className="text-xs text-muted-foreground animate-pulse">Carregando fila de solicitações...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {!loading && !error && demandas.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-8">Nenhum serviço pendente no momento na região.</p>
        )}
        
        <div className="grid gap-6 sm:grid-cols-2">
          {demandas.map((d) => {
            const ganhoLiquido = (d.creditosConsumidos || 0) * 7 * 0.85;
            return (
              <div
                key={d.id}
                onClick={() => setDemandaSelecionada(d)}
                className="border border-border/60 rounded-3xl p-6 hover:border-[var(--moss)]/60 hover:shadow-md transition cursor-pointer bg-background flex flex-col justify-between space-y-5"
              >
                <div className="flex flex-col gap-4">
                  {/* Informações básicas do usuário */}
                  <div className="flex items-start gap-4">
                    <img
                      src={d.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'}
                      alt={d.viajanteNome}
                      className="w-12 h-12 rounded-full border border-border/50 object-cover shrink-0 shadow-xs"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-serif font-bold text-sm text-foreground truncate">{d.viajanteNome}</h4>
                        <span className="bg-amber-50 text-amber-900 border border-amber-200/40 text-[8px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 tracking-wider">
                          {d.servicoTipo}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        📍 Origem: {d.viajanteCidade ? `${d.viajanteCidade}, ${d.viajanteEstado}` : "Não informada"}
                      </p>
                    </div>
                  </div>

                  {/* Informações de contato e bio do usuário */}
                  <div className="text-xs border-t border-border/30 pt-3">
                    {d.viajanteBio && (
                      <p className="text-[11px] italic text-muted-foreground bg-muted/30 p-3 rounded-xl border border-dashed border-border/60 line-clamp-3">
                        "{d.viajanteBio}"
                      </p>
                    )}
                  </div>

                  {/* Detalhes do Serviço */}
                  <div className="text-[11px] space-y-2 bg-secondary/10 p-3 rounded-2xl border border-dashed border-border/50">
                    {d.viagemInicio && d.viagemFim && (
                      <p className="flex items-center gap-2 text-foreground/80">
                        <Calendar size={12} className="text-muted-foreground/75" />
                        <span><strong>Período:</strong> {new Date(d.viagemInicio).toLocaleDateString("pt-BR")} a {new Date(d.viagemFim).toLocaleDateString("pt-BR")}</span>
                      </p>
                    )}
                    {d.aeroporto && (
                      <p className="flex items-center gap-2 text-foreground/80">
                        <span className="text-[12px] text-muted-foreground/75">✈️</span>
                        <span className="truncate"><strong>Aeroporto:</strong> {d.aeroporto}</span>
                      </p>
                    )}
                    {d.horarioDesembarque && (
                      <p className="flex items-center gap-2 text-foreground/80">
                        <Clock size={12} className="text-muted-foreground/75" />
                        <span><strong>Desembarque:</strong> {new Date(d.horarioDesembarque).toLocaleString("pt-BR")}</span>
                      </p>
                    )}
                    {d.locaisVisitados && (
                      <p className="flex items-start gap-2 text-foreground/80">
                        <span className="text-[12px] text-muted-foreground/75">🗺️</span>
                        <span className="line-clamp-2"><strong>Locais/Roteiro:</strong> {d.locaisVisitados}</span>
                      </p>
                    )}
                    {d.quantidadeHoras && (
                      <p className="flex items-center gap-2 text-foreground/80">
                        <Clock size={12} className="text-muted-foreground/75" />
                        <span><strong>Duração Planejada:</strong> {d.quantidadeHoras}h</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/40 pt-4 flex items-center justify-between gap-4 mt-auto">
                  <div>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-bold">Ganho Líquido (85%)</p>
                    <p className="text-2xl text-emerald-700 font-extrabold tracking-tight mt-0.5">
                      R$ {ganhoLiquido.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleAceitar(d.id);
                    }}
                    disabled={processando}
                    className="bg-[var(--moss)] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition active:scale-[0.98] cursor-pointer"
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
          <div className="bg-card border border-border/60 rounded-[2rem] max-w-lg w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-serif font-bold text-foreground">Detalhes da Solicitação</h3>
              <button
                onClick={() => setDemandaSelecionada(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 hover:bg-secondary rounded-full transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Viajante Profile Info */}
            <div className="bg-secondary/15 p-5 rounded-3xl space-y-4 border border-border/40">
              <div className="flex items-center gap-4">
                <img
                  src={demandaSelecionada.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'}
                  alt={demandaSelecionada.viajanteNome}
                  className="w-16 h-16 rounded-full border border-border/50 object-cover shrink-0 shadow-sm"
                />
                <div>
                  <h4 className="font-serif font-bold text-base text-foreground">{demandaSelecionada.viajanteNome}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    📍 Origem: {demandaSelecionada.viajanteCidade ? `${demandaSelecionada.viajanteCidade}, ${demandaSelecionada.viajanteEstado}` : "Não informada"}
                  </p>
                </div>
              </div>

              {demandaSelecionada.viajanteBio && (
                <div className="text-xs text-foreground/80 space-y-2 border-t border-border/30 pt-3">
                  <p className="italic bg-background/80 p-3 rounded-xl border border-dashed border-border/50 text-muted-foreground">
                    "{demandaSelecionada.viajanteBio}"
                  </p>
                </div>
              )}
            </div>

            {/* Service Details */}
            <div className="space-y-4 border-t border-border/40 pt-4">
              <div className="flex justify-between items-center bg-amber-50/50 border border-amber-100 p-3 rounded-2xl">
                <span className="text-xs font-semibold text-amber-900">Serviço Solicitado</span>
                <span className="bg-amber-100 text-amber-900 border border-amber-200/40 text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                  {demandaSelecionada.servicoTipo}
                </span>
              </div>

              <div className="text-xs space-y-2 px-1 text-foreground/80">
                {demandaSelecionada.viagemInicio && demandaSelecionada.viagemFim && (
                  <p className="flex items-center gap-2">📅 <strong>Período da Viagem:</strong> {new Date(demandaSelecionada.viagemInicio).toLocaleDateString("pt-BR")} a {new Date(demandaSelecionada.viagemFim).toLocaleDateString("pt-BR")}</p>
                )}
                {demandaSelecionada.aeroporto && (
                  <p className="flex items-center gap-2">✈️ <strong>Aeroporto:</strong> {demandaSelecionada.aeroporto}</p>
                )}
                {demandaSelecionada.horarioDesembarque && (
                  <p className="flex items-center gap-2">⏱️ <strong>Desembarque:</strong> {new Date(demandaSelecionada.horarioDesembarque).toLocaleString("pt-BR")}</p>
                )}
                {demandaSelecionada.locaisVisitados && (
                  <p className="flex items-start gap-2">📍 <strong>Locais/Roteiro:</strong> {demandaSelecionada.locaisVisitados}</p>
                )}
                {demandaSelecionada.quantidadeHoras && (
                  <p className="flex items-center gap-2">⏱️ <strong>Duração Planejada:</strong> {demandaSelecionada.quantidadeHoras} horas</p>
                )}
                {demandaSelecionada.acompanhamentoDataInicio && (
                  <p className="flex items-center gap-2">📅 <strong>Período do Serviço:</strong> {new Date(demandaSelecionada.acompanhamentoDataInicio).toLocaleDateString("pt-BR")} ({demandaSelecionada.acompanhamentoHoraInicio}) até {new Date(demandaSelecionada.acompanhamentoDataFim).toLocaleDateString("pt-BR")} ({demandaSelecionada.acompanhamentoHoraFim})</p>
                )}
              </div>

              <div className="bg-[var(--moss)]/5 border border-[var(--moss)]/10 p-5 rounded-3xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Destino do Serviço</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">Recife, PE</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-[var(--moss)] uppercase font-semibold">Seu Ganho Líquido (85%)</p>
                  <p className="text-2xl text-emerald-700 font-extrabold mt-0.5">
                    R$ {((demandaSelecionada.creditosConsumidos || 0) * 7 * 0.85).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 border-t border-border/40 pt-4">
              <button
                type="button"
                onClick={() => setDemandaSelecionada(null)}
                className="w-1/2 border border-border/60 py-3 rounded-xl text-xs font-bold hover:bg-muted cursor-pointer text-center transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void handleAceitar(demandaSelecionada.id)}
                disabled={processando}
                className="w-1/2 bg-[var(--moss)] text-white py-3 rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer text-center transition shadow-xs"
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
        status: s.status === "Finalizada" ? "pago" : "processando",
        bruto,
        comissao,
        liquido,
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
      <div className="grid sm:grid-cols-3 gap-5">
        <KPI label="Recebido (líquido)" value={`R$ ${totais.pago.toFixed(2)}`} tone="moss" />
        <KPI label="A receber" value={`R$ ${totais.pendente.toFixed(2)}`} tone="terracotta" />
        <KPI label="Comissão Porto Segura (15%)" value={`- R$ ${totais.comissao.toFixed(2)}`} tone="muted" />
      </div>

      <Card title="Resumo financeiro" icon={Wallet}>
        {loading && (
          <p className="text-xs text-muted-foreground animate-pulse mb-4">Carregando dados...</p>
        )}
        {error && <p className="text-xs text-red-600 mb-4">{error}</p>}
        <div className="space-y-1 text-sm">
          <Linha k="Total bruto recebido" v={`R$ ${totais.bruto.toFixed(2)}`} />
          <Linha k="Desconto da plataforma (15%)" v={`- R$ ${totais.comissao.toFixed(2)}`} />
          <Linha k="Total líquido" v={`R$ ${totais.liquido.toFixed(2)}`} />
        </div>
        <div className="mt-4 bg-secondary/15 border border-border/40 rounded-xl p-3.5 text-xs text-muted-foreground leading-normal">
          A Porto Segura repassa semanalmente os ganhos de cada serviço prestado. O desconto da plataforma é de <strong>15%</strong>.
        </div>
      </Card>
    </div>
  );
}

function HistoricoSolicitacoes({
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
        viajanteFotoPerfilUrl: s.viajanteFotoPerfilUrl,
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

  return (
    <div className="space-y-6">
      <Card title="Histórico de serviços prestados" icon={Calendar}>
        {loading && (
          <p className="text-xs text-muted-foreground animate-pulse mb-4">Carregando histórico...</p>
        )}
        {error && <p className="text-xs text-red-600 mb-4">{error}</p>}
        
        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4">
          {ganhosNormalizados.map((g) => (
            <div key={g.id} className="border border-border/50 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={g.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'}
                    alt={g.viajante}
                    className="w-10 h-10 rounded-full border border-border/50 object-cover"
                  />
                  <div>
                    <p className="font-semibold text-sm">{g.viajante}</p>
                    <p className="text-[10px] text-muted-foreground">{g.servicoTipo}</p>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold rounded-full px-2.5 py-1 border uppercase tracking-wider ${
                    g.status === "pago" 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {g.status === "pago" ? "Concluído" : "Pendente"}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Créditos</span>
                  <span className="font-medium">{g.creditos} cr</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Você recebe</span>
                  <span className="font-serif text-[var(--terracotta)] font-bold text-sm">R$ {g.liquido.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
          {ganhosNormalizados.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum serviço prestado ainda.</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto scrollbar-none -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="text-left text-[10px] uppercase text-muted-foreground tracking-wider border-b border-border/40 pb-2">
                <th className="py-3 px-2 font-semibold">Viajante</th>
                <th className="py-3 px-2 font-semibold">Serviço</th>
                <th className="py-3 px-2 font-semibold">Créditos</th>
                <th className="py-3 px-2 font-semibold text-right">Bruto</th>
                <th className="py-3 px-2 font-semibold text-right">Comissão</th>
                <th className="py-3 px-2 font-semibold text-right">Você recebe</th>
                <th className="py-3 px-2 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {ganhosNormalizados.map((g) => (
                <tr key={g.id} className="hover:bg-muted/30 transition">
                  <td className="py-4 px-2 font-semibold flex items-center gap-2">
                    <img
                      src={g.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'}
                      alt={g.viajante}
                      className="w-7 h-7 rounded-full border border-border/50 object-cover"
                    />
                    <span className="truncate">{g.viajante}</span>
                  </td>
                  <td className="py-4 px-2 text-muted-foreground">{g.servicoTipo}</td>
                  <td className="py-4 px-2 font-medium">{g.creditos} cr</td>
                  <td className="py-4 px-2 text-right text-muted-foreground">R$ {g.bruto.toFixed(2)}</td>
                  <td className="py-4 px-2 text-right text-muted-foreground">
                    - R$ {g.comissao.toFixed(2)}
                  </td>
                  <td className="py-4 px-2 text-right font-serif text-[var(--terracotta)] font-bold text-sm">
                    R$ {g.liquido.toFixed(2)}
                  </td>
                  <td className="py-4 px-2 text-center">
                    <span
                      className={`text-[9px] font-bold rounded-full px-2.5 py-1 border uppercase tracking-wider ${
                        g.status === "pago" 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {g.status === "pago" ? "Concluído" : "Pendente"}
                    </span>
                  </td>
                </tr>
              ))}
              {ganhosNormalizados.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-muted-foreground">
                    Nenhum serviço prestado ainda.
                  </td>
                </tr>
              )}
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

function Conversas({ 
  token,
  chatAbertoExternamente,
  onChatAberto
}: { 
  token: string;
  chatAbertoExternamente?: number | null;
  onChatAberto?: () => void;
}) {
  const auth = useAuth();
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [ocultarFinalizados, setOcultarFinalizados] = useState(false);
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

  const sessoesFiltradas = useMemo(() => {
    let filtradas = sessoes;
    if (ocultarFinalizados) {
      filtradas = filtradas.filter(s => s.status !== "Finalizada");
    }
    return filtradas.sort((a, b) => {
      if (a.status !== "Finalizada" && b.status === "Finalizada") return -1;
      if (a.status === "Finalizada" && b.status !== "Finalizada") return 1;
      return 0;
    });
  }, [sessoes, ocultarFinalizados]);

  useEffect(() => {
    if (chatAbertoExternamente && sessoes.length > 0) {
      const sessao = sessoes.find(s => (s.id || s.Id) === chatAbertoExternamente);
      if (sessao) {
        handleSelectSessao(sessao);
        if (onChatAberto) onChatAberto();
      }
    }
  }, [chatAbertoExternamente, sessoes, handleSelectSessao, onChatAberto]);

  useEffect(() => {
    if (window.innerWidth < 768 && sessaoSelecionada) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sessaoSelecionada]);

  return (
    <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-6 shadow-xs">
      <h2 className="text-lg font-serif font-bold flex items-center gap-2.5 text-foreground">
        <MessageCircle size={18} className="text-[var(--moss)]" /> Central de Atendimento
      </h2>

      {loading ? (
        <p className="text-xs text-muted-foreground animate-pulse">Carregando atendimentos...</p>
      ) : sessoes.length === 0 && demandasDisponiveis.length === 0 ? (
        <div className="text-center py-12 text-xs text-muted-foreground italic bg-secondary/5 rounded-2xl border border-dashed">
          Nenhum chat ou atendimento acionado no momento. Fila do time local vazia.
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* List of Sessions */}
          <div className={`md:col-span-1 border border-border/40 rounded-2xl p-3 space-y-4 h-[480px] overflow-y-auto bg-secondary/5 ${sessaoSelecionada ? "hidden md:block" : "block"} scrollbar-none`}>
            
            {/* Meus Atendimentos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                  <MessageCircle size={12} className="text-[var(--moss)]" /> Meus Atendimentos
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setOcultarFinalizados(!ocultarFinalizados)}
                    className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full transition border cursor-pointer ${ocultarFinalizados ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-transparent text-muted-foreground border-transparent hover:bg-muted"}`}
                  >
                    Ocultar Finalizados
                  </button>
                  <span className="bg-[var(--moss)]/10 text-[var(--moss)] text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {sessoesFiltradas.length}
                  </span>
                </div>
              </div>

              {sessoesFiltradas.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic px-1 py-4">
                  Você não possui atendimentos para exibir.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessoesFiltradas.map((s) => {
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
                            ? "bg-[var(--moss)] text-white border-transparent shadow-sm"
                            : "bg-background hover:bg-muted/50 border-border/50"
                        }`}
                      >
                        <img
                          src={s.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'}
                          alt={s.viajanteNome}
                          className="w-9 h-9 rounded-full border border-border/50 object-cover shrink-0 shadow-xs"
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
                          
                          <p className={`text-[10px] truncate font-medium ${selected ? "text-white/80" : "text-muted-foreground"}`}>
                            {s.servicoTipo}
                          </p>

                          {hasAlert && (
                            <span className={`text-[8px] font-bold mt-1.5 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 animate-pulse ${
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
          <div className={`md:col-span-2 border border-border/40 rounded-2xl flex flex-col h-[480px] overflow-hidden bg-card ${
            sessaoSelecionada 
              ? "fixed inset-0 z-50 bg-background h-full w-full rounded-none border-0 md:relative md:inset-auto md:z-auto md:bg-card md:h-[480px] md:rounded-2xl md:border md:flex" 
              : "hidden md:flex"
          }`}>
            {sessaoSelecionada ? (
              <>
                {/* Chat window header */}
                <div className={`p-4 border-b bg-secondary/15 flex items-center justify-between gap-3 shrink-0 ${
                  sessaoSelecionada ? "pt-8 md:pt-4" : ""
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setSessaoSelecionada(null)}
                      className="md:hidden mr-1 text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-full hover:bg-secondary transition shrink-0"
                      aria-label="Voltar para a lista de atendimentos"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <img
                      src={sessaoSelecionada.viajanteFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'}
                      alt={sessaoSelecionada.viajanteNome || "Viajante"}
                      className="w-9 h-9 rounded-full border border-[var(--moss)] object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate block text-foreground">{sessaoSelecionada.viajanteNome}</p>
                      <p className="text-[10px] text-muted-foreground truncate block">{sessaoSelecionada.servicoTipo}</p>
                    </div>
                  </div>
                  {sessaoSelecionada.status === "Pendente" && !sessaoSelecionada.respondida && (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded-md animate-pulse">
                      SLA Pendente
                    </span>
                  )}
                </div>

                {(sessaoSelecionada.pontoEncontro || sessaoSelecionada.duvidaInicial || sessaoSelecionada.aeroporto) && (
                  <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-foreground flex flex-wrap gap-x-4 gap-y-1 shrink-0 leading-normal">
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
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-secondary/5 scrollbar-none">
                  {sessaoSelecionada.servicoTipo.toLowerCase().includes("liga") || sessaoSelecionada.servicoTipo.toLowerCase().includes("suporte") ? (
                    <div className="p-6 bg-card border border-border/40 rounded-3xl text-center space-y-4 shadow-sm max-w-xs mx-auto my-10 animate-in fade-in zoom-in-95 duration-200">
                      {sessaoSelecionada.status === "Finalizada" ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-muted text-muted-foreground/60 flex items-center justify-center mx-auto border border-border/40">
                            <Phone size={28} className="stroke-[1.5]" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-serif font-bold text-sm text-foreground">Chamada por Voz Encerrada</p>
                            <p className="text-[10px] text-muted-foreground">Esta ligação foi finalizada.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse border border-emerald-200">
                            <PhoneCall size={28} className="stroke-[1.5] animate-bounce" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-serif font-bold text-emerald-600 text-sm">Suporte de Voz Ativo!</p>
                            <p className="text-xs">Viajante: <strong>{sessaoSelecionada.viajanteNome}</strong></p>
                            <p className="text-[10px] text-muted-foreground mt-2">Você está conversando por voz com a viajante.</p>
                            <canvas
                              ref={canvasRef}
                              width={200}
                              height={60}
                              className="w-full h-[60px] rounded-lg mt-3 bg-secondary/15 border border-secondary/20"
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
                      <p className="text-center text-xs text-muted-foreground animate-pulse py-8">Carregando conversa...</p>
                    ) : (
                      mensagens.map((msg) => {
                        const isSystem = msg.remetenteId === 0;
                        const isTraveler = msg.remetenteId === sessaoSelecionada.usuariaId;
                        const isMeSender = !isSystem && !isTraveler;

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="text-center py-1.5 px-3 rounded-lg bg-secondary/40 text-[10px] text-muted-foreground max-w-[85%] mx-auto leading-normal">
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
                            <div className={`p-3 rounded-2xl text-xs leading-normal shadow-xs ${
                              isMeSender
                                ? "bg-[var(--moss)] text-white rounded-tr-none"
                                : "bg-card border border-border/40 text-foreground rounded-tl-none"
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
                  <form onSubmit={enviarMensagem} className="p-3 border-t border-border/40 bg-card flex gap-2 shrink-0">
                    <input
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder={sessaoSelecionada.status === "Finalizada" ? "Atendimento finalizado" : "Escreva sua mensagem..."}
                      disabled={sessaoSelecionada.status === "Finalizada"}
                      className="flex-1 bg-secondary border border-border/50 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--moss)] placeholder:text-muted-foreground/60 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!texto.trim() || enviando || sessaoSelecionada.status === "Finalizada"}
                      className="bg-[var(--moss)] text-white p-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs p-6 text-center space-y-2">
                <span className="text-xl">💬</span>
                <p>Selecione um atendimento ativo para responder.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

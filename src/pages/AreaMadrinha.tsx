import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";

type Secao = "cadastro" | "solicitacoes" | "ganhos";

const nav: Array<{
  k: Secao;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}> = [
  { k: "cadastro", label: "Cadastro", icon: FileText },
  { k: "solicitacoes", label: "Solicitações", icon: Inbox },
  { k: "ganhos", label: "Ganhos", icon: Wallet },
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
};

type UsuarioCadastroSource = Partial<UsuarioCadastro> & {
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
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
  };
}

export function AreaMadrinha({ secaoInicial = "cadastro" }: { secaoInicial?: Secao }) {
  const [secao, setSecao] = useState<Secao>(secaoInicial);
  const navigate = useNavigate();
  const auth = useAuth();
  const [profile, setProfile] = useState<MadrinhaProfileApi | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [solicitacoesApi, setSolicitacoesApi] = useState<SolicitacaoApi[]>([]);
  const [solicitacoesLoading, setSolicitacoesLoading] = useState(true);
  const [solicitacoesError, setSolicitacoesError] = useState("");

  const isMadrinha = auth.user?.roles?.includes("Madrinha") ?? false;

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated && !isMadrinha) {
      navigate({ to: "/" });
    }
  }, [auth.isAuthenticated, auth.ready, isMadrinha, navigate]);

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
      const response = await api.get<unknown>(SOLIICITACOES_MADRINHA_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setSolicitacoesApi(extrairSolicitacoes(response.data));
    } catch (err) {
      setSolicitacoesApi([]);
      setSolicitacoesError(await readErrorMessage(err));
    } finally {
      setSolicitacoesLoading(false);
    }
  }, [auth.ready, auth.token]);

  useEffect(() => {
    void carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  const perfilUsuario = normalizarUsuarioCadastro(profile ?? auth.user);
  const perfilSolicitacoes = useMemo(
    () => solicitacoesApi.map(mapSolicitacaoApi),
    [solicitacoesApi],
  );
  const mimos =
    profile?.servicos?.map((servico) => ({
      id: String(servico.id),
      descricao: servico.descricao,
    })) ?? [];
  const ganhos = useMemo(() => calcularGanhos(perfilSolicitacoes), [perfilSolicitacoes]);

  if (!auth.ready || !auth.isAuthenticated || !isMadrinha) return null;

  return (
    <SiteShell>
    <div className="max-w-6xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate({ to: "/jornada-madrinha" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

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

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="md:sticky md:top-20 self-start bg-card border rounded-2xl p-2">
          {nav.map((n) => {
            const Icon = n.icon;
            const ativo = secao === n.k;
            return (
              <button
                key={n.k}
                onClick={() => setSecao(n.k)}
                className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${ativo ? "bg-[var(--moss)] text-white font-medium" : "hover:bg-muted"}`}
              >
                <Icon size={16} /> {n.label}
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
              solicitacoes={perfilSolicitacoes}
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
              solicitacoes={perfilSolicitacoes}
              loading={solicitacoesLoading}
              error={solicitacoesError || profileError}
              token={auth.token ?? ""}
              onAtualizar={carregarSolicitacoes}
            />
          )}
          {secao === "ganhos" && (
            <Ganhos loading={profileLoading} error={profileError} ganhos={ganhos} />
          )}
        </div>
      </div>
    </div>
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
          <Linha k="Preço da diária" v={precoDiaria ? `R$ ${precoDiaria}` : "—"} />
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

      <Card title="O que você oferece além do suporte" icon={Sparkles}>
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
      </Card>
    </div>
  );
}

function Solicitacoes({
  solicitacoes,
  loading,
  error,
  token,
  onAtualizar,
}: {
  solicitacoes: Solic[];
  loading: boolean;
  error: string;
  token: string;
  onAtualizar: () => Promise<void>;
}) {
  const [lista, setLista] = useState<Solic[]>(solicitacoes);

  useEffect(() => {
    setLista(solicitacoes);
  }, [solicitacoes]);

  const decidir = async (id: string, action: "aceitar" | "recusar" | "cancelar") => {
    if (!token) {
      return;
    }

    await api.post(
      toSolicitacaoActionPath(action, id),
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    await onAtualizar();
  };

  const pendentes = lista.filter((s) => s.status === "aberto");
  const decididas = lista.filter((s) => s.status !== "aberto");

  return (
    <div className="space-y-6">
      <Card title={`Abertas (${pendentes.length})`} icon={Inbox}>
        {loading && <p className="text-sm text-muted-foreground">Carregando perfil...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && pendentes.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação no momento.</p>
        )}
        <div className="space-y-3">
          {pendentes.map((s) => (
            <div key={s.id} className="border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{s.nome}</p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                    <MapPin size={11} /> {s.cidade}
                  </p>
                </div>
                <span className="text-xs bg-[var(--sand)] rounded-full px-2.5 py-1 inline-flex items-center gap-1">
                  <Calendar size={11} /> {formatDataApenasDia(s.ida)} → {formatDataApenasDia(s.volta)}
                </span>
              </div>
              <p className="text-sm italic text-foreground/85 bg-[var(--sand)]/30 rounded-xl p-3 mb-3">
                "{s.mensagem}"
              </p>
              <div className="flex items-center justify-between gap-3 text-sm border-t pt-3">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {s.diarias} diárias × R$ {s.preco}
                  </p>
                  <p className="font-serif text-xl text-[var(--terracotta)]">
                    R$ {s.diarias * s.preco}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Você recebe R$ {Math.round(s.diarias * s.preco * (1 - COMISSAO))} (após 15% da
                    plataforma)
                  </p>
                </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => void decidir(s.id, "recusar")}
                      className="border rounded-full px-4 py-2 font-medium text-sm cursor-pointer hover:bg-muted"
                    >
                      Recusar
                    </button>
                    <button
                      onClick={() => void decidir(s.id, "aceitar")}
                      className="bg-[var(--moss)] text-white rounded-full px-4 py-2 font-medium text-sm cursor-pointer hover:bg-[var(--moss)]/90"
                    >
                      Aceitar
                    </button>
                  </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {decididas.length > 0 && (
        <Card title="Histórico recente" icon={Sparkles}>
          <div className="space-y-2">
            {decididas.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-sm border rounded-xl p-3">
                <div>
                  <p className="font-medium">{s.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDataApenasDia(s.ida)} → {formatDataApenasDia(s.volta)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs rounded-full px-3 py-1 ${s.status === "aceita" ? "bg-[var(--moss)]/15 text-[var(--moss)]" : s.status === "cancelada" ? "bg-[var(--terracotta)]/15 text-[var(--terracotta)]" : "bg-muted text-muted-foreground"}`}
                  >
                    {s.status === "aceita" ? "Aceita" : s.status === "cancelada" ? "Cancelada" : "Recusada"}
                  </span>
                  {s.status === "aceita" && (
                    <button
                      onClick={() => void decidir(s.id, "cancelar")}
                      className="border rounded-full px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Ganhos({
  ganhos,
  loading,
  error,
}: {
  ganhos: Ganho[];
  loading: boolean;
  error: string;
}) {
  const totais = useMemo(() => {
    const bruto = ganhos.reduce((acc, g) => acc + g.diarias * g.preco, 0);
    const comissao = bruto * COMISSAO;
    const liquido = bruto - comissao;
    const pago = ganhos
      .filter((g) => g.status === "pago")
      .reduce((a, g) => a + g.diarias * g.preco * (1 - COMISSAO), 0);
    const pendente = ganhos
      .filter((g) => g.status === "processando")
      .reduce((a, g) => a + g.diarias * g.preco * (1 - COMISSAO), 0);
    return { bruto, comissao, liquido, pago, pendente };
  }, [ganhos]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <KPI label="Recebido (líquido)" value={`R$ ${Math.round(totais.pago)}`} tone="moss" />
        <KPI label="A receber" value={`R$ ${Math.round(totais.pendente)}`} tone="terracotta" />
        <KPI label="Comissão Porto Segura (15%)" value={`- R$ ${Math.round(totais.comissao)}`} tone="muted" />
      </div>

      <Card title="Resumo financeiro" icon={Wallet}>
        {loading && (
          <p className="text-sm text-muted-foreground mb-4">Carregando profile da madrinha...</p>
        )}
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Linha k="Total bruto recebido" v={`R$ ${Math.round(totais.bruto)}`} />
          <Linha k="Desconto da plataforma (15%)" v={`- R$ ${Math.round(totais.comissao)}`} />
          <Linha k="Total líquido" v={`R$ ${Math.round(totais.liquido)}`} />
          <Linha k="Próximo repasse" v="Sex, 12/jun" />
        </div>
        <div className="mt-4 bg-[var(--sand)]/40 rounded-xl p-3 text-xs text-muted-foreground">
          A Porto Segura desconta <strong>15%</strong> sobre cada diária. O restante é repassado
          semanalmente para sua conta.
        </div>
      </Card>

      <Card title="Histórico de viagens" icon={Calendar}>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground tracking-wider">
                <th className="py-2 px-2">Viajante</th>
                <th className="py-2 px-2">Período</th>
                <th className="py-2 px-2">Diárias</th>
                <th className="py-2 px-2 text-right">Bruto</th>
                <th className="py-2 px-2 text-right">Comissão</th>
                <th className="py-2 px-2 text-right">Você recebe</th>
                <th className="py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {ganhos.map((g) => {
                const bruto = g.diarias * g.preco;
                const com = bruto * COMISSAO;
                return (
                  <tr key={g.id} className="border-t">
                    <td className="py-3 px-2 font-medium">{g.viajante}</td>
                    <td className="py-3 px-2 text-muted-foreground">{g.periodo}</td>
                    <td className="py-3 px-2">
                      {g.diarias} × R$ {g.preco}
                    </td>
                    <td className="py-3 px-2 text-right">R$ {bruto}</td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      - R$ {Math.round(com)}
                    </td>
                    <td className="py-3 px-2 text-right font-serif text-[var(--terracotta)]">
                      R$ {Math.round(bruto - com)}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`text-xs rounded-full px-2.5 py-1 ${g.status === "pago" ? "bg-[var(--moss)]/15 text-[var(--moss)]" : "bg-[var(--gold)]/20 text-[var(--gold)]"}`}
                      >
                        {g.status === "pago" ? "Pago" : "Em processamento"}
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

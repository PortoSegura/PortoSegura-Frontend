import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Filter, Heart, MapPin, Search, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/context/auth-context";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";

const OBTER_MADRINHAS_ENDPOINT = "madrinha";

type Ordenacao = "nome" | "avaliacao" | "preco" | "acolhimentos";

type MadrinhaSummaryApi = {
  id: number;
  precoDiaria: number;
  fotoPerfilUrl?: string | null;
  motivacao: string;
  usuarioId: number;
  nome: string;
  cidade: string;
  estado: string;
  servicos: string[];
  qtdSolicitacoes: number;
  mediaAvaliacao: number;
};

type MadrinhaCard = MadrinhaSummaryApi & {
  servicos: string[];
};

function extrairMadrinhas(payload: unknown): MadrinhaSummaryApi[] {
  if (Array.isArray(payload)) {
    return payload as MadrinhaSummaryApi[];
  }

  if (payload && typeof payload === "object") {
    const data = payload as { data?: unknown; items?: unknown; madrinhas?: unknown };

    if (Array.isArray(data.data)) {
      return data.data as MadrinhaSummaryApi[];
    }

    if (Array.isArray(data.items)) {
      return data.items as MadrinhaSummaryApi[];
    }

    if (Array.isArray(data.madrinhas)) {
      return data.madrinhas as MadrinhaSummaryApi[];
    }
  }

  return [];
}

function formatarQtdSolicitacoes(qtd: number) {
  if (qtd === 1) return "1 acolhimento concluído";
  return `${qtd} acolhimentos concluídos`;
}

function resumirMotivacao(motivacao: string) {
  const texto = motivacao.trim();

  if (texto.length <= 140) {
    return texto;
  }

  return `${texto.slice(0, 137).trimEnd()}...`;
}

function avatarFallback(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export function Madrinhas() {
  const auth = useRequireAuth();
  const navigate = useNavigate();

  const [destino, setDestino] = useState("");
  const [precoMax, setPrecoMax] = useState(400);
  const [ordem, setOrdem] = useState<Ordenacao>("avaliacao");
  const [madrinhas, setMadrinhas] = useState<MadrinhaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ida, setIda] = useState("");
  const [volta, setVolta] = useState("");

  useEffect(() => {
    let ativo = true;

    const carregarMadrinhas = async () => {
      if (!auth.ready || !auth.token) {
        if (ativo) {
          setMadrinhas([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get<unknown>(OBTER_MADRINHAS_ENDPOINT, {
          params: {
            destino: destino.trim() || undefined,
            precoMaximo: precoMax,
          },
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        if (!ativo) return;

        setMadrinhas(extrairMadrinhas(response.data).map((item) => ({
          ...item,
          servicos: Array.isArray(item.servicos) ? item.servicos : [],
        })));
      } catch (err) {
        if (!ativo) return;

        setMadrinhas([]);
        setError(await readErrorMessage(err));
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    };

    void carregarMadrinhas();

    return () => {
      ativo = false;
    };
  }, [auth.ready, auth.token, destino, precoMax]);

  const dias = useMemo(() => {
    if (!ida || !volta) return 0;
    const ms = new Date(volta).getTime() - new Date(ida).getTime();
    const diferenca = Math.round(ms / 86400000);
    return diferenca > 0 ? diferenca : 0;
  }, [ida, volta]);

  const lista = useMemo(() => {
    const filtradas = [...madrinhas];

    filtradas.sort((a, b) => {
      if (ordem === "preco") {
        return a.precoDiaria - b.precoDiaria;
      }

      if (ordem === "acolhimentos") {
        return b.qtdSolicitacoes - a.qtdSolicitacoes;
      }

      if (ordem === "avaliacao") {
        return b.mediaAvaliacao - a.mediaAvaliacao;
      }

      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    return filtradas;
  }, [madrinhas, ordem]);

  if (!auth.ready || !auth.isAuthenticated) {
    return null;
  }

  return (
    <SiteShell>
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl mb-2">Encontre sua Madrinha</h1>
        <p className="text-muted-foreground">
          {lista.length} mulheres prontas para te acolher pelo Brasil.
        </p>
      </div>

      <div className="bg-card border rounded-3xl p-6 sm:p-8 space-y-6 mb-8 shadow-sm">
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
              <MapPin size={16} className="text-[var(--moss)]" /> Para onde você quer viajar?
            </span>
            <div className="relative mt-2">
              <input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Busque cidades ou estados (Ex: Bonito, Salvador, SC...)"
                className="w-full bg-background border rounded-2xl pl-12 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--moss)] shadow-inner transition placeholder:text-muted-foreground/60"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            </div>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 pt-4 border-t border-border/60">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
              Data de Ida
            </span>
            <input
              type="date"
              value={ida}
              onChange={(e) => {
                setIda(e.target.value);
                if (volta && e.target.value && volta <= e.target.value) {
                  setVolta("");
                }
              }}
              min={new Date().toLocaleDateString("en-CA")}
              className="w-full bg-background border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--moss)]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
              Data de Volta
            </span>
            <input
              type="date"
              value={volta}
              onChange={(e) => setVolta(e.target.value)}
              min={ida || new Date().toLocaleDateString("en-CA")}
              className="w-full bg-background border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--moss)]"
            />
          </label>

          <label className="block">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              <span>Preço da diária</span>
              <span className="text-[var(--moss)] font-bold">R$ {precoMax}</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={5}
              value={precoMax}
              onChange={(e) => setPrecoMax(Number(e.target.value))}
              className="w-full mt-2 accent-[var(--moss)]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
              Ordenar por
            </span>
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as Ordenacao)}
              className="w-full bg-background border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--moss)] h-[42px]"
            >
              <option value="avaliacao">Melhor avaliação</option>
              <option value="nome">Nome</option>
              <option value="preco">Menor preço</option>
              <option value="acolhimentos">Mais acolhimentos</option>
            </select>
          </label>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando madrinhas...</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {!loading && !error && lista.length === 0 && (
        <div className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
          Nenhuma madrinha encontrada para os filtros atuais.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 cursor-pointer">
        {lista.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => navigate({ 
              to: "/madrinha/$id", 
              params: { id: String(m.id) },
              search: { 
                ida: ida || undefined, 
                volta: volta || undefined 
              }
            })}
            className="text-left bg-card border rounded-3xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition group relative"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--sand)]/60 overflow-hidden flex items-center justify-center text-[var(--moss)] font-semibold text-lg shrink-0">
                {m.fotoPerfilUrl ? (
                  <img src={m.fotoPerfilUrl} alt={m.nome} className="w-full h-full object-cover" />
                ) : (
                  <span>{avatarFallback(m.nome)}</span>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg leading-tight">{m.nome}</h3>
                  {m.mediaAvaliacao > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-[var(--gold)] font-medium bg-[var(--gold)]/10 px-1.5 py-0.5 rounded-md">
                      ★ {m.mediaAvaliacao.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--moss)] inline-flex items-center gap-1 font-medium mt-0.5">
                  <MapPin size={13} /> {m.cidade}, {m.estado}
                </p>
              </div>
            </div>

            <p className="text-sm text-foreground/80 italic mb-3 line-clamp-3">
              "{resumirMotivacao(m.motivacao)}"
            </p>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {m.servicos.slice(0, 2).map((servico) => (
                <span
                  key={servico}
                  className="text-[11px] rounded-full bg-[var(--sand)]/60 px-2 py-0.5 border border-[var(--sand)]"
                >
                  + {servico}
                </span>
              ))}
              {m.servicos.length > 2 && (
                <span className="text-[11px] text-muted-foreground">
                  +{m.servicos.length - 2} mimos
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[var(--terracotta)]" />
                  <span className="text-sm font-semibold">{formatarQtdSolicitacoes(m.qtdSolicitacoes)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Acolhimentos na plataforma</p>
              </div>
              <div className="text-right space-y-0.5">
                {dias > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground font-medium">Custo total ({dias} {dias === 1 ? "diária" : "diárias"})</p>
                    <p className="font-serif text-2xl text-[var(--terracotta)] font-bold">
                      R$ {m.precoDiaria * dias}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      R$ {m.precoDiaria} / diária
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-xl text-[var(--terracotta)]">R$ {m.precoDiaria}</p>
                    <p className="text-xs text-muted-foreground">por diária</p>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-14 bg-[var(--moss)] text-white rounded-3xl p-10 sm:p-14 text-center">
        <Heart size={32} className="mx-auto fill-white mb-3" />
        <h2 className="text-3xl sm:text-4xl mb-3">Quer acolher também?</h2>
        <p className="text-white/80 max-w-xl mx-auto mb-7">
          Seu perfil entra na plataforma quando estiver pronta para acolher mulheres viajando com mais segurança.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate({ to: "/jornada-madrinha" })}
            className="inline-flex items-center gap-2 rounded-full bg-white text-[var(--moss)] px-7 py-4 font-medium hover:bg-white/90"
          >
            Ver jornada da madrinha <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
    </SiteShell>
  );
}
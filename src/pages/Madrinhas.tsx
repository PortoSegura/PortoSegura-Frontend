import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Filter, Heart, MapPin, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/context/auth-context";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";

const OBTER_MADRINHAS_ENDPOINT = "madrinha";

type Ordenacao = "avaliacao" | "preco" | "acolhimentos";

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

  const lista = useMemo(() => {
    const filtradas = [...madrinhas];

    filtradas.sort((a, b) => {
      if (ordem === "preco") {
        return a.precoDiaria - b.precoDiaria;
      }

      if (ordem === "acolhimentos") {
        return b.qtdSolicitacoes - a.qtdSolicitacoes;
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

      <div className="bg-card border rounded-3xl p-5 sm:p-6 grid md:grid-cols-3 gap-4 mb-8 shadow-sm">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
            <MapPin size={12} /> Destino
          </span>
          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Ex: Bonito, Floripa..."
            className="mt-1 w-full bg-background border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--moss)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Diária até R$ {precoMax}</span>
          <input
            type="range"
            min={10}
            max={500}
            step={5}
            value={precoMax}
            onChange={(e) => setPrecoMax(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--moss)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
            <Filter size={12} /> Ordenar
          </span>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordenacao)}
            className="mt-1 w-full bg-background border rounded-xl px-3 py-2.5 text-sm"
          >
            <option value="avaliacao">Nome</option>
            <option value="preco">Menor preço</option>
            <option value="acolhimentos">Mais acolhimentos</option>
          </select>
        </label>
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
            onClick={() => navigate({ to: "/madrinha/$id", params: { id: String(m.id) } })}
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
                <h3 className="text-lg leading-tight">{m.nome}</h3>
                <p className="text-sm text-[var(--moss)] inline-flex items-center gap-1 font-medium">
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
              <div className="text-right">
                <p className="font-serif text-xl text-[var(--terracotta)]">R$ {m.precoDiaria}</p>
                <p className="text-xs text-muted-foreground">por diária</p>
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
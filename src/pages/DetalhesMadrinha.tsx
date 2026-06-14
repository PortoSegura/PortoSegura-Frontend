import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Calendar, Check, MapPin, QrCode, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/context/auth-context";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";

const OBTER_MADRINHA_POR_ID_ENDPOINT = "madrinha";

type MadrinhaDetalheApi = {
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
  avaliacoes?: Array<{
    id: number;
    nota: number;
    comentario: string;
    dataCriacao: string;
    nomeUsuaria: string;
  }> | null;
};

function avatarFallback(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function formatarQtdSolicitacoes(qtd: number) {
  if (qtd === 1) return "1 acolhimento concluído";
  return `${qtd} acolhimentos concluídos`;
}

const AVALIACOES_MOCK = [5, 4, 3, 2, 1].map((nota) => ({
  nota,
  count: 0,
}));

export function DetalhesMadrinha({ 
  id, 
  initialIda, 
  initialVolta 
}: { 
  id: string; 
  initialIda?: string; 
  initialVolta?: string; 
}) {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const [madrinha, setMadrinha] = useState<MadrinhaDetalheApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mostrandoFluxo, setMostrandoFluxo] = useState(false);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      if (!auth.ready || !auth.token) {
        if (ativo) {
          setMadrinha(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get<MadrinhaDetalheApi>(`${OBTER_MADRINHA_POR_ID_ENDPOINT}/${id}`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        if (!ativo) return;

        setMadrinha(response.data);
      } catch (err) {
        if (!ativo) return;

        setMadrinha(null);
        setError(await readErrorMessage(err));
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    };

    void carregar();

    return () => {
      ativo = false;
    };
  }, [auth.ready, auth.token, id]);

  const servicos = useMemo(() => madrinha?.servicos ?? [], [madrinha?.servicos]);

  const diasPreSel = useMemo(() => {
    if (!initialIda || !initialVolta) return 0;
    const ms = new Date(initialVolta).getTime() - new Date(initialIda).getTime();
    const diff = Math.round(ms / 86400000);
    return diff > 0 ? diff : 0;
  }, [initialIda, initialVolta]);

  const avaliacoesList = useMemo(() => madrinha?.avaliacoes ?? [], [madrinha?.avaliacoes]);

  const contagemAvaliacoes = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    avaliacoesList.forEach((a) => {
      const nota = Math.min(5, Math.max(1, a.nota)) as 1 | 2 | 3 | 4 | 5;
      counts[nota] = (counts[nota] || 0) + 1;
    });

    return [5, 4, 3, 2, 1].map((nota) => {
      const count = counts[nota as 1 | 2 | 3 | 4 | 5];
      const pct = avaliacoesList.length > 0 ? (count / avaliacoesList.length) * 100 : 0;
      return { nota, count, pct };
    });
  }, [avaliacoesList]);

  if (!auth.ready || !auth.isAuthenticated) {
    return null;
  }

  return (
    <SiteShell>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate({ to: "/busca" })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={16} /> Voltar para a busca
        </button>

        {loading && <p className="text-sm text-muted-foreground">Carregando madrinha...</p>}
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {!loading && !error && !madrinha && (
          <div className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
            Madrinha não encontrada para o id informado.
          </div>
        )}

        {!loading && !error && madrinha && !mostrandoFluxo && (
          <div className="bg-card border rounded-3xl p-7 sm:p-10 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
              <div className="w-28 h-28 rounded-3xl bg-[var(--sand)]/60 overflow-hidden flex items-center justify-center text-[var(--moss)] font-semibold text-2xl shrink-0">
                {madrinha.fotoPerfilUrl ? (
                  <img src={madrinha.fotoPerfilUrl} alt={madrinha.nome} className="w-full h-full object-cover" />
                ) : (
                  <span>{avatarFallback(madrinha.nome)}</span>
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl">{madrinha.nome}</h1>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[var(--moss)] font-medium">
                  <MapPin size={16} /> Moradora de {madrinha.cidade}, {madrinha.estado}
                </p>
                <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                  <Calendar size={16} /> {formatarQtdSolicitacoes(madrinha.qtdSolicitacoes)}
                </div>
              </div>

              <div className="text-right sm:border-l sm:pl-6 space-y-0.5">
                {diasPreSel > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">Custo total ({diasPreSel} {diasPreSel === 1 ? "diária" : "diárias"})</p>
                    <p className="font-serif text-4xl text-[var(--terracotta)] font-bold">R$ {madrinha.precoDiaria * diasPreSel}</p>
                    <p className="text-xs text-muted-foreground">R$ {madrinha.precoDiaria} / diária</p>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-4xl text-[var(--terracotta)]">R$ {madrinha.precoDiaria}</p>
                    <p className="text-xs text-muted-foreground">por diária de acompanhamento</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-10 mt-10">
              <div>
                <h2 className="text-xl mb-3">Sobre {madrinha.nome.split(" ")[0]}</h2>
                <p className="text-foreground/85 leading-relaxed mb-5">{madrinha.motivacao}</p>

                <h3 className="text-base font-semibold mb-2">o que oferece além do suporte:</h3>
                <ul className="space-y-1.5">
                  {servicos.map((servico) => (
                    <li key={servico} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-[var(--terracotta)]/15 text-[var(--terracotta)] flex items-center justify-center shrink-0">
                        <Sparkles size={11} />
                      </span>
                      <span>{servico}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <h2 className="text-xl mb-3">Motivação</h2>
                  <p className="text-foreground/85 leading-relaxed">{madrinha.motivacao}</p>
                </div>
              </div>

              <div className="rounded-3xl bg-[var(--sand)]/35 p-6 border flex flex-col justify-between">
                <div>
                  <h2 className="text-xl mb-1">Resumo das Avaliações</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {madrinha.mediaAvaliacao > 0 
                      ? `${madrinha.mediaAvaliacao.toFixed(1)} de 5 estrelas` 
                      : "Sem avaliações ainda"}
                  </p>
                  <div className="space-y-2">
                    {contagemAvaliacoes.map(({ nota, count, pct }) => (
                      <div key={nota} className="flex items-center gap-3 text-sm">
                        <span className="w-8 text-muted-foreground">{nota}★</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-[var(--gold)]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-border/40 mt-4 text-center text-sm font-semibold text-muted-foreground">
                  {avaliacoesList.length === 1 ? "1 avaliação no total" : `${avaliacoesList.length} avaliações no total`}
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="border-t pt-10 mt-10 space-y-6">
              <h2 className="text-2xl font-serif">Comentários e Experiências ({avaliacoesList.length})</h2>
              {avaliacoesList.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {avaliacoesList.map((a) => (
                    <div key={a.id} className="bg-card border rounded-3xl p-6 space-y-3 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-semibold text-sm">{a.nomeUsuaria}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(a.dataCriacao).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[var(--gold)] text-sm font-medium">
                            {"★".repeat(a.nota)}{"☆".repeat(5 - a.nota)}
                          </span>
                        </div>
                      </div>
                      {a.comentario ? (
                        <p className="text-sm text-foreground/80 italic leading-relaxed">
                          "{a.comentario}"
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Sem comentário escrito.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border bg-muted/20 p-8 text-center text-muted-foreground italic">
                  Nenhum comentário enviado para esta Madrinha ainda.
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t pt-7">
              <div className="text-sm text-muted-foreground">
                Pagamento seguro · cancelamento gratuito até 7 dias antes
              </div>
              <button
                onClick={() => setMostrandoFluxo(true)}
                className="inline-flex items-center justify-center gap-2 bg-[var(--moss)] text-white rounded-full px-7 py-4 font-medium hover:opacity-90"
              >
                Solicitar esta Madrinha <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {!loading && !error && madrinha && mostrandoFluxo && (
          <FluxoSolicitacao
            madrinha={madrinha}
            usuariaId={auth.user?.id ?? 0}
            token={auth.token ?? ""}
            initialIda={initialIda}
            initialVolta={initialVolta}
            onVoltar={() => setMostrandoFluxo(false)}
            onConfirmar={() => navigate({ to: "/minha-viagem" })}
          />
        )}
      </div>
    </SiteShell>
  );
}

function FluxoSolicitacao({
  madrinha,
  usuariaId,
  token,
  initialIda,
  initialVolta,
  onVoltar,
  onConfirmar,
}: {
  madrinha: MadrinhaDetalheApi;
  usuariaId: number;
  token: string;
  initialIda?: string;
  initialVolta?: string;
  onVoltar: () => void;
  onConfirmar: () => void;
}) {
  const [passo, setPasso] = useState(initialIda && initialVolta ? 2 : 1);
  const [destino, setDestino] = useState(`${madrinha.cidade}, ${madrinha.estado}`);
  const [ida, setIda] = useState(initialIda ?? "");
  const [volta, setVolta] = useState(initialVolta ?? "");
  const [erroDatas, setErroDatas] = useState("");
  const [erroSolicitacao, setErroSolicitacao] = useState("");
  const [criandoSolicitacao, setCriandoSolicitacao] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState<number | null>(null);

  const hoje = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  const validarDatas = () => {
    if (!ida) {
      setErroDatas("Informe a data de ida.");
      return false;
    }

    if (ida <= hoje) {
      setErroDatas("A data de ida precisa ser maior que hoje.");
      return false;
    }

    if (!volta) {
      setErroDatas("Informe a data de volta.");
      return false;
    }

    if (volta <= ida) {
      setErroDatas("A data de volta precisa ser maior que a data de ida.");
      return false;
    }

    setErroDatas("");
    return true;
  };

  const dias = useMemo(() => {
    if (!ida || !volta) return 1;
    const ms = new Date(volta).getTime() - new Date(ida).getTime();
    const diferenca = Math.round(ms / 86400000);
    return diferenca > 0 ? diferenca : 1;
  }, [ida, volta]);

  const total = madrinha.precoDiaria * dias;

  const criarSolicitacao = async () => {
    if (!validarDatas()) return;

    setErroSolicitacao("");
    setCriandoSolicitacao(true);

    try {
      const response = await api.post(
        "/solicitacoes",
        {
          UsuariaId: usuariaId,
          MadrinhaId: madrinha.id,
          Descricao: `Solicitação para ${madrinha.nome} - ${destino}`.trim(),
          DataInicio: ida,
          DataFim: volta,
          QtdDiarias: dias,
          Valor: total,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setSolicitacaoId(response.data?.id ?? null);
      setPasso(3);
    } catch (err) {
      setErroSolicitacao(await readErrorMessage(err));
    } finally {
      setCriandoSolicitacao(false);
    }
  };

  const Step = ({ n, label }: { n: number; label: string }) => (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${passo >= n ? "bg-[var(--moss)] text-white" : "bg-muted text-muted-foreground"}`}
      >
        {passo > n ? <Check size={16} /> : n}
      </div>
      <span className={`text-sm ${passo >= n ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-0 py-0">
      <button
        onClick={onVoltar}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="flex items-center justify-between mb-8 gap-2 flex-wrap">
        <Step n={1} label="Sua viagem" />
        <div className="h-px flex-1 bg-border min-w-4" />
        <Step n={2} label="Resumo" />
        <div className="h-px flex-1 bg-border min-w-4" />
        <Step n={3} label="Pagamento" />
      </div>

      <div className="bg-card border rounded-3xl p-7 sm:p-10 shadow-sm">
        {passo === 1 && (
          <div className="space-y-5">
            <h2 className="text-2xl">Conte sobre sua viagem</h2>
            <p className="text-muted-foreground">
              Você está solicitando a madrinha <strong>{madrinha.nome}</strong>.
            </p>
            <label className="block">
              <span className="text-sm font-medium">Destino</span>
              <input
                value={destino}
                disabled
                className="mt-1 w-full border rounded-xl px-3 py-3 bg-muted text-muted-foreground cursor-not-allowed"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium">Ida</span>
                <input
                  type="date"
                  value={ida}
                  min={hoje}
                  onChange={(e) => {
                    setIda(e.target.value);
                    setErroDatas("");
                    if (volta && e.target.value && volta <= e.target.value) {
                      setVolta("");
                    }
                  }}
                  className="mt-1 w-full border rounded-xl px-3 py-3 bg-background"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Volta</span>
                <input
                  type="date"
                  value={volta}
                  min={ida || hoje}
                  onChange={(e) => {
                    setVolta(e.target.value);
                    setErroDatas("");
                  }}
                  className="mt-1 w-full border rounded-xl px-3 py-3 bg-background"
                />
              </label>
            </div>
            {erroDatas && <p className="text-sm text-red-600">{erroDatas}</p>}
            <button
              onClick={() => {
                if (validarDatas()) {
                  setPasso(2);
                }
              }}
              className="w-full bg-[var(--moss)] text-white rounded-full py-4 font-medium"
            >
              Continuar
            </button>
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-5">
            <h2 className="text-2xl">Resumo do seu pedido</h2>
            {erroSolicitacao && <p className="text-sm text-red-600">{erroSolicitacao}</p>}
            <div className="border rounded-2xl p-5 space-y-3 bg-[var(--sand)]/30">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl bg-[var(--sand)]/60 overflow-hidden flex items-center justify-center text-[var(--moss)] font-semibold">
                  {madrinha.fotoPerfilUrl ? (
                    <img
                      src={madrinha.fotoPerfilUrl}
                      alt={madrinha.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{avatarFallback(madrinha.nome)}</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{madrinha.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    📍 {madrinha.cidade}, {madrinha.estado}
                  </p>
                </div>
              </div>
              <div className="text-sm grid grid-cols-2 gap-2 pt-2 border-t">
                <span className="text-muted-foreground">Destino</span>
                <span className="text-right">{destino}</span>
                <span className="text-muted-foreground">Datas</span>
                <span className="text-right">
                  {ida || "—"} → {volta || "—"}
                </span>
                <span className="text-muted-foreground">Duração</span>
                <span className="text-right">
                  {dias} {dias === 1 ? "diária" : "diárias"}
                </span>
                <span className="text-muted-foreground">Diária</span>
                <span className="text-right">R$ {madrinha.precoDiaria}</span>
                <span className="text-muted-foreground">Acompanhamento</span>
                <span className="text-right">WhatsApp 24h</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-semibold">Total ({dias}× R$ {madrinha.precoDiaria})</span>
                <span className="font-serif text-2xl text-[var(--terracotta)]">R$ {total}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPasso(1)}
                className="flex-1 border rounded-full py-4 font-medium"
                disabled={criandoSolicitacao}
              >
                Voltar
              </button>
              <button
                onClick={criarSolicitacao}
                disabled={criandoSolicitacao}
                className="flex-1 bg-[var(--moss)] text-white rounded-full py-4 font-medium"
              >
                {criandoSolicitacao ? "Criando solicitação..." : "Criar solicitação e ir para pagamento"}
              </button>
            </div>
          </div>
        )}

        {passo === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl">Pagamento via Pix</h2>
            <div className="border rounded-2xl p-6 space-y-5 bg-background">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--sand)]/50 flex items-center justify-center text-[var(--moss)]">
                  <QrCode size={28} />
                </div>
                <div>
                  <p className="font-semibold">Escaneie o QR Code para pagar</p>
                  <p className="text-sm text-muted-foreground">O pagamento real ainda não está configurado.</p>
                </div>
              </div>
              <div className="mx-auto w-fit rounded-3xl border bg-white p-4 shadow-sm">
                <MockQrCode />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                A chave Pix ainda não foi informada. Este QR Code é apenas um mock visual até a integração ficar pronta.
              </p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Total ({dias} {dias === 1 ? "diária" : "diárias"})
              </span>
              <span className="font-serif text-2xl text-[var(--terracotta)]">R$ {total}</span>
            </div>
            {solicitacaoId && (
              <div className="rounded-2xl border bg-[var(--sand)]/30 px-4 py-3 text-sm text-[var(--moss)]">
                Solicitação criada com sucesso #{solicitacaoId}.
              </div>
            )}
            <button
              onClick={onConfirmar}
              className="w-full bg-[var(--moss)] text-white rounded-full py-4 font-medium"
            >
              Finalizar
            </button>
            <p className="text-xs text-center text-muted-foreground">
              Sua madrinha entra em contato via WhatsApp em até 24h para te acolher antes da viagem.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MockQrCode() {
  const linhas = [
    [1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 0, 1],
    [0, 0, 1, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 1, 1],
    [1, 1, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1],
  ];

  return (
    <div className="grid grid-cols-7 gap-1 p-2 bg-white rounded-2xl">
      {linhas.flatMap((linha, linhaIndex) =>
        linha.map((celula, colunaIndex) => (
          <div
            key={`${linhaIndex}-${colunaIndex}`}
            className={`w-4 h-4 rounded-[3px] ${celula ? "bg-black" : "bg-white"}`}
          />
        )),
      )}
    </div>
  );
}



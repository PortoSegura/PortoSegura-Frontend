import { Check, FileText, ShieldCheck, GraduationCap, Users, Wallet, ArrowRight, Heart, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";

const ETAPAS = [
  {
    n: 1, titulo: "Candidatura",
    icon: FileText,
    desc: "Você conta sua história, sua cidade e por que quer acolher outras mulheres. Sem currículo formal — queremos saber quem você é.",
    detalhes: ["Formulário online em 10 minutos", "Foto e bio pessoal", "Indicação de 2 referências locais"],
  },
  {
    n: 2, titulo: "Verificação",
    icon: ShieldCheck,
    desc: "Conferimos seus documentos, antecedentes e fazemos uma entrevista por vídeo. Segurança das viajantes em primeiro lugar.",
    detalhes: ["RG e comprovante de residência", "Checagem de antecedentes", "Entrevista por vídeo de 30 min"],
  },
  {
    n: 3, titulo: "Treinamento",
    icon: GraduationCap,
    desc: "Curso online sobre acolhimento, primeiros socorros, comunicação por WhatsApp e protocolos de emergência.",
    detalhes: ["8 horas de conteúdo no seu ritmo", "Certificação Porto Segura", "Grupo de mentoria com madrinhas veteranas"],
  },
  {
    n: 4, titulo: "Pareamento",
    icon: Users,
    desc: "Seu perfil entra na plataforma. As viajantes te escolhem com base em avaliação, preço e afinidade. Você decide quais aceitar.",
    detalhes: ["Você define seu próprio preço", "Total controle de agenda", "Match transparente, sem algoritmo opaco"],
  },
  {
    n: 5, titulo: "Remuneração",
    icon: Wallet,
    desc: "Receba por viagem realizada, direto na sua conta. Comissão da plataforma de apenas 15%. Repasses semanais.",
    detalhes: ["R$ 150 a R$ 500 por viagem", "Pagamento em até 7 dias úteis", "Bônus para madrinhas Destaque (4.5★+)"],
  },
];

export function JornadaMadrinha() {

  const navigate = useNavigate();

  return (
    <SiteShell>
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--terracotta)]/20 bg-[var(--terracotta)]/10 text-[var(--terracotta)] px-3 py-1 text-xs font-medium">
          <Sparkles size={14}/> Seja uma Madrinha
        </span>
        <h1 className="text-4xl sm:text-5xl mt-4 leading-tight">Jornada da Madrinha</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Cinco passos para transformar seu conhecimento da sua cidade em renda — e em acolhimento real para mulheres viajando sozinhas.
        </p>
      </div>

      {/* Timeline horizontal (desktop) */}
      <div className="relative mb-16 hidden md:block">
        <div className="absolute top-7 left-[10%] right-[10%] h-1.5 rounded-full bg-[var(--sand)]"/>
        <div className="relative grid grid-cols-5 gap-4">
          {ETAPAS.map((e) => (
            <div key={e.n} className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[var(--terracotta)] text-white flex items-center justify-center font-serif text-xl shadow-md ring-4 ring-background">
                {e.n}
              </div>
              <p className="mt-3 text-sm font-medium">{e.titulo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cards detalhadas */}
      <div className="space-y-6">
        {ETAPAS.map((e, i) => {
          const Icon = e.icon;
          return (
            <div
              key={e.n}
              className={`bg-card border rounded-3xl p-7 sm:p-9 shadow-sm flex flex-col md:flex-row gap-7 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
            >
              <div className="flex md:flex-col items-center md:items-start gap-4 md:w-48 shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-[var(--moss)]/10 text-[var(--moss)] flex items-center justify-center">
                  <Icon size={28}/>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Etapa {e.n}</p>
                  <h2 className="text-2xl">{e.titulo}</h2>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-foreground/85 text-lg leading-relaxed mb-5">{e.desc}</p>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {e.detalhes.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-[var(--moss)]/15 text-[var(--moss)] flex items-center justify-center shrink-0">
                        <Check size={12}/>
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-14 bg-[var(--moss)] text-white rounded-3xl p-10 sm:p-14 text-center">
        <Heart size={32} className="mx-auto fill-white mb-3"/>
        <h2 className="text-3xl sm:text-4xl mb-3">Pronta para acolher?</h2>
        <p className="text-white/80 max-w-xl mx-auto mb-7">
          Seu conhecimento da sua cidade pode ser o que dá coragem para outra mulher viajar pela primeira vez sozinha.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => navigate({ to: "/candidatura" })} className="inline-flex items-center gap-2 rounded-full bg-white text-[var(--moss)] px-7 py-4 font-medium hover:bg-white/90">
            Quero me candidatar <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    </div>
    </SiteShell>
  );
}

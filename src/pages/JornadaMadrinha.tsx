import { Check, FileText, ShieldCheck, Calendar, Users, Wallet, ArrowRight, Heart, Sparkles, Handshake, MapPin } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import madrinhaWelcome from "@/assets/madrinha_welcome.png";
import madrinhaTour from "@/assets/madrinha_tour.png";

const ETAPAS = [
  {
    n: 1, titulo: "Cadastro na Plataforma",
    icon: ShieldCheck,
    desc: "O Cadastro da madrinha passa por uma verificação rigorosa, como análise de redes sociais, vídeo e entrevista.",
    detalhes: ["Segurança em 1º lugar", "Comprovação de identidade", "Entrevista de alinhamento"],
  },
  {
    n: 2, titulo: "Sua Disponibilidade",
    icon: Calendar,
    desc: "Você registra na plataforma a sua disponibilidade para os serviços que deseja oferecer, sem obrigações.",
    detalhes: ["Você no controle da agenda", "Flexibilidade total", "Sem metas ou mínimo de horas"],
  },
  {
    n: 3, titulo: "Receba Solicitações",
    icon: Users,
    desc: "Quando a usuária solicita um serviço no seu destino, o sistema exibe a solicitação para as madrinhas disponíveis.",
    detalhes: ["Match transparente", "Veja o perfil da viajante", "Escolha quem acolher"],
  },
  {
    n: 4, titulo: "Preste o Serviço",
    icon: Handshake,
    desc: "Você aceita a solicitação e presta o serviço combinado, garantindo a Autonomia Assistida da viajante.",
    detalhes: ["Suporte da plataforma", "Acolhimento real", "Experiências seguras"],
  },
  {
    n: 5, titulo: "Remuneração Justa",
    icon: Wallet,
    desc: "Receba a remuneração pelo serviço realizado diretamente na sua conta, de forma rápida e transparente.",
    detalhes: ["Apenas 15% de taxa da plataforma", "Fique com 85% do valor", "Repasses garantidos"],
  },
];

export function JornadaMadrinha() {
  const navigate = useNavigate();

  return (
    <SiteShell>
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Hero Section Redesigned */}
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--terracotta)]/20 bg-[var(--terracotta)]/10 text-[var(--terracotta)] px-3 py-1 text-xs font-medium mb-6">
            <Sparkles size={14}/> Torne-se uma Madrinha
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-5xl leading-[1.1] font-medium mb-6">
            Viajar solo nunca mais será <br/><span className="italic text-[var(--terracotta)]">sinônimo de estar sozinha.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
            Madrinhas são moradoras locais que oferecem suporte, acolhimento e segurança a viajantes solo. 
            Transforme o conhecimento da sua cidade em uma <strong>remuneração justa</strong> pelos seus serviços, fortalecendo a rede de apoio a outras mulheres.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={() => navigate({ to: "/candidatura" })} className="inline-flex items-center gap-2 rounded-full bg-[var(--terracotta)] text-white px-8 py-4 text-base font-medium hover:opacity-90 transition shadow-lg shadow-[var(--terracotta)]/20">
              Quero ser Madrinha <ArrowRight size={18}/>
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-[var(--moss)]/10 rotate-3" />
          <img
            src={madrinhaWelcome}
            alt="Madrinha recepcionando viajante"
            className="relative rounded-[2rem] shadow-2xl object-cover w-full aspect-[4/3] border border-border/50"
          />
        </div>
      </div>

      {/* Remuneração Highlight Section */}
      <div className="bg-[var(--sand)] rounded-[3rem] p-8 sm:p-14 mb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--moss)]/5 rounded-full blur-3xl" />
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 relative">
            <img
              src={madrinhaTour}
              alt="Madrinha e viajante passeando juntas"
              className="rounded-3xl shadow-xl object-cover aspect-square w-full sm:w-[85%] mx-auto lg:ml-0"
            />
            <div className="absolute -bottom-6 -right-2 sm:right-6 bg-white border rounded-2xl p-5 shadow-xl max-w-[220px]">
              <div className="flex gap-3 mb-2">
                <Wallet className="text-[var(--moss)]" />
                <span className="font-semibold">Transparência</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A Plataforma fica com apenas <strong>15%</strong>. O restante é todo seu!
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-4xl">Ganhos justos e transparentes.</h2>
            <p className="text-lg text-muted-foreground">
              Você define quanto trabalha e o que quer fazer. Nossos serviços utilizam um sistema de créditos, 
              onde 1 Crédito (CR) equivale a <strong>R$ 7,00</strong>. Veja exemplos de como você pode faturar:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="bg-white/80 backdrop-blur border rounded-2xl p-5 shadow-sm">
                <div className="text-2xl font-semibold text-[var(--terracotta)] mb-1">2 CR</div>
                <div className="font-medium">Dicas Locais / Chat</div>
                <div className="text-sm text-muted-foreground mt-1">R$ 14,00 por atendimento rápido.</div>
              </div>
              <div className="bg-white/80 backdrop-blur border rounded-2xl p-5 shadow-sm">
                <div className="text-2xl font-semibold text-[var(--terracotta)] mb-1">3 CR</div>
                <div className="font-medium">Ligação Suporte</div>
                <div className="text-sm text-muted-foreground mt-1">R$ 21,00 para resolver dúvidas críticas.</div>
              </div>
              <div className="bg-white/80 backdrop-blur border rounded-2xl p-5 shadow-sm">
                <div className="text-2xl font-semibold text-[var(--terracotta)] mb-1">15 CR</div>
                <div className="font-medium">Busca Aeroporto</div>
                <div className="text-sm text-muted-foreground mt-1">R$ 105,00 por recepção no desembarque.</div>
              </div>
              <div className="bg-white/80 backdrop-blur border rounded-2xl p-5 shadow-sm">
                <div className="text-2xl font-semibold text-[var(--terracotta)] mb-1">6 CR</div>
                <div className="font-medium">Acompanhamento</div>
                <div className="text-sm text-muted-foreground mt-1">R$ 42,00 por hora de passeio guiado.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Como Funciona na Prática */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl sm:text-4xl">Como funciona na Prática?</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Cinco passos simples para oferecer apoio, criar conexões e ser recompensada.
        </p>
      </div>

      {/* Cards detalhadas */}
      <div className="space-y-6 mb-24 max-w-5xl mx-auto">
        {ETAPAS.map((e, i) => {
          const Icon = e.icon;
          return (
            <div
              key={e.n}
              className={`bg-card border rounded-3xl p-7 sm:p-9 shadow-sm flex flex-col md:flex-row gap-7 items-center transition hover:shadow-md ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
            >
              <div className="flex md:flex-col items-center gap-4 md:w-56 shrink-0 text-center">
                <div className="w-20 h-20 rounded-3xl bg-[var(--moss)]/10 text-[var(--moss)] flex items-center justify-center">
                  <Icon size={36}/>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-[var(--terracotta)]">Passo {e.n}</p>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-medium mb-3">{e.titulo}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">{e.desc}</p>
                <ul className="grid sm:grid-cols-3 gap-3">
                  {e.detalhes.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded-lg">
                      <span className="mt-0.5 text-[var(--moss)] shrink-0">
                        <Check size={16}/>
                      </span>
                      <span className="font-medium text-foreground/80">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Final */}
      <div className="bg-[var(--moss)] text-white rounded-[3rem] p-10 sm:p-16 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        <Heart size={40} className="mx-auto fill-[var(--terracotta)] text-[var(--terracotta)] mb-6 drop-shadow-md"/>
        <h2 className="text-3xl sm:text-5xl font-medium mb-5">Pronta para acolher?</h2>
        <p className="text-white/85 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Seu conhecimento da sua cidade pode ser o que dá coragem para outra mulher viajar pela primeira vez. 
          Junte-se ao nosso time de Madrinhas!
        </p>
        <button onClick={() => navigate({ to: "/candidatura" })} className="inline-flex items-center gap-3 rounded-full bg-white text-[var(--moss)] px-10 py-5 font-semibold text-lg hover:bg-white/90 transition shadow-xl hover:-translate-y-1">
          Quero me candidatar <ArrowRight size={20}/>
        </button>
      </div>
    </div>
    </SiteShell>
  );
}

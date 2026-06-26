import { useEffect } from "react";
import { Avatar } from "@radix-ui/react-avatar";
import {
  Sparkles,
  ArrowRight,
  Shield,
  MessageCircle,
  Search,
  Calendar,
  Heart,
  CreditCard,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { useAuth } from "@/context/auth-context";

function Badge({
  children,
  tone = "moss",
}: {
  children: React.ReactNode;
  tone?: "moss" | "terracotta" | "sand";
}) {
  const styles = {
    moss: "bg-[var(--moss)]/10 text-[var(--moss)] border-[var(--moss)]/20",
    terracotta: "bg-[var(--terracotta)]/10 text-[var(--terracotta)] border-[var(--terracotta)]/20",
    sand: "bg-[var(--sand)] text-foreground border-transparent",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

export function Home() {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated) {
      const isMadrinha = auth.user?.roles?.includes("Madrinha") ?? false;
      if (isMadrinha) {
        navigate({ to: "/areamadrinha" });
      } else {
        navigate({ to: "/minha-viagem" });
      }
    }
  }, [auth.isAuthenticated, auth.ready, auth.user, navigate]);

  return (
    
    <SiteShell>
    <div>
      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 px-6 lg:px-16 pt-10 lg:pt-20 pb-16 max-w-7xl mx-auto items-center">
          <div className="space-y-7">
            <Badge tone="terracotta">
              <Sparkles size={14} /> Para mulheres que decidiram ir
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.05] font-medium">
              Viaje solo,
              <br />
              <span className="italic text-[var(--terracotta)]">nunca sozinha.</span> 
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
               Porto Segura conecta você a um <strong>Time de Madrinhas</strong>, mulheres que
              moram no seu destino, e estão disponíveis para prestar suporte, companhia e segurança durante toda a sua viagem.
            </p>
            <p className="text-md text-muted-foreground max-w-xl">
              As Madrinhas são avaliadas, verificadas e treinadas para garantir que você tenha uma experiência segura e agradável.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate({ to: "/login" })}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--moss)] text-white px-7 py-4 text-base font-medium hover:opacity-90 transition shadow-sm"
              >
                Encontre sua Madrinha <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate({ to: "/jornada-madrinha" })}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--moss)] text-[var(--moss)] px-7 py-4 text-base font-medium hover:bg-[var(--moss)] hover:text-white transition"
              >
                Seja uma Madrinha <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-[var(--sand)]/60 -rotate-2" />
            <img
              src={heroImg}
              alt="Mulher viajando com tranquilidade"
              width={1536}
              height={1024}
              className="relative rounded-[1.75rem] shadow-xl object-cover w-full aspect-[4/3]"
            />
            <div className="absolute -bottom-6 -left-6 bg-card border rounded-2xl p-4 shadow-lg max-w-[240px] hidden sm:block">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold leading-tight">Cláudia, 51</p>
                  <p className="text-xs text-muted-foreground">📍 Recife, PE</p>
                </div>
              </div>
              <p className="text-xs mt-2 italic text-foreground/80">
                "Te espero no aeroporto e te levo até o hotel com segurança."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 passos */}
      <section className="bg-[var(--sand)]/40 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--terracotta)] mb-3">
              Como funciona
            </p>
            <h2 className="text-3xl sm:text-4xl">Três passos. Zero burocracia.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                i: <Search size={26} />,
                t: "1. Cadastre seu destino",
                d: "Informe seu destino e data. Conheça o time de madrinhas que irá te acompanhar durante a viagem",
              },
              {
                i: <CreditCard size={26} />,
                t: "2. Compre créditos",
                d: "Adquira créditos para consumir serviços sob demanda durante a viagem.",
              },
              {
                i: <Heart size={26} />,
                t: "3. Autonomia Assistida",
                d: "Consuma serviços sob demanda: dicas no chat, busca no aeroporto ou acompanhamento presencial.",
              },
            ].map((p, idx) => (
              <div key={idx} className="bg-card border rounded-3xl p-8 hover:shadow-md transition">
                <div className="w-12 h-12 rounded-2xl bg-[var(--moss)]/10 text-[var(--moss)] flex items-center justify-center mb-5">
                  {p.i}
                </div>
                <h3 className="text-xl mb-2">{p.t}</h3>
                <p className="text-muted-foreground">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catálogo de Serviços e Créditos */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--terracotta)] mb-3">
              Sistema de Créditos
            </p>
            <h2 className="text-3xl sm:text-4xl mb-4">Catálogo de Serviços</h2>
            <p className="text-lg text-muted-foreground">
              Garante flexibilidade, autonomia e segurança permitindo o consumo assistido sob demanda. <br/>
              <span className="font-semibold text-foreground">1 Crédito = R$ 7,00</span>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Dicas Locais / Chat",
                credits: "2 CR",
                desc: "Orientações rápidas e curadoria personalizada de pontos turísticos e locais seguros."
              },
              {
                title: "Ligação de Suporte",
                credits: "3 CR",
                desc: "Atendimento direto via chat para resolução de dúvidas críticas ou suporte imediato."
              },
              {
                title: "Busca no Aeroporto",
                credits: "15 CR",
                desc: "Recepção no desembarque e acompanhamento até ao seu local de hospedagem."
              },
              {
                title: "Acomp. Presencial",
                credits: "6 CR / hora",
                desc: "Acompanhamento explorando a cidade e pontos turísticos com segurança total."
              }
            ].map((s, idx) => (
              <div key={idx} className="bg-[var(--sand)]/20 border border-[var(--moss)]/10 rounded-3xl p-6 flex flex-col hover:shadow-md transition">
                <h3 className="text-lg font-medium mb-1">{s.title}</h3>
                <p className="text-[var(--terracotta)] font-semibold text-xl mb-3">{s.credits}</p>
                <p className="text-muted-foreground text-sm flex-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto mt-10 bg-[var(--moss)] text-white rounded-3xl p-10 sm:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl mb-4">Onde você sempre quis ir?</h2>
          <p className="text-white/80 mb-7 max-w-xl mx-auto">
            Conheça as madrinhas que estão esperando por você nos destinos mais bonitos do Brasil.
          </p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="inline-flex items-center gap-2 rounded-full bg-white text-[var(--moss)] px-7 py-4 font-medium hover:bg-white/90 transition shadow-md text-lg"
          >
            Encontre sua Madrinha <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
    </SiteShell>
  );
}

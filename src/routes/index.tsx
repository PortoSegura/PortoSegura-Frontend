import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/pages/Home";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Porto Segura — Viaje sozinha, nunca sem alguém que te conhece lá" },
      { name: "description", content: "Conecte-se a uma Madrinha de Viagem: uma mulher que mora no seu destino e te acompanha por WhatsApp 24h." },
    ],
  }),
});

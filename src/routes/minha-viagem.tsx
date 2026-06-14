import { createFileRoute } from "@tanstack/react-router";
import { MinhaViagem } from "@/pages/MinhaViagem";

export const Route = createFileRoute("/minha-viagem")({
  component: MinhaViagem,
  head: () => ({
    meta: [
      { title: "Minha Viagem — Porto Segura" },
      { name: "description", content: "Gerencie sua viagem na Porto Segura." },
    ],
  }),
});

import { createFileRoute } from "@tanstack/react-router";
import { Carteira } from "@/pages/Carteira";

export const Route = createFileRoute("/carteira")({
  component: Carteira,
  head: () => ({
    meta: [
      { title: "Minha Carteira — Porto Segura" },
      { name: "description", content: "Gerencie e adquira créditos para sua viagem assistida na Porto Segura." },
    ],
  }),
});

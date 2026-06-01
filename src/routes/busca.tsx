import { createFileRoute } from "@tanstack/react-router";
import {Madrinhas} from "@/pages/Madrinhas";

export const Route = createFileRoute("/busca")({
  component: Madrinhas,
  head: () => ({
    meta: [
      { title: "Encontre sua Madrinha — Porto Segura" },
      { name: "description", content: "Encontre a madrinha perfeita para você no Brasil." },
    ],
  }),
});

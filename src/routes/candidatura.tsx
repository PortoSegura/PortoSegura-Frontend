import { createFileRoute } from "@tanstack/react-router";
import { Candidatura } from "@/pages/CandidaturaMadrinha";

export const Route = createFileRoute("/candidatura")({
  component: Candidatura,
  head: () => ({
    meta: [{ title: "Seja uma Madrinha — Porto Segura" }],
  }),
});

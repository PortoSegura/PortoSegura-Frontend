import { createFileRoute } from "@tanstack/react-router";
import { JornadaMadrinha } from "@/pages/JornadaMadrinha";

export const Route = createFileRoute("/jornada-madrinha")({
  component: JornadaMadrinha,
  head: () => ({
    meta: [{ title: "Jornada da Madrinha — Porto Segura" }],
  }),
});

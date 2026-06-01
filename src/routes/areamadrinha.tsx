import { createFileRoute } from "@tanstack/react-router";
import { AreaMadrinha } from "../pages/AreaMadrinha";

export const Route = createFileRoute("/areamadrinha")({
  component: AreaMadrinha,
  head: () => ({
    meta: [
      { title: "Área da Madrinha — Porto Segura" },
      { name: "description", content: "Acesse sua área exclusiva como madrinha na Porto Segura." },
    ],
  }),
});

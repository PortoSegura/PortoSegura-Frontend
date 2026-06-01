import { createFileRoute } from "@tanstack/react-router";
import { DetalhesMadrinha } from "@/pages/DetalhesMadrinha";

export const Route = createFileRoute("/madrinha/$id")({
  component: RouteComponent,
  head: () => ({
    meta: [
      { title: "Detalhes da Madrinha — Porto Segura" },
      { name: "description", content: "Veja os detalhes da madrinha selecionada." },
    ],
  }),
});

function RouteComponent() {
  const { id } = Route.useParams();

  return <DetalhesMadrinha id={id} />;
}
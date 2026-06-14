import { createFileRoute } from "@tanstack/react-router";
import { DetalhesMadrinha } from "@/pages/DetalhesMadrinha";

type MadrinhaSearch = {
  ida?: string;
  volta?: string;
};

export const Route = createFileRoute("/madrinha/$id")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): MadrinhaSearch => {
    return {
      ida: typeof search.ida === "string" ? search.ida : undefined,
      volta: typeof search.volta === "string" ? search.volta : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Detalhes da Madrinha — Porto Segura" },
      { name: "description", content: "Veja os detalhes da madrinha selecionada." },
    ],
  }),
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { ida, volta } = Route.useSearch();

  return <DetalhesMadrinha id={id} initialIda={ida} initialVolta={volta} />;
}
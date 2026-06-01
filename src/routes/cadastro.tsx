import { createFileRoute } from "@tanstack/react-router";
import {Cadastro} from "@/pages/Cadastro";

export const Route = createFileRoute("/cadastro")({
  component: Cadastro,
  head: () => ({
    meta: [
      { title: "Cadastre-se — Porto Segura" },
      { name: "description", content: "Crie sua conta na Porto Segura." },
    ],
  }),
});

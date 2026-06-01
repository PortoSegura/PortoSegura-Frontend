import { createFileRoute } from "@tanstack/react-router";
import {Login} from "@/pages/Login";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [
      { title: "Entrar — Porto Segura" },
      { name: "description", content: "Acesse sua conta Porto Segura." },
    ],
  }),
});

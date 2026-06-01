import { useRequireAuth } from "@/context/auth-context";

export function Dashboard() {
  const auth = useRequireAuth();

  // aguarda ready para evitar flicker enquanto checamos localStorage
  if (!auth.ready) return null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">Dashboard (Área protegida)</h1>

      <p className="mb-4">Esta página requer autenticação — somente acessível com token válido.</p>

      <div className="mb-4">
        <strong>Status:</strong> {auth.isAuthenticated ? "Autenticado" : "Não autenticado"}
      </div>

      <div className="mb-4">
        <strong>Token:</strong> {auth.token ? "(presente)" : "(ausente)"}
      </div>

      <button
        onClick={() => auth.logout()}
        className="rounded-full bg-red-600 text-white px-4 py-2"
      >
        Sair
      </button>
    </div>
  );
}

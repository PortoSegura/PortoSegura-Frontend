import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { NotFoundComponent } from "@/components/NotFoundComponent";
import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Porto Segura" },
      { name: "description", content: "Viaje sozinha com uma Madrinha local que te acompanha 24h." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Porto Segura" },
      { property: "og:description", content: "Viaje sozinha com uma Madrinha local que te acompanha 24h." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Porto Segura" },
      { name: "twitter:description", content: "Viaje sozinha com uma Madrinha local que te acompanha 24h." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2b9bb2fc-7968-41cb-8066-ff7aad30ebbb/id-preview-7b8b1b71--54db2ea7-6ee2-4451-8e0e-fdba7c9ac91b.lovable.app-1777911823458.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2b9bb2fc-7968-41cb-8066-ff7aad30ebbb/id-preview-7b8b1b71--54db2ea7-6ee2-4451-8e0e-fdba7c9ac91b.lovable.app-1777911823458.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}

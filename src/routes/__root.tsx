import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSystemConfig, syncAllFromSamsara } from "@/lib/database";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>

        {error && (
          <div className="mt-4 text-left bg-muted p-4 rounded-md overflow-auto max-h-60 text-xs font-mono border text-destructive max-w-lg mx-auto">
            <p className="font-bold">{error.name || "Error"}: {error.message || "Unknown error"}</p>
            {error.stack && <pre className="mt-2 whitespace-pre-wrap text-[10px] opacity-80">{error.stack}</pre>}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Centro de Inteligencia Corporativa — Productividad de Transporte" },
      { name: "description", content: "Sistema profesional para medir productividad de tractos y remolques: utilización, carga útil, venta por km, tiempo muerto y utilidad real." },
      { name: "author", content: "Centro de Inteligencia Corporativa" },
      { property: "og:title", content: "Centro de Inteligencia Corporativa — Productividad de Transporte" },
      { property: "og:description", content: "Mide y administra la productividad de tu flota en tiempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
  const { queryClient } = Route.useRouteContext();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (window.localStorage.getItem("fleet-theme") as "light" | "dark") || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    window.localStorage.setItem("fleet-theme", theme);
  }, [theme]);

  // Auto-sync real Samsara telemetry on app boot
  useEffect(() => {
    const config = getSystemConfig();
    if (config.samsaraApiKey) {
      syncAllFromSamsara(config.samsaraApiKey)
        .then((res) => {
          if (res.success) {
            console.log(`[CIC API Auto-Sync] Sincronización exitosa: ${res.matchCount} unidades.`);
          } else {
            console.warn("[CIC API Auto-Sync] Error en sincronización:", res.error);
          }
        })
        .catch((err) => {
          console.error("[CIC API Auto-Sync] Error general:", err);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background transition-colors duration-200">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur transition-colors duration-200">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <div className="hidden md:flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground w-72">
                  <Search className="h-4 w-4" />
                  <span>Buscar unidad, conductor, ruta…</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  aria-label="Cambiar tema"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
                </Button>
                <Button size="icon" variant="ghost" aria-label="Notificaciones">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="gold" size="sm">Generar reporte</Button>
                <div className="h-8 w-8 rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground grid place-items-center text-xs font-semibold">
                  JR
                </div>
              </div>
            </header>
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </QueryClientProvider>
  );
}

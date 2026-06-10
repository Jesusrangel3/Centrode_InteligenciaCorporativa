import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Truck,
  Container,
  TrendingUp,
  FileBarChart,
  Settings,
  ChevronDown,
  Briefcase,
  Building2,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type LeafItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
type Direction = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: LeafItem[];
  comingSoon?: boolean;
  url?: string;
};

const operacionItems: LeafItem[] = [
  { title: "Tractocamiones", url: "/tractos", icon: Truck },
  { title: "Remolques", url: "/remolques", icon: Container },
  { title: "Productividad", url: "/productividad", icon: TrendingUp },
  { title: "Reportes", url: "/reportes", icon: FileBarChart },
];

const direcciones: Direction[] = [
  {
    title: "Operación",
    icon: Briefcase,
    items: operacionItems,
  },
  { title: "Administración", icon: Building2, comingSoon: true },
  { title: "DHO", url: "/dho", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const isDirectionActive = (d: Direction) =>
    d.items?.some((i) => isActive(i.url)) ?? false;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={cn("border-b border-sidebar-border transition-all duration-300", collapsed ? "p-1" : "p-2")}>
        <Link
          to="/"
          className={cn(
            "flex items-center transition-all duration-300",
            collapsed ? "justify-center px-0 py-2 w-full" : "gap-2 px-2 py-3"
          )}
        >
          <img
            src="/logo.png"
            alt="Logo"
            className="h-9 w-9 shrink-0 rounded-md object-contain shadow-sm"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-sidebar-foreground leading-tight uppercase tracking-tight whitespace-normal break-words">
                Centro de Inteligencia Corporativa
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Direcciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")}>
                  <Link to="/" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {direcciones.map((dir) => {
                if (dir.comingSoon) {
                  return (
                    <SidebarMenuItem key={dir.title}>
                      <SidebarMenuButton
                        disabled
                        className="opacity-60 cursor-not-allowed"
                      >
                        <dir.icon className="h-4 w-4" />
                        {!collapsed && (
                          <span className="flex-1 flex items-center justify-between">
                            <span>{dir.title}</span>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              Próx.
                            </span>
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                if (dir.url) {
                  return (
                    <SidebarMenuItem key={dir.title}>
                      <SidebarMenuButton asChild isActive={isActive(dir.url)}>
                        <Link to={dir.url} className="flex items-center gap-2">
                          <dir.icon className="h-4 w-4" />
                          {!collapsed && <span>{dir.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={dir.title}
                    defaultOpen={isDirectionActive(dir)}
                    className="group/dir"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="font-medium">
                          <dir.icon className="h-4 w-4" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{dir.title}</span>
                              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]/dir:-rotate-90" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!collapsed && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {dir.items?.map((item) => (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive(item.url)}
                                >
                                  <Link to={item.url} className="flex items-center gap-2">
                                    <item.icon className="h-3.5 w-3.5" />
                                    <span>{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/configuracion")}>
                  <Link to="/configuracion" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Configuración</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

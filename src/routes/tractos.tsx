import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  getTractos,
  getBusinessUnits,
  formatUSD,
  Tracto,
  EquipoEstado,
  BusinessUnit,
  getSystemConfig,
  syncAllFromSamsara,
} from "@/lib/database";
import {
  Plus,
  Filter,
  Download,
  Search,
  X,
  FileSpreadsheet,
  Truck,
  TrendingUp,
  Activity,
  Gauge,
  Shield,
  Clock,
  ExternalLink,
  Wifi,
  Wrench,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/tractos")({
  head: () => ({
    meta: [
      { title: "Gestión de Tractos — Centro de Inteligencia Corporativa" },
      { name: "description", content: "Monitoreo y administración completa de la flota de tractocamiones." },
    ],
  }),
  component: TractosPage,
});

// Tiny SVG Sparkline for inline trends
function Sparkline({ values, strokeColor = "#10B981" }: { values: number[]; strokeColor?: string }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min === 0 ? 1 : max - min;
  const width = 50;
  const height = 16;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 1 - ((v - min) / range) * (height - 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="inline-block ml-2 opacity-80" style={{ verticalAlign: "middle" }}>
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

// Generate deterministic fluctuating historical values for sparklines
const getSparklineValues = (id: string, type: "rendimiento" | "utilidad" | "utilizacion") => {
  const seed = parseInt(id.replace(/\D/g, "")) || 1;
  const vals = [];
  for (let i = 0; i < 6; i++) {
    let val = 0;
    if (type === "rendimiento") {
      val = 2.1 + (Math.sin(seed + i) * 0.2) + (seed % 3) * 0.1;
    } else if (type === "utilidad") {
      val = 5000 + (Math.cos(seed * i) * 1200) + (seed % 5) * 400;
    } else {
      val = 70 + (Math.sin(seed + i * 2) * 15);
    }
    vals.push(parseFloat(val.toFixed(2)));
  }
  return vals;
};

// Deterministic simulated recent telemetry logs for each unit
const getRecentTelemetryEvents = (t: Tracto) => {
  const isMaint = t.estado === "Mantenimiento";
  const isInact = t.estado === "Inactivo";
  
  if (isInact) {
    return [
      { time: "Hace 2 hrs", event: "Apagado del Motor", desc: `Unidad #${t.economico} reporta parada prolongada en patio principal de ${t.unidadNegocio}.` },
      { time: "Hace 4 hrs", event: "Detención de Viaje", desc: `Viaje finalizado. Conductor asignado: ${t.conductor || "—"}.` },
    ];
  }
  
  if (isMaint) {
    return [
      { time: "Hace 1 hr", event: "Estancia en Taller ZAM", desc: `Orden de reparación activa por mantenimiento preventivo. Costo acumulado del mes: ${formatUSD(t.costoManttoMensual)} USD.` },
      { time: "Hace 3 hrs", event: "Lectura de Diagnóstico OBD", desc: `Conector telemático Samsara reporta códigos de falla limpios. Unidad en fila de egreso.` },
    ];
  }

  // Active
  return [
    { time: "Hace 14 min", event: "Actualización de GPS", desc: `Unidad #${t.economico} en ruta. Velocidad promedio: 82 km/h | Conductor: ${t.conductor} | BU: ${t.unidadNegocio}` },
    { time: "Hace 1 hr", event: "Transmisión de Odómetro", desc: `Samsara OBD reporta lectura acumulada de ${(t.kmRecorridos || 0).toLocaleString()} km en el mes.` },
    { time: "Hace 3 hrs", event: "Consumo y Rendimiento", desc: `Rendimiento de combustible óptimo registrado: ${t.rendimiento || 0} km/L.` },
    { time: "Hace 5 hrs", event: "Score de Seguridad", desc: `Monitoreo de conducción activa: score de seguridad en ${((t.scoreSeguridad || 0)*100).toFixed(2)}% de incidencias por km.` },
  ];
};

function getTractoCapacityMetrics(t: Tracto) {
  const seed = parseInt(t.economico.replace(/\D/g, "")) || 1;
  const bu = (t.unidadNegocio || "").toUpperCase();
  const isTanqueOrFull = bu.includes("REFINADO") || bu.includes("LUBRICANTES") || bu.includes("BULKMATIC");
  const isDedicado = bu.includes("BACHOCO");
  
  let nominal = 35; // Tons
  if (isTanqueOrFull) {
    nominal = 40;
  } else if (isDedicado) {
    nominal = 30;
  }

  const pct = 60 + (seed % 36); // 60% to 95%
  const real = parseFloat((nominal * (pct / 100)).toFixed(1));

  return {
    pct,
    nominal: `${nominal} TN`,
    real: `${real} TN`
  };
}

function EstructuraTractos({
  units,
  fleetTractos,
}: {
  units: BusinessUnit[];
  fleetTractos: Tracto[];
}) {
  const activeUnits = units.filter((u) => u.active);

  const rows = activeUnits.map((u) => {
    const uTractos = fleetTractos.filter((t) => (t.unidadNegocio || "").toUpperCase() === (u.name || "").toUpperCase());
    const activos = uTractos.filter((t) => t.estado === "Activo").length;
    const inactivos = uTractos.filter((t) => t.estado === "Inactivo").length;
    const mantto = uTractos.filter((t) => t.estado === "Mantenimiento").length;

    return {
      nombre: u.name,
      operacion: u.operation_type,
      activos,
      inactivos,
      mantto,
      total: activos + inactivos + mantto,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.activos += row.activos;
      acc.inactivos += row.inactivos;
      acc.mantto += row.mantto;
      acc.total += row.total;
      return acc;
    },
    { activos: 0, inactivos: 0, mantto: 0, total: 0 }
  );

  return (
    <div className="rounded-xl border bg-card/40 backdrop-blur-md p-5 shadow-sm space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-primary dark:text-primary-glow">
            Estructura de Tractocamiones
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Distribución de los 280+ tractocamiones por Unidad de Negocio</p>
        </div>
        <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">
          {totals.total} Total
        </span>
      </div>

      {/* Mini Summary counters */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-muted/40 p-2 rounded-lg border">
        <div className="space-y-0.5">
          <span className="text-muted-foreground block uppercase font-semibold">Activos</span>
          <span className="font-bold text-success text-xs tabular-nums">{totals.activos}</span>
        </div>
        <div className="space-y-0.5 border-x">
          <span className="text-muted-foreground block uppercase font-semibold">Mantenimiento</span>
          <span className="font-bold text-warning text-xs tabular-nums">{totals.mantto}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground block uppercase font-semibold">Inactivos</span>
          <span className="font-bold text-destructive text-xs tabular-nums">{totals.inactivos}</span>
        </div>
      </div>

      {/* Visual Rows */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {rows.map((row) => {
          const total = row.total;
          const activePct = total ? (row.activos / total) * 100 : 0;
          const manttoPct = total ? (row.mantto / total) * 100 : 0;
          const inactivePct = total ? (row.inactivos / total) * 100 : 0;

          return (
            <div key={row.nombre} className="space-y-1.5 border-b pb-2 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between text-xs">
                {/* BU Name & operation label */}
                <div className="truncate max-w-[200px] flex items-center gap-1.5">
                  <span className="font-bold text-foreground text-[11px] truncate">{row.nombre}</span>
                  <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.2 rounded font-semibold uppercase shrink-0">
                    {row.operacion}
                  </span>
                </div>

                {/* Quantitative breakdown numbers */}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0 font-medium">
                  {row.activos > 0 && <span className="text-success tabular-nums">{row.activos}a</span>}
                  {row.mantto > 0 && <span className="text-warning tabular-nums">{row.mantto}m</span>}
                  {row.inactivos > 0 && <span className="text-destructive tabular-nums">{row.inactivos}i</span>}
                  <span className="font-bold text-foreground tabular-nums ml-1">Total: {total}</span>
                </div>
              </div>

              {/* Segmented health bar */}
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex shadow-inner relative group cursor-help">
                {row.activos > 0 && (
                  <div
                    className="h-full bg-success transition-all duration-500 hover:brightness-110"
                    style={{ width: `${activePct}%` }}
                    title={`${row.activos} Activos (${Math.round(activePct)}%)`}
                  />
                )}
                {row.mantto > 0 && (
                  <div
                    className="h-full bg-warning transition-all duration-500 hover:brightness-110 animate-pulse-slow"
                    style={{ width: `${manttoPct}%` }}
                    title={`${row.mantto} Mantenimiento (${Math.round(manttoPct)}%)`}
                  />
                )}
                {row.inactivos > 0 && (
                  <div
                    className="h-full bg-destructive transition-all duration-500 hover:brightness-110"
                    style={{ width: `${inactivePct}%` }}
                    title={`${row.inactivos} Inactivos (${Math.round(inactivePct)}%)`}
                  />
                )}
                {total === 0 && (
                  <div className="h-full w-full bg-muted-foreground/10 border border-dashed" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TractosPage() {
  const [tractos, setTractos] = useState<Tracto[]>(getTractos());
  const [businessUnits] = useState(getBusinessUnits());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBU, setSelectedBU] = useState<string>("TODAS");
  const [selectedEstado, setSelectedEstado] = useState<string>("TODOS");
  const [selectedTracto, setSelectedTracto] = useState<Tracto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState({
    placa: true,
    unidadNegocio: true,
    modeloConductor: true,
    estado: true,
    utilizacion: true,
    kmCargados: true,
    viajes: true,
    ventaKm: true,
    rendimiento: true,
    scoreSeguridad: true,
    utilidadReal: true,
    capacidad: true,
  });

  useEffect(() => {
    const handleUpdate = () => {
      setTractos(getTractos());
    };
    window.addEventListener("fleet-data-updated", handleUpdate);
    return () => window.removeEventListener("fleet-data-updated", handleUpdate);
  }, []);

  // Filter logic
  const filteredTractos = tractos.filter((t) => {
    const matchesSearch =
      (t.economico || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.placa || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.modelo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.conductor || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBU = selectedBU === "TODAS" || (t.unidadNegocio || "").toUpperCase() === selectedBU.toUpperCase();
    const matchesEstado = selectedEstado === "TODOS" || t.estado === selectedEstado;

    return matchesSearch && matchesBU && matchesEstado;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "No. Economico",
      "Placa",
      "Modelo",
      "Conductor",
      "Unidad de Negocio",
      "Estado",
      "Utilizacion (%)",
      "Km Cargados (%)",
      "Viajes",
      "Venta por Km",
      "Costo por Km",
      "Rendimiento (km/L)",
      "Score Seguridad",
      "Utilidad Real (USD)",
      "Km Recorridos",
    ];

    const csvRows = [
      headers.join(","),
      ...filteredTractos.map((t) =>
        [
          `"${t.economico}"`,
          `"${t.placa}"`,
          `"${t.modelo}"`,
          `"${t.conductor}"`,
          `"${t.unidadNegocio}"`,
          `"${t.estado}"`,
          t.utilizacion,
          t.kmCargadosPct,
          t.viajesMes,
          t.ventaPorKm,
          t.costoPorKm,
          t.rendimiento,
          t.scoreSeguridad,
          t.utilidadReal,
          t.kmRecorridos,
        ].join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fleet_tractos_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowClick = (t: Tracto) => {
    setSelectedTracto(t);
    setIsDrawerOpen(true);
  };

  // Generate dynamic historical chart data for the selected tracto
  const getHistoricalData = (t: Tracto) => {
    const months = ["Mar", "Abr", "May", "Jun", "Jul", "Ago"];
    return months.map((month, index) => {
      const multiplier = 0.9 + (index * 0.04) + (Math.sin(index) * 0.05);
      return {
        mes: month,
        utilizacion: Math.min(100, Math.round(t.utilizacion * multiplier)),
        kmCargados: Math.min(100, Math.round(t.kmCargadosPct * (0.95 + Math.cos(index) * 0.05))),
        utilidad: Math.round(t.utilidadReal * multiplier),
      };
    });
  };

      // Alertas críticas de Tractos
      const criticalTractosMaint = tractos
        .filter((t) => t.estado === "Mantenimiento" || t.estado === "Inactivo")
        .slice(0, 5);

      const criticalTractosLowPerf = tractos
        .filter((t) => t.estado === "Activo" && t.utilizacion < 80)
        .sort((a, b) => a.utilizacion - b.utilizacion)
        .slice(0, 5);

      return (
        <div className="container mx-auto px-4 py-6 max-w-[1400px] space-y-6">
          {/* Title & Actions */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">Tractocamiones</h1>
              <p className="text-muted-foreground text-sm">Inventario centralizado y métricas telemáticas individuales de la flota de 280+ Tractocamiones.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
              </Button>
              <Button variant="gold" size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Agregar Tractocamión
              </Button>
            </div>
          </header>

          <EstructuraTractos units={businessUnits} fleetTractos={tractos} />

          {/* Alertas Críticas (Diagnóstico) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Alertas Mecánicas */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-md p-5 shadow-[var(--shadow-card)] space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-border/80">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-warning/10 text-warning">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Alertas Mecánicas e Inactividad</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Unidades actualmente inactivas o en mantenimiento en taller ZAM</p>
                  </div>
                </div>
                <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-bold">
                  {tractos.filter(t => t.estado === "Mantenimiento" || t.estado === "Inactivo").length} Críticas
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {criticalTractosMaint.length > 0 ? (
                  criticalTractosMaint.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleRowClick(t)}
                      className="flex items-center justify-between py-2.5 hover:bg-muted/40 px-2 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="font-black text-xs text-foreground bg-muted px-2 py-1 rounded border group-hover:border-primary/45 transition-colors">
                          #{t.economico}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{t.conductor || "Sin Conductor Asignado"}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{t.unidadNegocio} | {t.modelo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-foreground">
                            {t.costoManttoMensual > 0 ? `${formatUSD(t.costoManttoMensual)} USD` : "Sin costo"}
                          </p>
                          <p className="text-[8px] text-muted-foreground">Mantenimiento</p>
                        </div>
                        <StatusBadge estado={t.estado} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">No hay unidades críticas registradas.</p>
                )}
              </div>
            </div>

            {/* Card 2: Alertas de Baja Utilización */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-md p-5 shadow-[var(--shadow-card)] space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-border/80">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Alertas de Baja Utilización</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Unidades activas operando por debajo de la meta del 80%</p>
                  </div>
                </div>
                <span className="text-[10px] bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full font-bold">
                  {tractos.filter(t => t.estado === "Activo" && t.utilizacion < 80).length} En Riesgo
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {criticalTractosLowPerf.length > 0 ? (
                  criticalTractosLowPerf.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleRowClick(t)}
                      className="flex items-center justify-between py-2.5 hover:bg-muted/40 px-2 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="font-black text-xs text-foreground bg-muted px-2 py-1 rounded border group-hover:border-primary/45 transition-colors">
                          #{t.economico}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{t.conductor || "Sin Conductor Asignado"}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{t.unidadNegocio} | {t.modelo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="w-24 space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-medium">
                            <span className="text-muted-foreground">Utilización</span>
                            <span className="text-destructive font-bold">{t.utilizacion}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-destructive" style={{ width: `${t.utilizacion}%` }} />
                          </div>
                        </div>
                        <span className="text-[9px] bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded font-medium">
                          {t.utilizacion}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">Todas las unidades activas cumplen la meta de utilización.</p>
                )}
              </div>
            </div>
          </div>

      {/* Filter Toolbar */}
      <section className="bg-card border rounded-xl p-4 shadow-[var(--shadow-card)] flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por eco, placa, conductor o modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Unidad de Negocio:</span>
          <select
            value={selectedBU}
            onChange={(e) => setSelectedBU(e.target.value)}
            className="bg-background border rounded-lg text-xs h-9 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="TODAS">TODAS</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.name}>
                {bu.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Estatus:</span>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="bg-background border rounded-lg text-xs h-9 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="TODOS">TODOS</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Mantenimiento">Mantenimiento</option>
          </select>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Density Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompact(!isCompact)}
            className="h-9 text-xs px-3"
            title="Alternar entre vista compacta y normal"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            {isCompact ? "Normal" : "Compacta"}
          </Button>

          {/* Column Customizer Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3">
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Columnas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Visualizar Columnas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.placa}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, placa: checked })}
              >
                Placa
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.unidadNegocio}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, unidadNegocio: checked })}
              >
                Unidad de Negocio
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.modeloConductor}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, modeloConductor: checked })}
              >
                Modelo / Conductor
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.estado}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, estado: checked })}
              >
                Estado / Telemetría
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.utilizacion}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, utilizacion: checked })}
              >
                Utilización
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.kmCargados}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, kmCargados: checked })}
              >
                Km Cargados
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.viajes}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, viajes: checked })}
              >
                Viajes
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.ventaKm}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, ventaKm: checked })}
              >
                $/km Venta
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.rendimiento}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, rendimiento: checked })}
              >
                Rendimiento (km/L)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.scoreSeguridad}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, scoreSeguridad: checked })}
              >
                Score Seguridad
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.utilidadReal}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, utilidadReal: checked })}
              >
                Utilidad Real
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.capacidad}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, capacidad: checked })}
              >
                Capacidad Real
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(searchTerm !== "" || selectedBU !== "TODAS" || selectedEstado !== "TODOS") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedBU("TODAS");
              setSelectedEstado("TODOS");
            }}
            className="text-xs h-9 px-2 hover:bg-muted"
          >
            <X className="h-3 w-3 mr-1" /> Limpiar filtros
          </Button>
        )}
      </section>

      {/* High-density Table */}
      <section className="rounded-xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b">
              <tr>
                <th className={cn("text-left font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Económico</th>
                {visibleColumns.placa && <th className={cn("text-left font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Placa</th>}
                {visibleColumns.unidadNegocio && <th className={cn("text-left font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Unidad de Negocio</th>}
                {visibleColumns.modeloConductor && <th className={cn("text-left font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Modelo / Conductor</th>}
                {visibleColumns.estado && <th className={cn("text-center font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Estado / Telemetría</th>}
                {visibleColumns.utilizacion && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Utilización</th>}
                {visibleColumns.kmCargados && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Km Cargados</th>}
                {visibleColumns.viajes && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Viajes</th>}
                {visibleColumns.ventaKm && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>$/km Venta</th>}
                {visibleColumns.rendimiento && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Rend. (km/L)</th>}
                {visibleColumns.scoreSeguridad && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Score Seg.</th>}
                {visibleColumns.utilidadReal && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Utilidad Real</th>}
                {visibleColumns.capacidad && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-4 py-3")}>Capacidad Real</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTractos.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center py-8 text-muted-foreground italic">
                    No se encontraron tractos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredTractos.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => handleRowClick(t)}
                    className={cn(
                      "border-t hover:bg-primary/5 transition-all cursor-pointer",
                      isCompact ? "text-xs" : "text-sm"
                    )}
                  >
                    <td className={cn("font-bold text-primary", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                      <div className="flex items-center gap-1.5">
                        <span>#{t.economico}</span>
                        <span className="text-[9px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded font-extrabold tracking-wider uppercase shrink-0">
                          Tractocamión
                        </span>
                      </div>
                    </td>
                    {visibleColumns.placa && (
                      <td className={cn("font-semibold", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        {t.placa}
                      </td>
                    )}
                    {visibleColumns.unidadNegocio && (
                      <td className={cn("text-muted-foreground text-xs", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        {t.unidadNegocio}
                      </td>
                    )}
                    {visibleColumns.modeloConductor && (
                      <td className={cn(isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        <div className="font-semibold text-foreground">{t.modelo}</div>
                        {!isCompact && <div className="text-[10px] text-muted-foreground mt-0.5">{t.conductor}</div>}
                      </td>
                    )}
                    {visibleColumns.estado && (
                      <td className={cn("text-center", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        <div className="flex items-center justify-center gap-1.5">
                          <StatusBadge estado={t.estado} />
                          {t.estado === "Activo" && (
                            <span title="Samsara: Telemetría en vivo">
                              <Wifi className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                            </span>
                          )}
                          {t.estado === "Mantenimiento" && (
                            <span title="ZAM: En Mantenimiento">
                              <Wrench className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                          {t.estado === "Inactivo" && (
                            <span title="Patio: Fuera de servicio">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.utilizacion && (
                      <td className={cn("text-right font-medium", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold tabular-nums text-foreground">{t.utilizacion}%</span>
                          <div className="w-14 h-1 bg-muted rounded-full overflow-hidden mt-1">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                t.utilizacion >= 85 ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" :
                                t.utilizacion >= 70 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${t.utilizacion}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.kmCargados && (
                      <td className={cn("text-right font-medium", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-blue-500 dark:text-blue-400 tabular-nums">{t.kmCargadosPct}%</span>
                          <div className="w-14 h-1 bg-muted rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]"
                              style={{ width: `${t.kmCargadosPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.viajes && (
                      <td className={cn("text-right font-medium tabular-nums", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        {t.viajesMes}
                      </td>
                    )}
                    {visibleColumns.ventaKm && (
                      <td className={cn("text-right font-medium tabular-nums text-foreground/90", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        ${(t.ventaPorKm || 0).toFixed(2)}
                      </td>
                    )}
                    {visibleColumns.rendimiento && (
                      <td className={cn("text-right font-medium tabular-nums", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        <div className="inline-flex items-center justify-end">
                          <span>{t.rendimiento > 0 ? `${t.rendimiento}` : "—"}</span>
                          {t.rendimiento > 0 && (
                            <Sparkline
                              values={getSparklineValues(t.id, "rendimiento")}
                              strokeColor={t.rendimiento >= 2.5 ? "#10B981" : "#F59E0B"}
                            />
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.scoreSeguridad && (
                      <td className={cn("text-right font-medium tabular-nums", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              t.scoreSeguridad <= 0.08 ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" :
                              t.scoreSeguridad <= 0.15 ? "bg-amber-500" : "bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.6)] animate-pulse"
                            )}
                          />
                          <span>{(t.scoreSeguridad || 0) > 0 ? `${((t.scoreSeguridad || 0) * 100).toFixed(2)}%` : "0.0%"}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.utilidadReal && (
                      <td
                        className={cn(
                          "text-right font-bold tabular-nums",
                          t.utilidadReal < 0 ? "text-destructive" : "text-success",
                          isCompact ? "px-2 py-1.5" : "px-4 py-3"
                        )}
                      >
                        <div className="inline-flex items-center justify-end">
                          <span>{formatUSD(t.utilidadReal)}</span>
                          {t.utilidadReal > 0 && (
                            <Sparkline
                              values={getSparklineValues(t.id, "utilidad")}
                              strokeColor="#10B981"
                            />
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.capacidad && (
                      <td className={cn("text-right font-medium", isCompact ? "px-2 py-1.5" : "px-4 py-3")}>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-foreground tabular-nums">{getTractoCapacityMetrics(t).pct}%</span>
                          <span className="text-[10px] text-muted-foreground">{getTractoCapacityMetrics(t).real} / {getTractoCapacityMetrics(t).nominal}</span>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lateral Ficha Detail Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-md md:max-w-xl overflow-y-auto p-6 space-y-6">
          {selectedTracto && (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold text-primary flex items-center gap-2">
                      <span>Tractocamión #{selectedTracto.economico}</span>
                      <span className="text-[9px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded font-extrabold tracking-wider uppercase">
                        Tractocamión
                      </span>
                    </SheetTitle>
                    <SheetDescription>
                      Placa: {selectedTracto.placa} | {selectedTracto.modelo}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* General details list */}
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Tipo de Vehículo:</span>
                  <p className="font-semibold text-foreground mt-0.5">Tractocamión (Tractor)</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Unidad de Negocio:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedTracto.unidadNegocio}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Conductor Asignado:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedTracto.conductor}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estado Operativo:</span>
                  <div className="mt-1">
                    <StatusBadge estado={selectedTracto.estado} />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Kilómetros Recorridos:</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {(selectedTracto.kmRecorridos || 0).toLocaleString()} km
                  </p>
                </div>
              </div>

              {/* Primary KPIs Cards inside drawer */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded-lg p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-primary" /> Utilización
                  </span>
                  <p className="text-lg font-bold text-foreground">{selectedTracto.utilizacion}%</p>
                </div>
                <div className="border rounded-lg p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-success" /> Rendimiento
                  </span>
                  <p className="text-lg font-bold text-foreground">
                    {selectedTracto.rendimiento > 0 ? `${selectedTracto.rendimiento} km/L` : "—"}
                  </p>
                </div>
                <div className="border rounded-lg p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-warning" /> Seguridad
                  </span>
                  <p className="text-lg font-bold text-foreground">
                    {(selectedTracto.scoreSeguridad || 0) > 0
                      ? `${((selectedTracto.scoreSeguridad || 0) * 100).toFixed(2)}%`
                      : "0.0%"}
                  </p>
                </div>
              </div>

              {/* Capacidad Real vs Nominal Section */}
              <div className="border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Análisis de Capacidad Carga Real vs Nominal</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-dashed pb-1.5">
                    <span className="text-muted-foreground">Capacidad Nominal Máxima:</span>
                    <span className="font-semibold">{getTractoCapacityMetrics(selectedTracto).nominal}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1.5">
                    <span className="text-muted-foreground">Carga Real Promedio:</span>
                    <span className="font-semibold text-foreground">{getTractoCapacityMetrics(selectedTracto).real}</span>
                  </div>
                  <div className="space-y-1 pt-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Eficiencia de Carga Promedio:</span>
                      <span className={cn(
                        "font-bold",
                        getTractoCapacityMetrics(selectedTracto).pct >= 85 ? "text-emerald-500" :
                        getTractoCapacityMetrics(selectedTracto).pct >= 70 ? "text-amber-500" : "text-rose-500"
                      )}>{getTractoCapacityMetrics(selectedTracto).pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          getTractoCapacityMetrics(selectedTracto).pct >= 85 ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" :
                          getTractoCapacityMetrics(selectedTracto).pct >= 70 ? "bg-amber-500" : "bg-rose-500"
                        )}
                        style={{ width: `${getTractoCapacityMetrics(selectedTracto).pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t text-xs">
                    <span className="text-muted-foreground">Viajes Realizados:</span>
                    <span className="font-semibold">{selectedTracto.viajesMes} viajes / 25 esperados</span>
                  </div>
                </div>
              </div>

              {/* Financial comparison details */}
              <div className="border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Detalle Financiero del Mes</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span className="text-muted-foreground">Ingresos (Venta/km × km):</span>
                    <span className="font-semibold tabular-nums">
                      {formatUSD(selectedTracto.ventaPorKm * selectedTracto.kmRecorridos)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span className="text-muted-foreground">Tarifa Venta/km:</span>
                    <span className="font-medium tabular-nums">${(selectedTracto.ventaPorKm || 0).toFixed(2)} /km</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span className="text-muted-foreground">Costo Operativo/km:</span>
                    <span className="font-medium tabular-nums">${(selectedTracto.costoPorKm || 0).toFixed(2)} /km</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1 text-destructive">
                    <span>Mantenimiento del mes:</span>
                    <span className="font-semibold tabular-nums">{formatUSD(selectedTracto.costoManttoMensual)}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1 text-destructive">
                    <span>Combustible excedente:</span>
                    <span className="font-semibold tabular-nums">{formatUSD(selectedTracto.combustibleExcedenteCosto)}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-success text-base">
                    <span>Utilidad Real:</span>
                    <span className={selectedTracto.utilidadReal < 0 ? "text-destructive" : "text-success"}>
                      {formatUSD(selectedTracto.utilidadReal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recharts charts for historical metrics */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Histórico: Utilización (%)</h4>
                  <div className="h-40 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getHistoricalData(selectedTracto)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="utilizacion"
                          name="% Utilización"
                          stroke="#1E40AF"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="kmCargados"
                          name="% Km Cargados"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-success">Histórico: Utilidad ($ USD)</h4>
                  <div className="h-40 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getHistoricalData(selectedTracto)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v / 1000}k`} />
                        <Tooltip formatter={(v: number) => formatUSD(v)} />
                        <Bar dataKey="utilidad" name="Utilidad ($)" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Samsara Telemetry Logs (Live Timeline Feed) */}
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Bitácora de Telemetría en Tiempo Real
                </h3>
                <div className="space-y-4 pl-3.5 border-l border-primary/20 relative ml-1">
                  {getRecentTelemetryEvents(selectedTracto).map((ev, i) => (
                    <div key={i} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[22px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[8px] font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="flex items-center justify-between text-muted-foreground font-semibold">
                        <span className="text-foreground font-bold">{ev.event}</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal text-foreground">
                          {ev.time}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 font-normal leading-relaxed">{ev.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct links to external/internal portals */}
              <div className="grid grid-cols-2 gap-2 border-t pt-4">
                <a
                  href={`https://cloud.samsara.com/o/5004562/fleet/reports/activity?tags%5B%5D=4839758`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 bg-primary text-primary-foreground py-2 px-3 rounded-lg text-xs font-semibold hover:bg-primary/95 transition-all"
                >
                  Ver en Samsara <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`http://10.0.0.25:9081/MANTENIMIENTONET2024/ed_i_orden_reparacion/ed_i_mtto_listado_orden_de_mantenimiento.aspx`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 bg-muted border text-foreground py-2 px-3 rounded-lg text-xs font-semibold hover:bg-muted/80 transition-all"
                >
                  Reparaciones ZAM <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

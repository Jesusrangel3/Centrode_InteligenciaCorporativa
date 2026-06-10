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
  getRemolques,
  getBusinessUnits,
  formatUSD,
  Remolque,
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
  Container,
  Activity,
  Wrench,
  Clock,
  TrendingUp,
  ExternalLink,
  Wifi,
  Droplet,
  Layers,
  Snowflake,
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
} from "recharts";

export const Route = createFileRoute("/remolques")({
  head: () => ({
    meta: [
      { title: "Gestión de Remolques — Centro de Inteligencia Corporativa" },
      { name: "description", content: "Administración y monitoreo de la flota de remolques, cajas secas y cisternas." },
    ],
  }),
  component: RemolquesPage,
});

// Deterministic simulated recent telemetry logs for each trailer type
const getTrailerTelemetryEvents = (r: Remolque) => {
  const isMaint = r.estado === "Mantenimiento";
  const isInact = r.estado === "Inactivo";
  const tipo = (r.tipo || "").toLowerCase();
  const isReefer = tipo.includes("refrigerado");
  const isCisterna = tipo.includes("cisterna") || tipo.includes("tanque");

  if (isInact) {
    return [
      { time: "Hace 3 hrs", event: "Apagado del Motor", desc: `Remolque #${r.economico} en resguardo. Ubicación: Patio principal de ${r.unidadNegocio}.` },
      { time: "Hace 5 hrs", event: "Desacoplamiento Detectado", desc: `Remolque liberado de tractocamión. Estatus: Disponible.` },
    ];
  }
  
  if (isMaint) {
    return [
      { time: "Hace 1 hr", event: "Estancia en Taller ZAM", desc: `Remolque en taller por reparación preventiva. Días acumulados en taller: ${r.diasTaller} días.` },
      { time: "Hace 4 hrs", event: "Inspección de Seguridad", desc: `Revisión de frenos ABS, luces traseras y suspensión neumática aprobada.` },
    ];
  }

  // Active
  if (isReefer) {
    return [
      { time: "Hace 10 min", event: "Sensor de Temperatura", desc: `Cámara térmica #${r.economico}: 2.2°C (Setpoint: 2.0°C) | Modo Continuo | Utilización: ${r.utilizacion}%` },
      { time: "Hace 1 hr", event: "Deshielo Automático", desc: `Ciclo de deshielo (Defrost) completado con éxito. Odométrico: ${(r.kmRecorridos || 0).toLocaleString()} km.` },
      { time: "Hace 3 hrs", event: "Lectura del Odométrico", desc: `Samsara GPS reporta viajes activos: ${r.viajesMes} viajes en el mes.` },
    ];
  }

  if (isCisterna) {
    return [
      { time: "Hace 15 min", event: "Presión Hidrostática", desc: `Cisterna #${r.economico}: Válvula de alivio cerrada. Presión interna: 1.2 bar | Nivel: 95%` },
      { time: "Hace 2 hrs", event: "Inspección de Domos", desc: `Cierre hermético de domos verificado. Sello de seguridad: #AA-${8900 + ((r.kmRecorridos || 0) % 99)}` },
      { time: "Hace 4 hrs", event: "Carga de Refinado", desc: `Carga completada en Terminal de Almacenamiento. Odómetro: ${(r.kmRecorridos || 0).toLocaleString()} km.` },
    ];
  }

  return [
    { time: "Hace 20 min", event: "Actualización de Telemetría", desc: `Remolque #${r.economico} reporta acoplamiento óptimo. Utilización activa del mes: ${r.utilizacion}%.` },
    { time: "Hace 3 hrs", event: "Sensor de ABS", desc: `Frenos antibloqueo (ABS) reportados como óptimos por sensor telemático.` },
    { time: "Hace 6 hrs", event: "Reporte de Actividad", desc: `Odómetro acumulado del mes: ${(r.kmRecorridos || 0).toLocaleString()} km con ${r.viajesMes} viajes completados.` },
  ];
};

function EstructuraRemolques({
  units,
  fleetRemolques,
}: {
  units: BusinessUnit[];
  fleetRemolques: Remolque[];
}) {
  const activeUnits = units.filter((u) => u.active);

  const rows = activeUnits.map((u) => {
    const uRemolques = fleetRemolques.filter((r) => (r.unidadNegocio || "").toUpperCase() === (u.name || "").toUpperCase());
    const activos = uRemolques.filter((r) => r.estado === "Activo").length;
    const inactivos = uRemolques.filter((r) => r.estado === "Inactivo").length;
    const mantto = uRemolques.filter((r) => r.estado === "Mantenimiento").length;

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
            Estructura de Remolques
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Distribución proporcional por Unidad de Negocio</p>
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

function RemolquesPage() {
  const [remolques, setRemolques] = useState<Remolque[]>(getRemolques());
  const [businessUnits] = useState(getBusinessUnits());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBU, setSelectedBU] = useState<string>("TODAS");
  const [selectedEstado, setSelectedEstado] = useState<string>("TODOS");
  const [selectedRemolque, setSelectedRemolque] = useState<Remolque | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState({
    placa: true,
    tipo: true,
    unidadNegocio: true,
    estado: true,
    utilizacion: true,
    kmRecorridos: true,
    diasTaller: true,
    costoMantto: true,
  });

  useEffect(() => {
    const handleUpdate = () => {
      setRemolques(getRemolques());
    };
    window.addEventListener("fleet-data-updated", handleUpdate);
    return () => window.removeEventListener("fleet-data-updated", handleUpdate);
  }, []);

  // Filter logic
  const filteredRemolques = remolques.filter((r) => {
    const matchesSearch =
      (r.economico || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.placa || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tipo || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBU = selectedBU === "TODAS" || (r.unidadNegocio || "").toUpperCase() === selectedBU.toUpperCase();
    const matchesEstado = selectedEstado === "TODOS" || r.estado === selectedEstado;

    return matchesSearch && matchesBU && matchesEstado;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "No. Economico",
      "Placa",
      "Tipo",
      "Estado",
      "Unidad de Negocio",
      "Utilizacion (%)",
      "Km Recorridos",
      "Dias en Taller",
      "Costo Mantto por Km (USD)",
    ];

    const csvRows = [
      headers.join(","),
      ...filteredRemolques.map((r) =>
        [
          `"${r.economico}"`,
          `"${r.placa}"`,
          `"${r.tipo}"`,
          `"${r.estado}"`,
          `"${r.unidadNegocio}"`,
          r.utilizacion,
          r.kmRecorridos,
          r.diasTaller,
          r.costoKmMantto,
        ].join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fleet_remolques_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowClick = (r: Remolque) => {
    setSelectedRemolque(r);
    setIsDrawerOpen(true);
  };

  // Generate historical data
  const getHistoricalData = (r: Remolque) => {
    const months = ["Mar", "Abr", "May", "Jun", "Jul", "Ago"];
    return months.map((month, index) => {
      const multiplier = 0.92 + (index * 0.03) + (Math.sin(index) * 0.04);
      return {
        mes: month,
        utilizacion: Math.min(100, Math.round(r.utilizacion * multiplier)),
        kmRecorridos: Math.round(r.kmRecorridos * multiplier),
      };
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1400px] space-y-6">
      {/* Title & Actions */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Remolques</h1>
          <p className="text-muted-foreground text-sm">Monitoreo operativo y control de mantenimiento de remolques, refrigerados y tanques.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
          </Button>
          <Button variant="gold" size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Agregar Remolque
          </Button>
        </div>
      </header>

      <EstructuraRemolques units={businessUnits} fleetRemolques={remolques} />

      {/* Filter Toolbar */}
      <section className="bg-card border rounded-xl p-4 shadow-[var(--shadow-card)] flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por eco, placa, tipo..."
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
                checked={visibleColumns.tipo}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, tipo: checked })}
              >
                Tipo Remolque
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.unidadNegocio}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, unidadNegocio: checked })}
              >
                Unidad de Negocio
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
                checked={visibleColumns.kmRecorridos}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, kmRecorridos: checked })}
              >
                Km Recorridos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.diasTaller}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, diasTaller: checked })}
              >
                Días Taller (Mes)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.costoMantto}
                onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, costoMantto: checked })}
              >
                Costo Mantto/Km
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
                <th className={cn("text-left font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Económico</th>
                {visibleColumns.placa && <th className={cn("text-left font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Placa</th>}
                {visibleColumns.tipo && <th className={cn("text-left font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Tipo Remolque</th>}
                {visibleColumns.unidadNegocio && <th className={cn("text-left font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Unidad de Negocio</th>}
                {visibleColumns.estado && <th className={cn("text-center font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Estado / Telemetría</th>}
                {visibleColumns.utilizacion && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Utilización</th>}
                {visibleColumns.kmRecorridos && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Km Recorridos</th>}
                {visibleColumns.diasTaller && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Días Taller (Mes)</th>}
                {visibleColumns.costoMantto && <th className={cn("text-right font-bold", isCompact ? "px-2 py-2" : "px-5 py-3")}>Costo Mantto/Km</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRemolques.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center py-8 text-muted-foreground italic">
                    No se encontraron remolques con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRemolques.map((r) => {
                  const isReefer = (r.tipo || "").toLowerCase().includes("refrigerado");
                  const isCisterna = (r.tipo || "").toLowerCase().includes("cisterna") || (r.tipo || "").toLowerCase().includes("tanque");
                  const isCaja = (r.tipo || "").toLowerCase().includes("caja") || (r.tipo || "").toLowerCase().includes("seco");
                  const isPlataforma = (r.tipo || "").toLowerCase().includes("plataforma") || (r.tipo || "").toLowerCase().includes("tolva");

                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleRowClick(r)}
                      className={cn(
                        "border-t hover:bg-primary/5 transition-all cursor-pointer",
                        isCompact ? "text-xs" : "text-sm"
                      )}
                    >
                      <td className={cn("font-bold text-primary", isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                        #{r.economico}
                      </td>
                      {visibleColumns.placa && (
                        <td className={cn("font-semibold", isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                          {r.placa}
                        </td>
                      )}
                      {visibleColumns.tipo && (
                        <td className={cn(isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                          <div className="flex items-center gap-1.5">
                            {isReefer && <Snowflake className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                            {isCisterna && <Droplet className="h-3.5 w-3.5 text-cyan-500 shrink-0" />}
                            {isCaja && <Container className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                            {isPlataforma && <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
                            {!isReefer && !isCisterna && !isCaja && !isPlataforma && <Container className="h-3.5 w-3.5 text-primary shrink-0" />}
                            
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{r.tipo}</span>
                              {isReefer && !isCompact && (
                                <span className="text-[9px] text-blue-500 font-bold mt-0.5 animate-pulse bg-blue-50/50 dark:bg-blue-950/20 px-1 rounded w-fit">
                                  ❄️ 2.2°C (OK)
                                </span>
                              )}
                              {isCisterna && !isCompact && (
                                <span className="text-[9px] text-cyan-500 font-bold mt-0.5 bg-cyan-50/50 dark:bg-cyan-950/20 px-1 rounded w-fit">
                                  💧 Presión: 1.2 bar
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.unidadNegocio && (
                        <td className={cn("text-muted-foreground text-xs", isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                          {r.unidadNegocio}
                        </td>
                      )}
                      {visibleColumns.estado && (
                        <td className={cn("text-center", isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                          <div className="flex items-center justify-center gap-1.5">
                            <StatusBadge estado={r.estado} />
                            {r.estado === "Activo" && (
                              <span title="Dispositivo GPS Activo">
                                <Wifi className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                              </span>
                            )}
                            {r.estado === "Mantenimiento" && (
                              <span title="Taller: OR abierta">
                                <Wrench className="h-3.5 w-3.5 text-amber-500" />
                              </span>
                            )}
                            {r.estado === "Inactivo" && (
                              <span title="Patio: Fuera de servicio">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.utilizacion && (
                        <td className={cn("text-right font-medium", isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                          <div className="flex flex-col items-end">
                            <span className="font-semibold tabular-nums text-foreground">{r.utilizacion}%</span>
                            <div className="w-14 h-1 bg-muted rounded-full overflow-hidden mt-1">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  r.utilizacion >= 80 ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" :
                                  r.utilizacion >= 65 ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${r.utilizacion}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.kmRecorridos && (
                        <td className={cn("text-right font-semibold tabular-nums", isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                          {(r.kmRecorridos || 0).toLocaleString()} km
                        </td>
                      )}
                      {visibleColumns.diasTaller && (
                        <td className={cn("text-right font-medium tabular-nums", isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                r.diasTaller <= 2 ? "bg-emerald-500" :
                                r.diasTaller <= 10 ? "bg-amber-500" : "bg-rose-500 animate-pulse"
                              )}
                            />
                            <span className={cn(r.diasTaller > 10 ? "text-destructive font-bold animate-pulse" : "text-foreground")}>
                              {r.diasTaller} días
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.costoMantto && (
                        <td className={cn("text-right font-semibold text-primary tabular-nums", isCompact ? "px-2 py-1.5" : "px-5 py-3")}>
                          {r.costoKmMantto > 0 ? `${formatUSD(r.costoKmMantto)}/km` : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lateral Ficha Detail Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-md md:max-w-xl overflow-y-auto p-6 space-y-6">
          {selectedRemolque && (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Container className="h-6 w-6" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold text-primary">
                      Remolque #{selectedRemolque.economico}
                    </SheetTitle>
                    <SheetDescription>
                      Placa: {selectedRemolque.placa} | {selectedRemolque.tipo}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* General details list */}
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Unidad de Negocio:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedRemolque.unidadNegocio}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tipo de Equipo:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedRemolque.tipo}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estado Operativo:</span>
                  <div className="mt-1">
                    <StatusBadge estado={selectedRemolque.estado} />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Kilómetros Recorridos:</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {(selectedRemolque.kmRecorridos || 0).toLocaleString()} km
                  </p>
                </div>
              </div>

              {/* Primary KPIs Cards inside drawer */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded-lg p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-primary" /> Utilización
                  </span>
                  <p className="text-lg font-bold text-foreground">{selectedRemolque.utilizacion}%</p>
                </div>
                <div className="border rounded-lg p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-warning" /> Días Taller
                  </span>
                  <p className="text-lg font-bold text-foreground">{selectedRemolque.diasTaller} días</p>
                </div>
                <div className="border rounded-lg p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <Wrench className="h-3.5 w-3.5 text-success" /> Costo Mantto
                  </span>
                  <p className="text-base font-bold text-foreground">
                    {selectedRemolque.costoKmMantto > 0 ? `${formatUSD(selectedRemolque.costoKmMantto)}/km` : "—"}
                  </p>
                </div>
              </div>

              {/* Maintenance comparison details */}
              <div className="border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Análisis de Estancia en Taller</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span className="text-muted-foreground">Porcentaje Inactividad Taller:</span>
                    <span className="font-semibold tabular-nums">
                      {((selectedRemolque.diasTaller / 30) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed pb-1">
                    <span className="text-muted-foreground">Disponibilidad Mecánica:</span>
                    <span className="font-semibold text-success tabular-nums">
                      {(100 - (selectedRemolque.diasTaller / 30) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-primary text-sm">
                    <span>Costo total estimado mantenimiento:</span>
                    <span className="font-bold tabular-nums">
                      {formatUSD(selectedRemolque.costoKmMantto * selectedRemolque.kmRecorridos)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recharts chart for utilization */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Histórico: Utilización (%)</h4>
                  <div className="h-40 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getHistoricalData(selectedRemolque)}>
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
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-success">Histórico: Km Recorridos</h4>
                  <div className="h-40 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getHistoricalData(selectedRemolque)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="kmRecorridos"
                          name="Kilómetros"
                          stroke="#10B981"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Samsara & Thermo King Telemetry Logs */}
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Bitácora de Telemetría (Thermo King / GPS)
                </h3>
                <div className="space-y-4 pl-3.5 border-l border-primary/20 relative ml-1">
                  {getTrailerTelemetryEvents(selectedRemolque).map((ev, i) => (
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
                  href={`https://cloud.samsara.com/o/5004562/fleet/reports/activity`}
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
                  Órdenes ZAM <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

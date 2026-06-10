import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getTractos,
  getRemolques,
  getBusinessUnits,
  formatUSD,
  Tracto,
  BusinessUnit,
  Remolque,
} from "@/lib/database";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Percent,
  CheckCircle,
  HelpCircle,
  Flame,
  Sparkles,
  DollarSign,
  Activity,
  Truck,
  Clock,
  Navigation,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/productividad")({
  head: () => ({
    meta: [
      { title: "Análisis de Productividad — Centro de Inteligencia Corporativa" },
      { name: "description", content: "Matriz automatizada de los 5 KPIs de operación de Samsara y ZAM para la identificación de oportunidades de mercado." },
    ],
  }),
  component: ProductividadPage,
});

// Real Samsara tag mapping from Excel/Console tags
const SAMSARA_BU_TAGS: Record<string, string> = {
  "REFINADOS LAZARO": "4242455",
  "REFINADO MINA": "4359948",
  "REFINADOS VERACRUZ": "4358819",
  "BACHOCO LAGOS": "4842492",
  "BACHOCO CELAYA": "4740625",
  "BACHOCO AGUASCALIENTES": "4359944",
  "LUBRICANTES FULL": "4358812",
  "LUBRICANTES JUMBO": "4358457",
  "REFRIGERADOS": "4193734",
  "BULKMATIC": "4842464",
  "REFINADOS POZA RICA": "4739525",
  "BACHOCO PROCESADO": "4359941",
  "BACHOCO CLIENTES": "4359653",
  "DRAGON CARGO": "4358820",
};

// Integration links generators
const getSamsaraAssetUrl = (buName: string) => {
  const tagId = SAMSARA_BU_TAGS[buName];
  if (!tagId) return "https://cloud.samsara.com/o/5004562/fleet/asset?view=0";
  return `https://cloud.samsara.com/o/5004562/fleet/asset?view=0&tags%5B%5D=${tagId}`;
};

const getSamsaraUtilizationUrl = (buName: string) => {
  const tagId = SAMSARA_BU_TAGS[buName];
  if (!tagId) return "https://cloud.samsara.com/o/5004562/fleet/reports/asset/utilization?assetType=Vehicle&duration=60";
  return `https://cloud.samsara.com/o/5004562/fleet/reports/asset/utilization?assetType=Vehicle&tags%5B%5D=${tagId}&duration=60`;
};

const getSamsaraActivityUrl = (buName: string) => {
  const tagId = SAMSARA_BU_TAGS[buName];
  if (!tagId) return "https://cloud.samsara.com/o/5004562/fleet/reports/activity?duration=60";
  return `https://cloud.samsara.com/o/5004562/fleet/reports/activity?tags%5B%5D=${tagId}&duration=60`;
};

const getZamConsultaUnidadesUrl = () => {
  return "http://10.0.0.25:9081/MANTENIMIENTONET2024/ed_i_consultas/ed_i_consulta_de_unidades.aspx";
};

const getZamDespachoViajesUrl = () => {
  return "http://10.0.0.25:9081/Operaciones2024/cnidesp01/cne_i_despviajespordia.aspx";
};

// Recommended goals helpers
const getUtilMetaRange = (opType: string) => {
  if (opType === "Full") return { min: 75, max: 85, label: "75% - 85%" };
  if (opType === "Refrigerado") return { min: 85, max: 95, label: "85% - 95%" };
  if (opType === "Dedicado") return { min: 90, max: 100, label: "> 90%" };
  return { min: 75, max: 85, label: "75% - 85%" }; // Default fallback
};

const getKmLoadedGoal = (buName: string, opType: string) => {
  const name = buName.toUpperCase();
  if (name.includes("REFINADO")) return 50; // Refinados / Tanques
  if (name.includes("LUBRICANTES") || opType === "Full") return 75; // Lubricantes / Full
  if (name.includes("BACHOCO") || opType === "Dedicado") return 90; // Bachoco / Dedicado
  if (name.includes("REFRIGERADOS") || opType === "Refrigerado") return 95; // Refrigerados
  return 50; // Default fallback
};

function ProductividadPage() {
  const [tractos, setTractos] = useState<Tracto[]>(getTractos());
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>(getBusinessUnits());
  const [remolques, setRemolques] = useState<Remolque[]>(getRemolques());
  
  // Collapsible detailed BU list
  const [expandedBU, setExpandedBU] = useState<Record<string, boolean>>({});
  
  // Tab states
  const [leaseCost, setLeaseCost] = useState<number>(1500); // Default $1500 USD new lease
  const [selectedBUForTrend, setSelectedBUForTrend] = useState<string>("REFINADOS LAZARO");
  const [showEmptyCost, setShowEmptyCost] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => {
      setTractos(getTractos());
      setBusinessUnits(getBusinessUnits());
      setRemolques(getRemolques());
    };
    window.addEventListener("fleet-data-updated", handleUpdate);
    return () => window.removeEventListener("fleet-data-updated", handleUpdate);
  }, []);

  const toggleBUExpand = (buName: string) => {
    setExpandedBU((prev) => ({
      ...prev,
      [buName]: !prev[buName],
    }));
  };

  // KPI 1: Data for Equipo Asignado
  const equipoAsignadoData = businessUnits
    .filter(bu => bu.active)
    .map((bu) => {
      const buTractos = tractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());
      const activos = buTractos.filter(t => t.estado === "Activo").length;
      const inactivos = buTractos.filter(t => t.estado === "Inactivo").length;
      const mantto = buTractos.filter(t => t.estado === "Mantenimiento").length;

      return {
        name: bu.name,
        opType: bu.operation_type,
        total: buTractos.length,
        Activo: activos,
        Inactivo: inactivos,
        Mantenimiento: mantto,
        tractores: buTractos,
      };
    })
    .sort((a, b) => b.total - a.total);

  const totalTractosGlobal = tractos.length;
  const activosGlobal = tractos.filter(t => t.estado === "Activo").length;
  const inactivosGlobal = tractos.filter(t => t.estado === "Inactivo").length;
  const manttoGlobal = tractos.filter(t => t.estado === "Mantenimiento").length;

  // KPI 2: Data for % Utilización Unidad
  const utilizacionData = businessUnits
    .filter(bu => bu.active)
    .map((bu) => {
      const buTractos = tractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());
      const activeTractos = buTractos.filter(t => t.estado === "Activo");
      const avgUtil = activeTractos.length
        ? Math.round(activeTractos.reduce((sum, t) => sum + t.utilizacion, 0) / activeTractos.length)
        : 0;
      
      const hoursAvailable = 720; // 24hrs * 30 days
      const hoursProductive = Math.round(hoursAvailable * (avgUtil / 100));
      
      const meta = getUtilMetaRange(bu.operation_type);
      let status: "Cumple" | "Sobreuso" | "Ocioso" = "Cumple";
      if (avgUtil < meta.min) status = "Ocioso";
      if (avgUtil > meta.max) status = "Sobreuso";

      return {
        name: bu.name,
        opType: bu.operation_type,
        utilizacion: avgUtil,
        productiveHours: hoursProductive,
        availableHours: hoursAvailable,
        metaMin: meta.min,
        metaMax: meta.max,
        metaLabel: meta.label,
        status,
      };
    })
    .sort((a, b) => b.utilizacion - a.utilizacion);

  // KPI 3: Data for % Km Cargados
  const kmCargadosData = businessUnits
    .filter(bu => bu.active)
    .map((bu) => {
      const buTractos = tractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase() && t.estado === "Activo");
      const buTractosAll = tractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());
      
      const avgCargado = buTractos.length 
        ? Math.round(buTractos.reduce((sum, t) => sum + t.kmCargadosPct, 0) / buTractos.length)
        : 0;
      const avgVacio = buTractos.length ? 100 - avgCargado : 0;
      
      const totalKm = buTractosAll.reduce((sum, t) => sum + t.kmRecorridos, 0);
      const totalUtility = buTractosAll.reduce((sum, t) => sum + t.utilidadReal, 0);
      const totalRevenue = buTractosAll.reduce((sum, t) => sum + (t.ventaPorKm * t.kmRecorridos), 0);
      const costoKm = totalKm ? (totalRevenue - totalUtility) / totalKm : 1.65;
      
      const emptyKm = totalKm * (avgVacio / 100);
      const wastedCost = emptyKm * costoKm;
      
      const goal = getKmLoadedGoal(bu.name, bu.operation_type);

      return {
        name: bu.name,
        opType: bu.operation_type,
        cargado: avgCargado,
        vacio: avgVacio,
        goal,
        wastedCost: Math.round(wastedCost),
      };
    })
    .sort((a, b) => b.cargado - a.cargado);

  // KPI 4: Data for Punto de Equilibrio de Renovación
  const renewalCandidates = [...tractos]
    .map((t) => {
      const currentCost = t.costoManttoMensual + t.combustibleExcedenteCosto;
      const margin = leaseCost - currentCost;
      const shouldRenew = currentCost > leaseCost;

      return {
        ...t,
        currentCost,
        margin,
        shouldRenew,
      };
    })
    .sort((a, b) => b.currentCost - a.currentCost);

  // KPI 5: Data for Capacidad Instalada Trend
  const getCapacityTrendData = (buName: string) => {
    const months = ["Mar", "Abr", "May", "Jun", "Jul", "Ago"];
    let baseTrips = 12.5;
    if (buName.toUpperCase().includes("LAZARO")) baseTrips = 14.2;
    if (buName.toUpperCase().includes("LAGOS")) baseTrips = 15.6;
    if (buName.toUpperCase().includes("REFRIGERADOS")) baseTrips = 16.8;
    if (buName.toUpperCase().includes("MINA")) baseTrips = 10.2;

    const isDecreasing = 
      buName === "REFINADO MINA" || 
      buName === "BACHOCO LAGOS" || 
      buName === "LUBRICANTES JUMBO";

    return months.map((month, index) => {
      let variation = Math.sin(index) * 0.4;
      if (isDecreasing && index >= 4) {
        variation = -0.6 * (index - 3);
      }
      return {
        mes: month,
        viajesPerUnidad: parseFloat((baseTrips + variation).toFixed(1)),
      };
    });
  };

  const trendData = getCapacityTrendData(selectedBUForTrend);
  const isTrendDecreasing = 
    trendData[5].viajesPerUnidad < trendData[4].viajesPerUnidad &&
    trendData[4].viajesPerUnidad < trendData[3].viajesPerUnidad;

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1400px] space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold text-primary font-display flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            KPIs de Productividad y Operación
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Matriz inteligente del <strong>Modelo de Inteligencia Operativa y Financiera</strong>. Datos automatizados de Samsara y ZAM.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-muted px-3 py-1.5 rounded-lg text-muted-foreground font-semibold border">
          <span>Fuente Principal: </span>
          <span className="flex items-center gap-1 text-emerald-500 font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Samsara Live Telemetry
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-bold text-blue-500">ZAM ERP</span>
        </div>
      </header>

      <Tabs defaultValue="equipo" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-muted/60 h-11 p-1 rounded-xl">
          <TabsTrigger value="equipo" className="text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Equipo Asignado
          </TabsTrigger>
          <TabsTrigger value="utilizacion" className="text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> % Utilización Unidad
          </TabsTrigger>
          <TabsTrigger value="km" className="text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5" /> % Km Cargados
          </TabsTrigger>
          <TabsTrigger value="renovacion" className="text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Equilibrio Renovación
          </TabsTrigger>
          <TabsTrigger value="capacidad" className="text-xs font-semibold rounded-lg flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Capacidad Instalada
          </TabsTrigger>
        </TabsList>

        {/* KPI 1: EQUIPO ASIGNADO */}
        <TabsContent value="equipo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="shadow-sm border">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Flota Total Asignada</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-extrabold text-foreground">{totalTractosGlobal}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Tractocamiones agrupados por Unidad de Negocio</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border border-emerald-500/10 bg-emerald-500/5">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-semibold uppercase text-emerald-600">Unidades Activas</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-extrabold text-emerald-600">{activosGlobal}</div>
                <p className="text-[10px] text-emerald-600/80 mt-0.5">En tránsito o telemetría activa</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Unidades Inactivas</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-extrabold text-slate-500">{inactivosGlobal}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sin asignación temporal en patio</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border border-amber-500/10 bg-amber-500/5">
              <CardHeader className="py-4">
                <CardTitle className="text-xs font-semibold uppercase text-amber-600">En Mantenimiento</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-extrabold text-amber-600">{manttoGlobal}</div>
                <p className="text-[10px] text-amber-600/80 mt-0.5">En taller mecánico (ERP ZAM)</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">Distribución de Flota por Unidad de Negocio</CardTitle>
                <CardDescription>Conteo automatizado de telemetría de activos en Samsara.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={equipoAsignadoData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Activo" name="Activo" fill="#10B981" stackId="status" />
                    <Bar dataKey="Mantenimiento" name="En Taller" fill="#F59E0B" stackId="status" />
                    <Bar dataKey="Inactivo" name="Inactivo" fill="#94A3B8" stackId="status" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">Información Clave: Asignaciones</CardTitle>
                <CardDescription>Resumen de distribución de recursos logísticos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 text-xs">
                <div className="bg-blue-50 border border-blue-200/50 rounded-xl p-4 text-blue-800 space-y-2">
                  <p className="font-bold">Fórmula Operativa:</p>
                  <code className="text-sm font-semibold">Número de Tractocamiones por BU = Conteo de Activos</code>
                  <p className="text-[11px] text-blue-800/80 mt-1">
                    Esta asignación permite medir la capacidad máxima instalada para cumplir contratos de fletes con clientes principales.
                  </p>
                </div>
                <div className="border rounded-xl p-4 space-y-2 bg-slate-50">
                  <p className="font-bold text-slate-700">Mayor Concentración de Flota:</p>
                  <p className="text-slate-600">
                    La Unidad de Negocio con más tractocamiones es <span className="font-bold">{equipoAsignadoData[0]?.name}</span> con <span className="font-bold text-primary">{equipoAsignadoData[0]?.total}</span> unidades.
                  </p>
                  <p className="text-slate-600 mt-1">
                    La menor es <span className="font-bold">{equipoAsignadoData[equipoAsignadoData.length - 1]?.name}</span> con <span className="font-bold text-primary">{equipoAsignadoData[equipoAsignadoData.length - 1]?.total}</span> unidades.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-primary">Inventario de Equipos por Unidad de Negocio</CardTitle>
              <CardDescription>Haz clic en una unidad de negocio para ver los números económicos asignados y sus conductores.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 uppercase text-muted-foreground tracking-wider border-b">
                  <tr>
                    <th className="px-5 py-3 text-left w-12">Detalle</th>
                    <th className="px-5 py-3 text-left">Unidad de Negocio</th>
                    <th className="px-5 py-3 text-center">Tipo de Operación</th>
                    <th className="px-5 py-3 text-right">Total Unidades</th>
                    <th className="px-5 py-3 text-right text-emerald-600 font-bold">Activos</th>
                    <th className="px-5 py-3 text-right text-amber-600 font-bold">Mantenimiento</th>
                    <th className="px-5 py-3 text-right text-slate-500 font-bold">Inactivos</th>
                    <th className="px-5 py-3 text-center">Acciones Samsara</th>
                  </tr>
                </thead>
                <tbody>
                  {equipoAsignadoData.map((bu) => {
                    const isExpanded = !!expandedBU[bu.name];
                    return (
                      <>
                        <tr key={bu.name} className="border-t hover:bg-muted/10">
                          <td className="px-5 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleBUExpand(bu.name)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </td>
                          <td className="px-5 py-3 font-semibold text-foreground">{bu.name}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {bu.opType}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums font-bold">{bu.total}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-emerald-600 font-semibold">{bu.Activo}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-amber-600 font-semibold">{bu.Mantenimiento}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-500 font-semibold">{bu.Inactivo}</td>
                          <td className="px-5 py-3 text-center">
                            <a
                              href={getSamsaraAssetUrl(bu.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg"
                            >
                              Samsara Tag <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={8} className="px-8 py-4 border-t">
                              <div className="border rounded-xl bg-background overflow-hidden max-h-[300px] overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-muted text-[10px] uppercase text-muted-foreground border-b">
                                    <tr>
                                      <th className="px-4 py-2">Económico</th>
                                      <th className="px-4 py-2">Placa</th>
                                      <th className="px-4 py-2">Modelo</th>
                                      <th className="px-4 py-2">Conductor Asignado</th>
                                      <th className="px-4 py-2 text-center">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {bu.tractores.length === 0 ? (
                                      <tr>
                                        <td colSpan={5} className="text-center py-4 text-muted-foreground">
                                          Sin tractores asignados a esta unidad.
                                        </td>
                                      </tr>
                                    ) : (
                                      bu.tractores.map((t) => (
                                        <tr key={t.id} className="border-b hover:bg-muted/10 last:border-b-0">
                                          <td className="px-4 py-2.5 font-bold flex items-center gap-1.5 text-primary">
                                            <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                                            #{t.economico}
                                          </td>
                                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{t.placa}</td>
                                          <td className="px-4 py-2.5 text-muted-foreground">{t.modelo}</td>
                                          <td className="px-4 py-2.5 font-medium">{t.conductor}</td>
                                          <td className="px-4 py-2.5 text-center">
                                            <span
                                              className={cn(
                                                "inline-block px-2 py-0.5 rounded-full text-[9px] font-bold",
                                                t.estado === "Activo" && "bg-emerald-100 text-emerald-800 border border-emerald-200",
                                                t.estado === "Inactivo" && "bg-slate-100 text-slate-800 border border-slate-200",
                                                t.estado === "Mantenimiento" && "bg-amber-100 text-amber-800 border border-amber-200"
                                              )}
                                            >
                                              {t.estado}
                                            </span>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI 2: % UTILIZACIÓN UNIDAD */}
        <TabsContent value="utilizacion" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200/50 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-800">
            <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Fórmula de Utilización de Unidad:</p>
              <code className="text-sm font-extrabold block my-1 text-primary">
                % Utilización = (Horas Productivas / Horas Disponibles) * 100
              </code>
              <p className="text-[11px] text-muted-foreground">
                Mide el ritmo operativo del motor. Las horas productivas representan el tiempo de motor encendido en carretera. Las horas disponibles se calculan sobre la disponibilidad base de 720 horas mensuales (24 horas x 30 días) para identificar ociosidad o sobreuso crítico.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">% Utilización por BU vs. Rango Meta Recomendado</CardTitle>
                <CardDescription>El objetivo varía por tipo de operación contratada (Full, Refrigerado, Dedicado).</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilizacionData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" />
                    <YAxis unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="utilizacion" name="% Utilización Promedio" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="metaMin" name="Meta Mínima Recomendada" fill="#EF4444" opacity={0.3} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">Diagnóstico de Ritmo Operativo</CardTitle>
                <CardDescription>Alertas basadas en metas de saturación y capacidad.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                {utilizacionData.map((bu) => {
                  if (bu.status === "Cumple") return null;

                  return (
                    <div
                      key={bu.name}
                      className={cn(
                        "flex items-start gap-3 border p-3 rounded-lg text-xs",
                        bu.status === "Sobreuso"
                          ? "bg-amber-500/5 border-amber-500/20 text-amber-900"
                          : "bg-rose-500/5 border-rose-500/20 text-rose-900"
                      )}
                    >
                      <AlertTriangle className={cn("h-4 w-4 shrink-0 mt-0.5", bu.status === "Sobreuso" ? "text-amber-500" : "text-rose-500")} />
                      <div>
                        <p className="font-bold">{bu.name}</p>
                        <p className="text-[10px] mt-0.5">
                          Uso: <span className="font-semibold">{bu.utilizacion}%</span> | Rango: <span className="font-semibold">{bu.metaLabel}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground/90 mt-1">
                          {bu.status === "Sobreuso"
                            ? "SOBREUSO CRÍTICO: Ritmo operativo saturado. Justifica la compra o renta de tractos nuevos."
                            : "OCIOSIDAD DETECTADA: Ritmo operativo por debajo del umbral. Analizar reducción de unidades."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
                Rendimiento de Horas de Motor por Unidad de Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 uppercase text-muted-foreground tracking-wider border-b">
                  <tr>
                    <th className="px-5 py-3 text-left">Unidad de Negocio</th>
                    <th className="px-5 py-3 text-center">Operación</th>
                    <th className="px-5 py-3 text-right">Horas Productivas</th>
                    <th className="px-5 py-3 text-right">Horas Disponibles (Mes)</th>
                    <th className="px-5 py-3 text-right font-bold text-primary">Utilización Promedio</th>
                    <th className="px-5 py-3 text-right">Meta de Operación</th>
                    <th className="px-5 py-3 text-center">Diagnóstico</th>
                    <th className="px-5 py-3 text-center">Acciones Integradas</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizacionData.map((bu) => (
                    <tr key={bu.name} className="border-t hover:bg-muted/20">
                      <td className="px-5 py-3 font-semibold text-foreground">{bu.name}</td>
                      <td className="px-5 py-3 text-center">{bu.opType}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{bu.productiveHours} hrs</td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{bu.availableHours} hrs</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-primary">{bu.utilizacion}%</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-muted-foreground">{bu.metaLabel}</td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                            bu.status === "Cumple" && "text-emerald-600 bg-emerald-50 border border-emerald-100",
                            bu.status === "Sobreuso" && "text-amber-600 bg-amber-5 border border-amber-100",
                            bu.status === "Ocioso" && "text-rose-600 bg-rose-5 bg-rose-50 border border-rose-100"
                          )}
                        >
                          {bu.status === "Cumple" && <CheckCircle className="h-3 w-3" />}
                          {bu.status === "Sobreuso" && <TrendingUp className="h-3 w-3" />}
                          {bu.status === "Ocioso" && <TrendingDown className="h-3 w-3" />}
                          {bu.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center space-x-1">
                        <a
                          href={getSamsaraUtilizationUrl(bu.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-1.5 py-1 rounded"
                        >
                          Samsara Report <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href={getZamConsultaUnidadesUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-1 rounded"
                        >
                          ZAM ERP <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI 3: % KM CARGADOS */}
        <TabsContent value="km" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200/50 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-800">
            <Navigation className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Fórmula de Km Cargados vs. Vacíos:</p>
              <code className="text-sm font-extrabold block my-1 text-primary">
                % Km Cargados = (Km Recorridos con Carga / Km Totales Recorridos) * 100
              </code>
              <p className="text-[11px] text-muted-foreground">
                Busca identificar el porcentaje de kilómetros recorridos vacíos debido a retornos ineficientes. Meta contractual: <strong>50%</strong> para Tanques/Refinados (por imposibilidad técnica de retorno cargado de hidrocarburos), <strong>75%</strong> para Lubricantes, <strong>90%</strong> para Bachoco, y <strong>95%</strong> para Refrigerados.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">Análisis de Km Cargados vs Vacíos (%)</CardTitle>
                <CardDescription>Comparación operativa telemática por unidad de negocio.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kmCargadosData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" />
                    <YAxis unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cargado" name="% Km Cargados" fill="#1E40AF" stackId="a" />
                    <Bar dataKey="vacio" name="% Km Vacíos" fill="#E2E8F0" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">Resumen e Ineficiencias</CardTitle>
                <CardDescription>Unidades que no alcanzan su meta contractual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                {kmCargadosData.map((bu) => {
                  const underGoal = bu.cargado < bu.goal;
                  if (!underGoal) return null;

                  return (
                    <div key={bu.name} className="flex items-start gap-3 border bg-destructive/5 p-3 rounded-lg border-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold text-foreground">{bu.name}</p>
                        <p className="text-muted-foreground mt-0.5">
                          Actual: <span className="font-semibold text-destructive">{bu.cargado}%</span> | Meta: <span className="font-semibold">{bu.goal}%</span>
                        </p>
                        <span className="text-[10px] text-destructive/85 font-bold">Delta de Desvío: -{bu.goal - bu.cargado}%</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
                  Detalle de Eficiencia de Ruta por BU
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmptyCost(!showEmptyCost)}
                  className="h-8 text-xs font-semibold"
                >
                  {showEmptyCost ? "% Mostrar Porcentajes" : "💵 Mostrar Costo de Vacíos ($)"}
                </Button>
                <a
                  href={getSamsaraActivityUrl("REFINADOS LAZARO")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 h-8 text-xs font-semibold text-primary border px-3 rounded-md bg-primary/5 hover:bg-primary/10 border-primary/20"
                >
                  Samsara Activity Report <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 uppercase text-muted-foreground tracking-wider border-b">
                  <tr>
                    <th className="px-5 py-3 text-left">Unidad de Negocio</th>
                    <th className="px-5 py-3 text-right">Promedio Km Cargados</th>
                    <th className="px-5 py-3 text-right">
                      {showEmptyCost ? "Pérdida por Vacíos" : "Promedio Km Vacíos"}
                    </th>
                    <th className="px-5 py-3 text-right">Meta Contractual</th>
                    <th className="px-5 py-3 text-center">Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {kmCargadosData.map((bu) => (
                    <tr key={bu.name} className="border-t hover:bg-muted/20">
                      <td className="px-5 py-3 font-semibold text-foreground">{bu.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-primary">{bu.cargado}%</td>
                      <td className={cn("px-5 py-3 text-right tabular-nums", showEmptyCost ? "text-rose-500 font-extrabold text-sm" : "text-muted-foreground font-semibold")}>
                        {showEmptyCost ? formatUSD(bu.wastedCost) : `${bu.vacio}%`}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold">{bu.goal}%</td>
                      <td className="px-5 py-3 text-center">
                        {bu.cargado >= bu.goal ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" /> Cumple
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> Desviación
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI 4: EQUILIBRIO DE RENOVACIÓN */}
        <TabsContent value="renovacion" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-primary">Punto de Equilibrio de Renovación de Activos</CardTitle>
                <CardDescription>
                  Compara los costos actuales de mantenimiento y exceso de combustible vs. arrendamiento mensual de una unidad nueva.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg border max-w-xs shrink-0">
                <span className="text-xs font-semibold text-muted-foreground shrink-0">Mensualidad Arrendamiento (USD):</span>
                <Input
                  type="number"
                  value={leaseCost}
                  onChange={(e) => setLeaseCost(Number(e.target.value))}
                  className="h-8 w-24 bg-background border text-xs font-bold tabular-nums"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  <strong>Regla Operativa Financiera:</strong> Si el costo de mantener la unidad vieja (Mantenimiento Mensual + Exceso de Combustible) es superior a la mensualidad de arrendamiento de una unidad nueva (USD {leaseCost.toLocaleString()}), la decisión financiera técnica obliga a **renovar el activo**.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">Eco / Placa</th>
                      <th className="px-4 py-3 text-left">Unidad de Negocio</th>
                      <th className="px-4 py-3 text-right">Costo Mantenimiento</th>
                      <th className="px-4 py-3 text-right">Combustible Excedente</th>
                      <th className="px-4 py-3 text-right font-bold text-primary">Costo Total Mensual</th>
                      <th className="px-4 py-3 text-right">Mensualidad Nueva</th>
                      <th className="px-4 py-3 text-right">Margen / Pérdida</th>
                      <th className="px-4 py-3 text-center">Recomendación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewalCandidates.map((t) => (
                      <tr key={t.id} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          #{t.economico} <span className="text-xs text-muted-foreground font-normal">({t.placa})</span>
                        </td>
                        <td className="px-4 py-3 text-xs">{t.unidadNegocio}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatUSD(t.costoManttoMensual)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatUSD(t.combustibleExcedenteCosto)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-primary">{formatUSD(t.currentCost)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatUSD(leaseCost)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${t.margin < 0 ? "text-destructive" : "text-success"}`}>
                          {t.margin < 0 ? `-${formatUSD(Math.abs(t.margin))}` : formatUSD(t.margin)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.shouldRenew ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 border border-destructive/20 text-destructive animate-pulse">
                              RENOVAR ACTIVO
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/10 border border-success/20 text-success">
                              Margen Favorable
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI 5: CAPACIDAD INSTALADA */}
        <TabsContent value="capacidad" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-primary">Tendencia de Capacidad Instalada (Viajes/Unidad)</CardTitle>
                  <CardDescription>Relación viajes mensuales realizados por tractor operativo (Últimos 6 meses).</CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-muted/40 p-2 border rounded-lg max-w-xs shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground">Filtrar Unidad:</span>
                  <select
                    value={selectedBUForTrend}
                    onChange={(e) => setSelectedBUForTrend(e.target.value)}
                    className="bg-background border rounded-lg text-xs h-7 px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {businessUnits.filter(bu => bu.active).map((bu) => (
                      <option key={bu.id} value={bu.name}>
                        {bu.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 1", "dataMax + 1"]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="viajesPerUnidad"
                      name="Viajes / Unidad"
                      stroke="#1E40AF"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">Diagnóstico de Tendencia</CardTitle>
                <CardDescription>Monitoreo de saturación operativa y caída de rendimiento.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                {isTrendDecreasing ? (
                  <div className="border bg-destructive/10 border-destructive/20 rounded-xl p-4 text-xs space-y-2 text-destructive">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                      <span>ALERTA DE DESVÍO</span>
                    </div>
                    <p className="font-semibold">
                      La capacidad instalada en {selectedBUForTrend} ha caído por 2 meses consecutivos (Jul a Ago).
                    </p>
                    <p className="text-[11px] text-muted-foreground/85 mt-1">
                      Esto puede indicar ociosidad operativa, fallas repetidas de telemática o problemas de asignación comercial. Se recomienda auditar con el sistema ZAM de despacho.
                    </p>
                    <div className="pt-2">
                      <a
                        href={getZamDespachoViajesUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white font-bold text-[10px]"
                      >
                        ZAM Despachos <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="border bg-success/10 border-success/20 rounded-xl p-4 text-xs space-y-2 text-success">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                      <span>TENDENCIA SALUDABLE</span>
                    </div>
                    <p className="font-semibold">
                      La capacidad instalada en {selectedBUForTrend} mantiene una tendencia estable o creciente.
                    </p>
                    <p className="text-[11px] text-muted-foreground/85 mt-1">
                      El ritmo de viajes por unidad se encuentra dentro del rango de saturación operativa ideal.
                    </p>
                    <div className="pt-2">
                      <a
                        href={getZamDespachoViajesUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success hover:bg-success/90 text-white font-bold text-[10px]"
                      >
                        ZAM Despachos <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

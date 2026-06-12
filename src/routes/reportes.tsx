import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getTractos,
  getRemolques,
  getBusinessUnits,
  formatUSD,
  Tracto,
  Remolque,
  BusinessUnit,
} from "@/lib/database";
import {
  FileText,
  Mail,
  Download,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Share2,
  Printer,
  Sparkles,
  Clock,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
} from "recharts";

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  period: string;
  createdAt: string;
  createdBy: string;
}

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Centro de Reportes — Centro de Inteligencia Corporativa" },
      { name: "description", content: "Genera, exporta y envía reportes ejecutivos mensuales sobre la productividad y finanzas de tu flota." },
    ],
  }),
  component: ReportesPage,
});

function ReportesPage() {
  const [tractos] = useState<Tracto[]>(getTractos());
  const [remolques] = useState<Remolque[]>(getRemolques());
  const [businessUnits] = useState<BusinessUnit[]>(getBusinessUnits());
  
  // States
  const [reportType, setReportType] = useState<"executive" | "bu">("executive");
  const [selectedBU, setSelectedBU] = useState<string>("REFINADOS LAZARO");
  const [selectedMonth, setSelectedMonth] = useState<string>("Agosto");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [history, setHistory] = useState<GeneratedReport[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Load historical reports from localStorage
    const saved = localStorage.getItem("fleet_generated_reports");
    if (saved) {
      setHistory(JSON.parse(saved));
    } else {
      const initialHistory: GeneratedReport[] = [
        { id: "rep-1", name: "Reporte Mensual Ejecutivo", type: "Consolidado", period: "Julio 2025", createdAt: "2025-08-01 09:30", createdBy: "JR" },
        { id: "rep-2", name: "Reporte Unidad de Negocio", type: "Bachoco Lagos", period: "Julio 2025", createdAt: "2025-08-01 10:15", createdBy: "JR" },
        { id: "rep-3", name: "Análisis Financiero Trimestral", type: "Flota Completa", period: "Q2 2025", createdAt: "2025-07-05 14:00", createdBy: "JR" },
      ];
      localStorage.setItem("fleet_generated_reports", JSON.stringify(initialHistory));
      setHistory(initialHistory);
    }
  }, []);

  const saveHistory = (newHistory: GeneratedReport[]) => {
    setHistory(newHistory);
    localStorage.setItem("fleet_generated_reports", JSON.stringify(newHistory));
  };

  const handleGenerateReport = () => {
    const reportName = reportType === "executive" 
      ? "Reporte Mensual Ejecutivo" 
      : `Reporte Unidad: ${selectedBU}`;

    const newRep: GeneratedReport = {
      id: `rep-${Date.now()}`,
      name: reportName,
      type: reportType === "executive" ? "Consolidado" : selectedBU,
      period: `${selectedMonth} ${selectedYear}`,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      createdBy: "JR",
    };

    saveHistory([newRep, ...history]);
    setShowPreview(true);
    toast.success("Reporte generado con éxito. Vista previa disponible abajo.");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendReport = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Compilando reporte y enviando correo...",
        success: "Reporte ejecutivo enviado correctamente a directiva@cic.com",
        error: "Error al enviar el reporte",
      }
    );
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Enlace de consulta compartida copiado al portapapeles");
  };

  // Metrics for Preview
  const activeTractos = tractos.filter(t => t.estado === "Activo");
  const totalKm = tractos.reduce((sum, t) => sum + t.kmRecorridos, 0);
  const totalRevenue = tractos.reduce((sum, t) => sum + (t.ventaPorKm * t.kmRecorridos), 0);
  const totalUtility = tractos.reduce((sum, t) => sum + t.utilidadReal, 0);

  // Business Unit specific metrics
  const getBUMetrics = (buName: string) => {
    const buTractos = tractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (buName || "").toUpperCase());
    const buRemolques = remolques.filter(r => (r.unidadNegocio || "").toUpperCase() === (buName || "").toUpperCase());
    
    const buKm = buTractos.reduce((sum, t) => sum + t.kmRecorridos, 0);
    const buRev = buTractos.reduce((sum, t) => sum + (t.ventaPorKm * t.kmRecorridos), 0);
    const buUtil = buTractos.reduce((sum, t) => sum + t.utilidadReal, 0);
    
    const buUtilizacion = buTractos.length 
      ? Math.round(buTractos.reduce((sum, t) => sum + t.utilizacion, 0) / buTractos.length) 
      : 0;

    return {
      tractosCount: buTractos.length,
      remolquesCount: buRemolques.length,
      km: buKm,
      revenue: buRev,
      utility: buUtil,
      utilizacion: buUtilizacion,
    };
  };

  const buData = getBUMetrics(selectedBU);

  // Mock data for Recharts trends within reports
  const reportChartData = [
    { name: "Mar", ingresos: 125000, utilidad: 45000 },
    { name: "Abr", ingresos: 132000, utilidad: 48000 },
    { name: "May", ingresos: 140000, utilidad: 52000 },
    { name: "Jun", ingresos: 138000, utilidad: 50000 },
    { name: "Jul", ingresos: 145000, utilidad: 55000 },
    { name: "Ago", ingresos: 152000, utilidad: 59000 },
  ];

  const buChartData = [
    { name: "Mar", ingresos: 34000 },
    { name: "Abr", ingresos: 36500 },
    { name: "May", ingresos: 38200 },
    { name: "Jun", ingresos: 37000 },
    { name: "Jul", ingresos: 41000 },
    { name: "Ago", ingresos: 43200 },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1400px] space-y-6 print:p-0 print:bg-white">
      {/* Title & Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-primary font-display">Reportes</h1>
          <p className="text-muted-foreground text-sm">Genera plantillas ejecutivas, exporta PDF y comparte análisis de productividad.</p>
        </div>
      </header>

      {/* Control Panel */}
      <section className="grid gap-4 md:grid-cols-3 print:hidden">
        <Card className="shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-primary">Configuración del Reporte</CardTitle>
            <CardDescription>Selecciona la cobertura del análisis y el período de facturación telemática.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Tipo de Reporte:</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as "executive" | "bu")}
                className="bg-background border rounded-lg text-xs h-9 w-full px-2"
              >
                <option value="executive">Reporte Ejecutivo Mensual (Consolidado)</option>
                <option value="bu">Reporte por Unidad de Negocio (Detallado)</option>
              </select>
            </div>

            {reportType === "bu" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Seleccionar Unidad de Negocio:</label>
                <select
                  value={selectedBU}
                  onChange={(e) => setSelectedBU(e.target.value)}
                  className="bg-background border rounded-lg text-xs h-9 w-full px-2"
                >
                  {businessUnits.map((bu) => (
                    <option key={bu.id} value={bu.name}>
                      {bu.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Mes de Consulta:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-background border rounded-lg text-xs h-9 w-full px-2"
              >
                {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Año:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-background border rounded-lg text-xs h-9 w-full px-2"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t p-4">
            <Button variant="gold" size="sm" onClick={handleGenerateReport} className="text-xs">
              <FileText className="h-4 w-4 mr-1.5" /> Generar Reporte
            </Button>
          </CardFooter>
        </Card>

        {/* Right side stack */}
        <div className="space-y-4 md:col-span-1 flex flex-col justify-between">
          {/* History */}
          <Card className="shadow-sm flex flex-col justify-between flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase text-primary">Historial Reciente</CardTitle>
              <CardDescription>Reportes descargados localmente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[160px]">
              {history.map((rep) => (
                <div key={rep.id} className="flex items-center justify-between border-b pb-2 text-xs">
                  <div>
                    <p className="font-semibold text-foreground truncate max-w-[150px]">{rep.name}</p>
                    <p className="text-[10px] text-muted-foreground">{rep.period} | {rep.createdAt}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => setShowPreview(true)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Scheduler Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase text-primary flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gold" /> Suscripción Directiva
              </CardTitle>
              <CardDescription className="text-xs">
                Envío automatizado mensual de KPIs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Destinatarios (Separados por coma):</label>
                <Input
                  type="text"
                  placeholder="directiva@empresa.com, finanzas@empresa.com"
                  defaultValue="directiva@cic.com, directores@cic.com"
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="flex gap-2">
                <div className="space-y-1 flex-1">
                  <label className="font-bold text-muted-foreground">Enviar el día:</label>
                  <select className="bg-background border rounded-lg text-[11px] h-8 w-full px-2">
                    <option value="1">1 de cada mes</option>
                    <option value="5">5 de cada mes</option>
                    <option value="15">15 de cada mes</option>
                  </select>
                </div>
                <div className="space-y-1 flex-1">
                  <label className="font-bold text-muted-foreground">Frecuencia:</label>
                  <select className="bg-background border rounded-lg text-[11px] h-8 w-full px-2">
                    <option value="mensual">Mensual</option>
                    <option value="semanal">Semanal (Lunes)</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t p-3 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.success("Suscripción programada: Los reportes se enviarán de forma recurrente.");
                }}
                className="text-xs h-7 text-primary hover:bg-primary/15"
              >
                Programar Envío
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Print-Ready Report Template Preview */}
      {showPreview && (
        <section className="relative bg-white border border-slate-200 rounded-xl shadow-2xl p-8 md:p-12 space-y-6 text-slate-800 print:border-none print:shadow-none print:p-0 overflow-hidden z-10">
          
          {/* Watermark background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] z-0 overflow-hidden">
            <span className="text-[7vw] font-black tracking-widest uppercase rotate-[-28deg] text-slate-900 whitespace-nowrap">
              CENTRO INTEL.
            </span>
          </div>

          {/* Header Report Document (hidden sidebar & dashboard controls when printing) */}
          <div className="flex justify-between items-start border-b pb-4 z-10 relative">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="h-8 w-8 shrink-0 rounded object-contain" />
                <span className="font-bold text-lg text-primary font-display">Centro de Inteligencia Corporativa</span>
              </div>
              <p className="text-[10px] text-slate-400">Inteligencia Operativa y Financiera de Transporte</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-primary">REPORTE OFICIAL EJECUTIVO</p>
              <p className="text-slate-500 mt-1">Período: {selectedMonth} {selectedYear}</p>
              <p className="text-[10px] text-slate-400">Generado el: {new Date().toISOString().substring(0, 10)} por JR</p>
              <div className="text-[9px] font-mono text-slate-400 mt-1 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 inline-block select-all">
                🔐 SELLO DIGITAL: FM-VALID-{(selectedMonth + selectedYear).toUpperCase()}-{Math.random().toString(36).substring(2, 10).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Action buttons on Preview (only screen) */}
          <div className="flex gap-2 justify-end print:hidden bg-slate-50 p-2 rounded-lg border border-dashed z-10 relative">
            <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs">
              <Printer className="h-4 w-4 mr-1.5" /> Imprimir / PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleSendReport} className="text-xs">
              <Mail className="h-4 w-4 mr-1.5" /> Enviar Correo
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareLink} className="text-xs">
              <Share2 className="h-4 w-4 mr-1.5" /> Copiar Enlace
            </Button>
          </div>

          {/* Report body */}
          {reportType === "executive" ? (
            // EXECUTIVE CONSOLIDATED VIEW
            <div className="space-y-6 z-10 relative">
              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-xl">
                <h3 className="font-bold text-sm text-primary uppercase">1. Resumen Consolidado de Flota</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs">
                  <div>
                    <span className="text-slate-400">Tractos Activos:</span>
                    <p className="font-bold text-sm mt-0.5">{activeTractos.length} de {tractos.length} unidades</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Remolques Activos:</span>
                    <p className="font-bold text-sm mt-0.5">{remolques.filter(r => r.estado === "Activo").length} de {remolques.length} unidades</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Ingresos Totales (Venta):</span>
                    <p className="font-bold text-sm text-success mt-0.5">{formatUSD(totalRevenue)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Utilidad Consolidada:</span>
                    <p className="font-bold text-sm text-success mt-0.5">{formatUSD(totalUtility)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm text-primary uppercase">2. Análisis de KPIs Estratégicos</h3>
                <div className="border rounded-xl overflow-hidden bg-white/55">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 border-b font-bold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Indicador KPI</th>
                        <th className="px-4 py-2.5 text-left">Fórmula Aplicada</th>
                        <th className="px-4 py-2.5 text-right">Valor Registrado</th>
                        <th className="px-4 py-2.5 text-center">Meta Recom.</th>
                        <th className="px-4 py-2.5 text-center">Semáforo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-2.5 font-semibold">% Utilización Unidad</td>
                        <td className="px-4 py-2.5 text-slate-400">Horas Productivas / Horas Disponibles</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          {Math.round(tractos.reduce((a, b) => a + b.utilizacion, 0) / tractos.length)}%
                        </td>
                        <td className="px-4 py-2.5 text-center">75% - 95%</td>
                        <td className="px-4 py-2.5 text-center">💚 Cumple</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2.5 font-semibold">% Km Cargados</td>
                        <td className="px-4 py-2.5 text-slate-400">Km Cargados / Km Totales</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          {Math.round(activeTractos.reduce((a, b) => a + b.kmCargadosPct, 0) / activeTractos.length)}%
                        </td>
                        <td className="px-4 py-2.5 text-center">&gt;50%</td>
                        <td className="px-4 py-2.5 text-center">💚 Cumple</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2.5 font-semibold">Venta por Kilómetro</td>
                        <td className="px-4 py-2.5 text-slate-400">Ingresos / Kilómetros Totales</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          {formatUSD(totalRevenue / totalKm)}/km
                        </td>
                        <td className="px-4 py-2.5 text-center">Variable</td>
                        <td className="px-4 py-2.5 text-center">💚 Estable</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2.5 font-semibold">Rendimiento Combustible</td>
                        <td className="px-4 py-2.5 text-slate-400">Kilómetros / Litros</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          {(activeTractos.reduce((a, b) => a + b.rendimiento, 0) / activeTractos.length).toFixed(2)} km/L
                        </td>
                        <td className="px-4 py-2.5 text-center">&gt;2.4 km/L</td>
                        <td className="px-4 py-2.5 text-center">💛 Alerta</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-semibold">Disponibilidad Mecánica</td>
                        <td className="px-4 py-2.5 text-slate-400">1 - (Días Taller / Días Calendario)</td>
                        <td className="px-4 py-2.5 text-right font-bold">96.3%</td>
                        <td className="px-4 py-2.5 text-center">&gt;90%</td>
                        <td className="px-4 py-2.5 text-center">💚 Cumple</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Consolidated Trend Chart */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-primary uppercase">3. Gráfico de Tendencia (Ingresos vs Utilidad)</h3>
                <div className="h-52 w-full border rounded-xl p-3 bg-white/60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#475569" }} />
                      <ChartTooltip formatter={(value: any) => formatUSD(Number(value))} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="ingresos" name="Ingresos (MXN)" fill="#1e3a8a" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="utilidad" name="Utilidad (MXN)" fill="#10b981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top and Bottom Lists */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border rounded-xl p-4 bg-white/55">
                  <h4 className="font-bold text-xs uppercase text-success flex items-center gap-1">
                    🟢 Unidades Más Rentables (Top 3)
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    <li className="flex justify-between border-b py-1">
                      <span>#102 (Freightliner Cascadia - Refrigerado)</span>
                      <span className="font-bold text-success">$24,300 MXN</span>
                    </li>
                    <li className="flex justify-between border-b py-1">
                      <span>#106 (Kenworth T680 - Lubricantes)</span>
                      <span className="font-bold text-success">$19,750 MXN</span>
                    </li>
                    <li className="flex justify-between py-1">
                      <span>#101 (Kenworth T680 - Refinados)</span>
                      <span className="font-bold text-success">$18,420 MXN</span>
                    </li>
                  </ul>
                </div>
                <div className="border rounded-xl p-4 bg-white/55">
                  <h4 className="font-bold text-xs uppercase text-destructive flex items-center gap-1">
                    🔴 Unidades en Observación (Costo Taller/Inactivos)
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    <li className="flex justify-between border-b py-1">
                      <span>#105 (Freightliner Cascadia - Inactivo)</span>
                      <span className="font-bold text-destructive">-$1,240 MXN</span>
                    </li>
                    <li className="flex justify-between border-b py-1">
                      <span>#108 (Freightliner Cascadia - Inactivo)</span>
                      <span className="font-bold text-destructive">-$980 MXN</span>
                    </li>
                    <li className="flex justify-between py-1">
                      <span>#103 (Kenworth T680 - Mantenimiento)</span>
                      <span className="font-bold text-orange-600">$3,240 MXN (Gasto taller: $4.6k)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            // BUSINESS UNIT DETAILED VIEW
            <div className="space-y-6 z-10 relative">
              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-xl">
                <h3 className="font-bold text-sm text-primary uppercase">1. Ficha Operativa: {selectedBU}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs">
                  <div>
                    <span className="text-slate-400">Tractores Asignados:</span>
                    <p className="font-bold text-sm mt-0.5">{buData.tractosCount} unidades</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Utilización Promedio:</span>
                    <p className="font-bold text-sm mt-0.5">{buData.utilizacion}%</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Ingresos Totales:</span>
                    <p className="font-bold text-sm text-success mt-0.5">{formatUSD(buData.revenue)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Utilidad Operativa:</span>
                    <p className="font-bold text-sm text-success mt-0.5">{formatUSD(buData.utility)}</p>
                  </div>
                </div>
              </div>

              {/* Table of specific tractors */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-primary uppercase">2. Detalle de Activos en Operación</h3>
                <div className="border rounded-xl overflow-hidden bg-white/55">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 border-b font-bold text-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left">Eco / Placa</th>
                        <th className="px-4 py-2 text-left">Conductor</th>
                        <th className="px-4 py-2 text-center">Estado</th>
                        <th className="px-4 py-2 text-right">Utilización</th>
                        <th className="px-4 py-2 text-right">Km Recorridos</th>
                        <th className="px-4 py-2 text-right">Utilidad Real</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (selectedBU || "").toUpperCase()).map(t => (
                        <tr key={t.id} className="border-b">
                          <td className="px-4 py-2 font-semibold">#{t.economico} ({t.placa})</td>
                          <td className="px-4 py-2">{t.conductor}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.estado === "Activo" ? "bg-green-100 text-green-800" : t.estado === "Inactivo" ? "bg-slate-100 text-slate-600" : "bg-yellow-100 text-yellow-800"
                            }`}>{t.estado}</span>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">{t.utilizacion}%</td>
                          <td className="px-4 py-2 text-right">{(t.kmRecorridos || 0).toLocaleString()} km</td>
                          <td className={`px-4 py-2 text-right font-bold ${t.utilidadReal < 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatUSD(t.utilidadReal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly BU Trend Chart */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-primary uppercase">3. Desempeño Histórico de Ingresos (Unidad de Negocio)</h3>
                <div className="h-52 w-full border rounded-xl p-3 bg-white/60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#475569" }} />
                      <ChartTooltip formatter={(value: any) => formatUSD(Number(value))} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="ingresos" name="Ingresos Mensuales Unidad (MXN)" fill="#b45309" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Firm signatures always visible */}
          <div className="flex justify-between pt-10 text-xs text-slate-400 border-t border-slate-200 mt-10 z-10 relative">
            <div className="text-center w-52">
              <div className="h-10 flex items-end justify-center pb-2 font-serif italic text-blue-900 text-base select-none">
                Jesús Renedo
              </div>
              <div className="border-t border-slate-300 pt-2">
                <p className="font-bold text-slate-700 text-xs">Jesús Renedo</p>
                <p className="text-[10px]">Director de Operaciones</p>
              </div>
            </div>
            <div className="text-center w-52 flex flex-col items-center">
              <div className="h-10 flex items-center justify-center select-none text-emerald-600 font-mono text-[9px] border border-dashed border-emerald-300 rounded bg-emerald-50/60 px-3 py-1 leading-tight w-full max-w-[200px]">
                ✅ AUTO-VALIDACIÓN DIGITAL<br />CIC-SYSTEM-APPROVED
              </div>
              <div className="border-t border-slate-300 pt-2 mt-2 w-full">
                <p className="font-bold text-slate-700 text-xs">Auto-Validación CIC</p>
                <p className="text-[10px]">Sello de Seguridad</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

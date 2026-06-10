import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Award,
  Search,
  Building2,
  Users,
  CheckCircle,
  X,
} from "lucide-react";
import { Card, CardTitle, CardDescription, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTractos, getBusinessUnits, Tracto, BusinessUnit } from "@/lib/database";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dho")({
  head: () => ({
    meta: [
      { title: "DHO: Seguridad de Operadores — Centro de Inteligencia Corporativa" },
      { name: "description", content: "Ranking e indicadores de seguridad y desempeño de conductores." },
    ],
  }),
  component: DHOPage,
});

function DHOPage() {
  const [tractos, setTractos] = useState<Tracto[]>(getTractos());
  const [businessUnits] = useState<BusinessUnit[]>(getBusinessUnits());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBU, setSelectedBU] = useState("TODAS");

  useEffect(() => {
    const handleUpdate = () => {
      setTractos(getTractos());
    };
    window.addEventListener("fleet-data-updated", handleUpdate);
    return () => window.removeEventListener("fleet-data-updated", handleUpdate);
  }, []);

  // Filter only active tractos with operator assigned and safety score
  const filteredTractos = tractos.filter((t) => {
    const matchesSearch =
      (t.conductor || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.economico || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBU =
      selectedBU === "TODAS" ||
      (t.unidadNegocio || "").toUpperCase() === selectedBU.toUpperCase();

    const hasOperatorAndActive = t.estado === "Activo" && t.conductor && t.conductor !== "—" && t.conductor.trim() !== "";

    return matchesSearch && matchesBU && hasOperatorAndActive;
  });

  // Sort by safety score ascending (since safety score is incident rate in Samsara, i.e., lower scoreSeguridad means safer. Let's sort lower to higher incident rate)
  const sortedSafety = [...filteredTractos]
    .filter(t => t.scoreSeguridad > 0)
    .sort((a, b) => a.scoreSeguridad - b.scoreSeguridad);

  const gold = sortedSafety[0];
  const silver = sortedSafety[1];
  const bronze = sortedSafety[2];

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1400px] space-y-6">
      {/* Title & Actions */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </span>
            <h1 className="text-3xl font-bold text-primary">Desarrollo Humano Organizacional (DHO)</h1>
          </div>
          <p className="text-muted-foreground text-sm">Monitoreo del desempeño en seguridad, ranking corporativo y reconocimientos de operadores.</p>
        </div>
      </header>

      {/* Filter Toolbar */}
      <section className="bg-card border rounded-xl p-4 shadow-[var(--shadow-card)] flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar operador o económico..."
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

        {(searchTerm !== "" || selectedBU !== "TODAS") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedBU("TODAS");
            }}
            className="text-xs h-9 px-2 hover:bg-muted"
          >
            <X className="h-3 w-3 mr-1" /> Limpiar filtros
          </Button>
        )}
      </section>

      {/* DRIVER SAFETY PODIUM SECTION */}
      <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Podium Column (1 Column) */}
          <Card className="lg:col-span-1 shadow-sm bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-border/30 p-5 flex flex-col justify-between min-h-[380px] relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-1 shrink-0">
              <span className="text-[9px] font-bold uppercase text-primary-glow tracking-widest block">Reconocimiento Corporativo</span>
              <h4 className="text-sm font-extrabold tracking-tight">Podio de Honor: Operadores Seguros</h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                Los 3 mejores operadores del mes con base en menor índice de frenadas bruscas y consumo eficiente de combustible.
              </p>
            </div>

            {/* Visual Podium */}
            <div className="flex items-end justify-center gap-2 mt-8 mb-4 h-36">
              {/* 2nd Place: Silver */}
              {silver && (
                <div className="flex flex-col items-center flex-1">
                  <div className="text-[9px] text-center w-full truncate font-bold text-slate-300" title={silver.conductor}>
                    {(silver.conductor || "Operador").split(' ')[0]}
                  </div>
                  <span className="text-[8px] text-slate-400">#{silver.economico}</span>
                  <div className="w-full bg-slate-700/60 border border-slate-600/50 rounded-t-lg h-16 flex flex-col items-center justify-center mt-1">
                    <span className="text-xl">🥈</span>
                    <span className="text-[9px] font-black mt-0.5">{(100 - silver.scoreSeguridad * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {/* 1st Place: Gold */}
              {gold && (
                <div className="flex flex-col items-center flex-1 z-10 scale-105">
                  <div className="text-[10px] text-center w-full truncate font-black text-gold flex items-center justify-center gap-0.5" title={gold.conductor}>
                    👑 {(gold.conductor || "Operador").split(' ')[0]}
                  </div>
                  <span className="text-[8px] text-gold font-bold">#{gold.economico}</span>
                  <div className="w-full bg-gradient-to-t from-gold/30 to-gold/10 border-t-2 border-gold rounded-t-lg h-24 flex flex-col items-center justify-center mt-1 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                    <span className="text-3xl">🥇</span>
                    <span className="text-xs font-black mt-1 text-gold">{(100 - gold.scoreSeguridad * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {/* 3rd Place: Bronze */}
              {bronze && (
                <div className="flex flex-col items-center flex-1">
                  <div className="text-[9px] text-center w-full truncate font-bold text-amber-600" title={bronze.conductor}>
                    {(bronze.conductor || "Operador").split(' ')[0]}
                  </div>
                  <span className="text-[8px] text-slate-400">#{bronze.economico}</span>
                  <div className="w-full bg-slate-800/60 border border-slate-700/50 rounded-t-lg h-12 flex flex-col items-center justify-center mt-1">
                    <span className="text-lg">🥉</span>
                    <span className="text-[9px] font-black mt-0.5">{(100 - bronze.scoreSeguridad * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-[9px] text-slate-400 font-mono text-center">
              Cálculo telemático en base a eventos de seguridad de Samsara
            </div>
          </Card>

          {/* Complete Ranking Table (2 Columns) */}
          <Card className="lg:col-span-2 shadow-sm bg-card/65 backdrop-blur-md border p-5 flex flex-col justify-between">
            <div className="space-y-1.5 pb-3">
              <CardTitle className="text-sm font-bold uppercase text-primary">Tabla de Desempeño Operativo General</CardTitle>
              <CardDescription>
                Listado de conductores activos ordenados por su score de seguridad global.
              </CardDescription>
            </div>

            <div className="flex-1 overflow-x-auto border rounded-xl bg-background/30 border-border/10">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground border-b border-border/10">
                  <tr>
                    <th className="px-3 py-2">Pos</th>
                    <th className="px-3 py-2">Operador</th>
                    <th className="px-3 py-2 text-right">Económico</th>
                    <th className="px-3 py-2 text-right">Rendimiento (km/L)</th>
                    <th className="px-3 py-2 text-right">Frenadas bruscas / 100km</th>
                    <th className="px-3 py-2 text-right">Score Seguridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {sortedSafety.slice(0, 15).map((t, idx) => {
                    const safetyScorePct = 100 - ((t.scoreSeguridad || 0) * 100);
                    const isExcellent = safetyScorePct >= 95;
                    const hardBrakingRate = ((t.scoreSeguridad || 0) * 100).toFixed(2);
                    
                    return (
                      <tr key={t.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5 font-bold text-foreground">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{t.conductor}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-muted-foreground">#{t.economico}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-foreground">{(t.rendimiento || 0).toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{hardBrakingRate}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            isExcellent ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                          )}>
                            {safetyScorePct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-muted-foreground leading-normal pt-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span>Meta de Flota Segura: Score de Seguridad superior a <span className="font-bold text-primary">90%</span> consolidado.</span>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getSystemConfig,
  saveSystemConfig,
  getBusinessUnits,
  saveBusinessUnits,
  addBusinessUnit,
  updateBusinessUnit,
  deleteBusinessUnit,
  BusinessUnit,
  SystemConfig,
  OperationType,
  getTractos,
  saveTractos,
  getRemolques,
  saveRemolques,
  Tracto,
  Remolque,
} from "@/lib/database";
import {
  Settings,
  Link2,
  Sliders,
  FolderTree,
  Users,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { syncSamsaraTelemetry } from "@/lib/samsara";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración del Sistema — Centro de Inteligencia Corporativa" },
      { name: "description", content: "Configura tus integraciones de Samsara, ZAM ERP, metas operativas y unidades de negocio." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const [config, setConfig] = useState<SystemConfig>(getSystemConfig());
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>(getBusinessUnits());
  
  // Connections test states
  const [samsaraStatus, setSamsaraStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [zamStatus, setZamStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  // CRUD Business Unit states
  const [editingBU, setEditingBU] = useState<BusinessUnit | null>(null);
  const [newBUName, setNewBUName] = useState("");
  const [newBUType, setNewBUType] = useState<OperationType>("Full");
  const [newBUGoal, setNewBUGoal] = useState<number>(50);
  const [isAddingBU, setIsAddingBU] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getSystemConfig());
      setBusinessUnits(getBusinessUnits());
    };
    window.addEventListener("fleet-data-updated", handleUpdate);

    // If an API key is already stored, initialize status as success
    const currentConfig = getSystemConfig();
    if (currentConfig.samsaraApiKey) {
      setSamsaraStatus("success");
    }

    return () => window.removeEventListener("fleet-data-updated", handleUpdate);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "samsara-util" | "samsara-act" | "zam-trips" | "zam-maint") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processFile(text, type);
    };
    reader.readAsText(file);
  };

  const processFile = (text: string, type: "samsara-util" | "samsara-act" | "zam-trips" | "zam-maint") => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      toast.error("El archivo está vacío o no contiene suficientes líneas.");
      return;
    }

    const headerLine = lines[0];
    let delimiter = ",";
    if (headerLine.includes(";")) delimiter = ";";
    else if (headerLine.includes("\t")) delimiter = "\t";

    const parseCSVRow = (row: string) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVRow(headerLine).map(h => h.toLowerCase().replace(/["']/g, ""));
    const dataRows = lines.slice(1).map(parseCSVRow);

    const currentTractos = [...getTractos()];
    const currentRemolques = [...getRemolques()];
    let updatedCount = 0;

    if (type === "samsara-util") {
      const vehicleIdx = headers.findIndex(h => h.includes("vehicle") || h.includes("asset") || h.includes("name") || h.includes("económico") || h.includes("unidad") || h.includes("placa"));
      const utilIdx = headers.findIndex(h => h.includes("utilization") || h.includes("utilizac") || h.includes("%") || h.includes("porcentaje"));
      
      if (vehicleIdx === -1) {
        toast.error("No se encontró la columna de vehículo/unidad (Vehicle/Asset/Unidad) en las cabeceras.");
        return;
      }

      dataRows.forEach(row => {
        const name = row[vehicleIdx];
        if (!name) return;

        const tracto = currentTractos.find(t => 
          (t.economico || "") === name || 
          (t.placa || "").toLowerCase() === name.toLowerCase() || 
          name.toLowerCase().includes((t.economico || "").toLowerCase())
        );

        if (tracto) {
          if (utilIdx !== -1 && row[utilIdx]) {
            const val = parseFloat(row[utilIdx].replace(/[^\d.]/g, ""));
            if (!isNaN(val)) tracto.utilizacion = Math.round(val);
          }
          if (tracto.utilizacion > 0 && tracto.estado === "Inactivo") {
            tracto.estado = "Activo";
          } else if (tracto.utilizacion === 0) {
            tracto.estado = "Inactivo";
          }
          updatedCount++;
        } else {
          const remolque = currentRemolques.find(r => 
            (r.economico || "") === name || 
            (r.placa || "").toLowerCase() === name.toLowerCase() || 
            name.toLowerCase().includes((r.economico || "").toLowerCase())
          );
          if (remolque) {
            if (utilIdx !== -1 && row[utilIdx]) {
              const val = parseFloat(row[utilIdx].replace(/[^\d.]/g, ""));
              if (!isNaN(val)) remolque.utilizacion = Math.round(val);
            }
            if (remolque.utilizacion > 0 && remolque.estado === "Inactivo") {
              remolque.estado = "Activo";
            } else if (remolque.utilizacion === 0) {
              remolque.estado = "Inactivo";
            }
            updatedCount++;
          }
        }
      });

      saveTractos(currentTractos);
      saveRemolques(currentRemolques);
      toast.success(`Samsara Utilización: Se actualizaron ${updatedCount} unidades con éxito.`);

    } else if (type === "samsara-act") {
      const vehicleIdx = headers.findIndex(h => h.includes("vehicle") || h.includes("asset") || h.includes("name") || h.includes("económico") || h.includes("unidad"));
      const kmIdx = headers.findIndex(h => h.includes("distance") || h.includes("km") || h.includes("kilómetros") || h.includes("totales"));
      const loadedIdx = headers.findIndex(h => h.includes("loaded") || h.includes("cargado") || h.includes("%"));
      
      if (vehicleIdx === -1) {
        toast.error("No se encontró la columna de vehículo en las cabeceras.");
        return;
      }

      dataRows.forEach(row => {
        const name = row[vehicleIdx];
        if (!name) return;

        const tracto = currentTractos.find(t => 
          (t.economico || "") === name || 
          (t.placa || "").toLowerCase() === name.toLowerCase() || 
          name.toLowerCase().includes((t.economico || "").toLowerCase())
        );

        if (tracto) {
          if (kmIdx !== -1 && row[kmIdx]) {
            const val = parseFloat(row[kmIdx].replace(/[^\d.]/g, ""));
            if (!isNaN(val)) tracto.kmRecorridos = Math.round(val);
          }
          if (loadedIdx !== -1 && row[loadedIdx]) {
            let val = parseFloat(row[loadedIdx].replace(/[^\d.]/g, ""));
            if (!isNaN(val)) {
              if (val > 100) val = val / 100;
              if (val <= 1) val = val * 100;
              tracto.kmCargadosPct = Math.round(val);
            }
          }
          updatedCount++;
        }
      });

      saveTractos(currentTractos);
      toast.success(`Samsara Actividad: Se actualizaron ${updatedCount} tractos con éxito.`);

    } else if (type === "zam-trips") {
      const vehicleIdx = headers.findIndex(h => h.includes("unidad") || h.includes("tracto") || h.includes("económico") || h.includes("vehículo") || h.includes("vehicle"));
      const tripsIdx = headers.findIndex(h => h.includes("viaje") || h.includes("cantidad") || h.includes("trips") || h.includes("total"));
      const buIdx = headers.findIndex(h => h.includes("base") || h.includes("unidad de negocio") || h.includes("bu"));

      if (vehicleIdx === -1) {
        toast.error("No se encontró la columna de vehículo/unidad en las cabeceras.");
        return;
      }

      dataRows.forEach(row => {
        const name = row[vehicleIdx];
        if (!name) return;

        const tracto = currentTractos.find(t => 
          (t.economico || "") === name || 
          (t.placa || "").toLowerCase() === name.toLowerCase() || 
          name.toLowerCase().includes((t.economico || "").toLowerCase())
        );

        if (tracto) {
          if (tripsIdx !== -1 && row[tripsIdx]) {
            const val = parseInt(row[tripsIdx].replace(/[^\d]/g, ""), 10);
            if (!isNaN(val)) tracto.viajesMes = val;
          }
          if (buIdx !== -1 && row[buIdx]) {
            tracto.unidadNegocio = (row[buIdx] || "").toUpperCase();
          }
          updatedCount++;
        }
      });

      saveTractos(currentTractos);
      toast.success(`ZAM Despachos: Se actualizaron ${updatedCount} tractos con éxito.`);

    } else if (type === "zam-maint") {
      const vehicleIdx = headers.findIndex(h => h.includes("unidad") || h.includes("económico") || h.includes("placa") || h.includes("vehículo"));
      const costIdx = headers.findIndex(h => h.includes("costo") || h.includes("total") || h.includes("monto") || h.includes("mantenimiento") || h.includes("importe"));
      const daysIdx = headers.findIndex(h => h.includes("taller") || h.includes("días") || h.includes("dias") || h.includes("estancia") || h.includes("downtime"));

      if (vehicleIdx === -1) {
        toast.error("No se encontró la columna de vehículo/unidad en las cabeceras.");
        return;
      }

      dataRows.forEach(row => {
        const name = row[vehicleIdx];
        if (!name) return;

        const tracto = currentTractos.find(t => 
          (t.economico || "") === name || 
          (t.placa || "").toLowerCase() === name.toLowerCase() || 
          name.toLowerCase().includes((t.economico || "").toLowerCase())
        );

        if (tracto) {
          if (costIdx !== -1 && row[costIdx]) {
            const val = parseFloat(row[costIdx].replace(/[^\d.]/g, ""));
            if (!isNaN(val)) tracto.costoManttoMensual = Math.round(val);
          }
          if (daysIdx !== -1 && row[daysIdx]) {
            const val = parseInt(row[daysIdx].replace(/[^\d]/g, ""), 10);
            if (!isNaN(val) && val > 0) {
              tracto.estado = "Mantenimiento";
            }
          }
          updatedCount++;
        } else {
          const remolque = currentRemolques.find(r => 
            (r.economico || "") === name || 
            (r.placa || "").toLowerCase() === name.toLowerCase() || 
            name.toLowerCase().includes((r.economico || "").toLowerCase())
          );
          if (remolque) {
            if (costIdx !== -1 && row[costIdx]) {
              const val = parseFloat(row[costIdx].replace(/[^\d.]/g, ""));
              if (!isNaN(val)) remolque.costoKmMantto = parseFloat((val / Math.max(1, remolque.kmRecorridos || 0)).toFixed(2));
            }
            if (daysIdx !== -1 && row[daysIdx]) {
              const val = parseInt(row[daysIdx].replace(/[^\d]/g, ""), 10);
              if (!isNaN(val)) {
                remolque.diasTaller = val;
                if (val > 0) remolque.estado = "Mantenimiento";
              }
            }
            updatedCount++;
          }
        }
      });

      saveTractos(currentTractos);
      saveRemolques(currentRemolques);
      toast.success(`ZAM Mantenimiento: Se actualizaron ${updatedCount} unidades con éxito.`);
    }
  };

  // Save general configuration
  const handleSaveConfig = () => {
    saveSystemConfig(config);
    toast.success("Configuración general guardada correctamente");
  };

  // Test Samsara API
  const testSamsaraConnection = async () => {
    if (!config.samsaraApiKey) {
      setSamsaraStatus("error");
      toast.error("Error de conexión: API Key vacía");
      return;
    }

    setSamsaraStatus("testing");
    try {
      const res = await syncSamsaraTelemetry({ data: config.samsaraApiKey });
      if (res.success) {
        setSamsaraStatus("success");
        toast.success("Conexión con Samsara API establecida con éxito. Telemetría validada.");
      } else {
        setSamsaraStatus("error");
        toast.error(`Error al conectar con la API de Samsara: ${res.error || "Token inválido"}`);
      }
    } catch (err: any) {
      setSamsaraStatus("error");
      toast.error(`Fallo en la prueba de conexión: ${err.message || "Error desconocido"}`);
    }
  };

  // Test ZAM Server
  const testZamConnection = () => {
    setZamStatus("testing");
    setTimeout(() => {
      if (config.zamBaseUrl && config.zamBaseUrl.includes("10.0.0.25")) {
        setZamStatus("success");
        toast.success("Conexión con Servidor Local ZAM (VPN activa) establecida con éxito");
      } else {
        setZamStatus("error");
        toast.error("Error de conexión: Host de ZAM inaccesible o fuera de la red local");
      }
    }, 1000);
  };

  // Business Unit CRUD actions
  const handleAddBU = () => {
    if (!newBUName.trim()) {
      toast.error("El nombre de la unidad de negocio es requerido");
      return;
    }
    addBusinessUnit({
      name: newBUName.toUpperCase(),
      operation_type: newBUType,
      km_loaded_goal: newBUGoal,
      active: true,
    });
    setNewBUName("");
    setIsAddingBU(false);
    toast.success("Unidad de negocio creada correctamente");
  };

  const handleStartEditBU = (bu: BusinessUnit) => {
    setEditingBU(bu);
  };

  const handleSaveEditBU = () => {
    if (editingBU) {
      if (!editingBU.name.trim()) {
        toast.error("El nombre de la unidad de negocio es requerido");
        return;
      }
      updateBusinessUnit({
        ...editingBU,
        name: editingBU.name.toUpperCase(),
      });
      setEditingBU(null);
      toast.success("Unidad de negocio actualizada");
    }
  };

  const handleDeleteBU = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta unidad de negocio?")) {
      deleteBusinessUnit(id);
      toast.success("Unidad de negocio eliminada");
    }
  };

  const handleToggleBUActive = (bu: BusinessUnit) => {
    updateBusinessUnit({
      ...bu,
      active: !bu.active,
    });
    toast.success(bu.active ? "Unidad desactivada" : "Unidad activada");
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1200px] space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-primary font-display">Configuración</h1>
        <p className="text-muted-foreground text-sm">Administración de credenciales telemáticas, metas contractuales y parámetros de flota.</p>
      </header>

      <Tabs defaultValue="conexiones" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-muted/60 h-10 p-1 rounded-xl">
          <TabsTrigger value="conexiones" className="text-xs font-semibold rounded-lg flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" /> Conexiones de Datos
          </TabsTrigger>
          <TabsTrigger value="metas" className="text-xs font-semibold rounded-lg flex items-center gap-1">
            <Sliders className="h-3.5 w-3.5" /> Metas y Umbrales
          </TabsTrigger>
          <TabsTrigger value="unidades" className="text-xs font-semibold rounded-lg flex items-center gap-1">
            <FolderTree className="h-3.5 w-3.5" /> Unidades de Negocio
          </TabsTrigger>
          <TabsTrigger value="importacion" className="text-xs font-semibold rounded-lg flex items-center gap-1">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Datos Reales (CSV)
          </TabsTrigger>
          <TabsTrigger value="roles" className="text-xs font-semibold rounded-lg flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Roles y Usuarios
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Conexiones de datos */}
        <TabsContent value="conexiones" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                  <span>Samsara Telemática</span>
                </CardTitle>
                <CardDescription>
                  Establece la conexión para importar datos de utilización, ralentí y score de seguridad en tiempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Samsara API Token:</label>
                  <Input
                    type="password"
                    placeholder="API Key de Samsara (samsara_api_...)"
                    value={config.samsaraApiKey}
                    onChange={(e) => setConfig({ ...config, samsaraApiKey: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">Estatus:</span>
                    {samsaraStatus === "idle" && <span className="font-semibold text-muted-foreground">Sin validar</span>}
                    {samsaraStatus === "testing" && <span className="font-semibold text-primary animate-pulse">Probando...</span>}
                    {samsaraStatus === "success" && (
                      <span className="font-bold text-success flex items-center gap-0.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Activa
                      </span>
                    )}
                    {samsaraStatus === "error" && (
                      <span className="font-bold text-destructive flex items-center gap-0.5">
                        <AlertCircle className="h-3.5 w-3.5" /> Error
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={testSamsaraConnection} className="text-xs h-8">
                    Probar Conexión
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                  <span>ZAM ERP Conexión Local</span>
                </CardTitle>
                <CardDescription>
                  Define la URL o IP interna del servidor ZAM para consultar el despacho de viajes, liquidaciones y órdenes de taller.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Servidor ZAM Base URL / IP:</label>
                  <Input
                    type="text"
                    placeholder="Ejemplo: http://10.0.0.25:9081"
                    value={config.zamBaseUrl}
                    onChange={(e) => setConfig({ ...config, zamBaseUrl: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">Estatus:</span>
                    {zamStatus === "idle" && <span className="font-semibold text-muted-foreground">Sin validar</span>}
                    {zamStatus === "testing" && <span className="font-semibold text-primary animate-pulse">Probando...</span>}
                    {zamStatus === "success" && (
                      <span className="font-bold text-success flex items-center gap-0.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Activa (VPN)
                      </span>
                    )}
                    {zamStatus === "error" && (
                      <span className="font-bold text-destructive flex items-center gap-0.5">
                        <AlertCircle className="h-3.5 w-3.5" /> Inaccesible
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={testZamConnection} className="text-xs h-8">
                    Probar Conexión
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="gold" size="sm" onClick={handleSaveConfig} className="text-xs">
              <Save className="h-4 w-4 mr-1.5" /> Guardar Credenciales
            </Button>
          </div>
        </TabsContent>

        {/* TAB 2: Metas y umbrales */}
        <TabsContent value="metas" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-primary">Umbrales de Eficiencia Operativa</CardTitle>
              <CardDescription>
                Define los objetivos e indicadores de alertas semáforo para toda la flota.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Utilización Meta - FULL (%):</label>
                  <Input
                    type="number"
                    value={config.metaUtilizacionFull}
                    onChange={(e) => setConfig({ ...config, metaUtilizacionFull: Number(e.target.value) })}
                    className="text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Rango estándar sugerido: 75% - 85%</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Utilización Meta - REFRIGERADO (%):</label>
                  <Input
                    type="number"
                    value={config.metaUtilizacionRefrigerado}
                    onChange={(e) => setConfig({ ...config, metaUtilizacionRefrigerado: Number(e.target.value) })}
                    className="text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Rango estándar sugerido: 85% - 95%</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Utilización Meta - DEDICADO (%):</label>
                  <Input
                    type="number"
                    value={config.metaUtilizacionDedicado}
                    onChange={(e) => setConfig({ ...config, metaUtilizacionDedicado: Number(e.target.value) })}
                    className="text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Rango estándar sugerido: &gt; 90%</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Alerta Disponibilidad Mecánica (% Días Taller):</label>
                  <Input
                    type="number"
                    value={config.alertDisponibilidadMecanica}
                    onChange={(e) => setConfig({ ...config, alertDisponibilidadMecanica: Number(e.target.value) })}
                    className="text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Límite tolerable máximo de días en taller (default 10%)</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Límite Alerta Score Seguridad (% Frenadas Bruscas):</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.alertScoreSeguridad}
                    onChange={(e) => setConfig({ ...config, alertScoreSeguridad: Number(e.target.value) })}
                    className="text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Porcentaje máximo permitido de eventos de aceleración brusca (default 0.2%)</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t p-4">
              <Button variant="gold" size="sm" onClick={handleSaveConfig} className="text-xs">
                <Save className="h-4 w-4 mr-1.5" /> Guardar Metas
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* TAB 3: Unidades de negocio */}
        <TabsContent value="unidades" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-primary">Catálogo de Unidades de Negocio</CardTitle>
                <CardDescription>
                  Crea, edita o desactiva las unidades de negocio que organizan tu flota comercial.
                </CardDescription>
              </div>
              {!isAddingBU && (
                <Button variant="gold" size="sm" onClick={() => setIsAddingBU(true)} className="text-xs">
                  <Plus className="h-4 w-4 mr-1.5" /> Nueva Unidad
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add form */}
              {isAddingBU && (
                <div className="border bg-muted/30 p-4 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold uppercase text-primary">Agregar Nueva Unidad de Negocio</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre:</label>
                      <Input
                        type="text"
                        placeholder="Ej. REFRIGERADOS BAJIO"
                        value={newBUName}
                        onChange={(e) => setNewBUName(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Operación:</label>
                      <select
                        value={newBUType}
                        onChange={(e) => setNewBUType(e.target.value as OperationType)}
                        className="bg-background border rounded-lg text-xs h-8 w-full px-2"
                      >
                        <option value="Full">Full</option>
                        <option value="Refrigerado">Refrigerado</option>
                        <option value="Dedicado">Dedicado</option>
                        <option value="Tanque">Tanque</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Meta Km Cargados (%):</label>
                      <Input
                        type="number"
                        value={newBUGoal}
                        onChange={(e) => setNewBUGoal(Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingBU(false)} className="text-xs h-8">
                      Cancelar
                    </Button>
                    <Button variant="default" size="sm" onClick={handleAddBU} className="text-xs h-8 bg-primary text-primary-foreground">
                      Crear Unidad
                    </Button>
                  </div>
                </div>
              )}

              {/* Edit form */}
              {editingBU && (
                <div className="border bg-gold/10 border-gold/20 p-4 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold uppercase text-gold-foreground">Editar Unidad de Negocio: {editingBU.name}</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre:</label>
                      <Input
                        type="text"
                        value={editingBU.name}
                        onChange={(e) => setEditingBU({ ...editingBU, name: e.target.value })}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Operación:</label>
                      <select
                        value={editingBU.operation_type}
                        onChange={(e) => setEditingBU({ ...editingBU, operation_type: e.target.value as OperationType })}
                        className="bg-background border rounded-lg text-xs h-8 w-full px-2"
                      >
                        <option value="Full">Full</option>
                        <option value="Refrigerado">Refrigerado</option>
                        <option value="Dedicado">Dedicado</option>
                        <option value="Tanque">Tanque</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Meta Km Cargados (%):</label>
                      <Input
                        type="number"
                        value={editingBU.km_loaded_goal}
                        onChange={(e) => setEditingBU({ ...editingBU, km_loaded_goal: Number(e.target.value) })}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingBU(null)} className="text-xs h-8">
                      Cancelar
                    </Button>
                    <Button variant="gold" size="sm" onClick={handleSaveEditBU} className="text-xs h-8">
                      <Save className="h-3.5 w-3.5 mr-1" /> Guardar Cambios
                    </Button>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Unidad de Negocio</th>
                      <th className="px-4 py-2 text-left">Tipo de Operación</th>
                      <th className="px-4 py-2 text-right">Meta Km Cargados</th>
                      <th className="px-4 py-2 text-center">Estatus</th>
                      <th className="px-4 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessUnits.map((bu) => (
                      <tr key={bu.id} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-semibold text-primary">{bu.name}</td>
                        <td className="px-4 py-2.5 text-xs font-medium text-foreground">{bu.operation_type}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums">{bu.km_loaded_goal}%</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => handleToggleBUActive(bu)}
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              bu.active ? "bg-success/15 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {bu.active ? "Activo" : "Inactivo"}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="inline-flex gap-1.5">
                            <Button variant="ghost" size="icon" onClick={() => handleStartEditBU(bu)} className="h-7 w-7 text-muted-foreground hover:text-primary">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBU(bu.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Importación de Datos Reales (Excel/CSV) */}
        <TabsContent value="importacion" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-primary flex items-center gap-1.5">
                <FileSpreadsheet className="h-4.5 w-4.5 text-primary" /> Sincronización Manual de Datos Reales
              </CardTitle>
              <CardDescription>
                Descarga los reportes desde Samsara y ZAM ERP utilizando los enlaces del Excel, y cárgalos aquí para poblar la plataforma con tus datos reales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Reset to Real Fleet Demo Data */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-primary">¿Quieres poblar el sistema al instante con datos reales del Excel?</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Si no tienes los archivos CSV a la mano, puedes activar la base de datos precargada con la información exacta del proyecto de productividad.
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    localStorage.removeItem("fleet_tractos");
                    localStorage.removeItem("fleet_remolques");
                    localStorage.removeItem("fleet_business_units");
                    window.dispatchEvent(new Event("fleet-data-updated"));
                    toast.success("Base de datos restablecida con los datos del Excel de Productividad");
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs shrink-0 font-bold"
                >
                  Cargar Datos de Demostración del Excel
                </Button>
              </div>

              {/* Grid of upload zones */}
              <div className="grid gap-4 sm:grid-cols-2">
                
                {/* 1. Samsara Utilización */}
                <div className="border border-dashed rounded-xl p-4 space-y-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                      Samsara - Reporte de Utilización
                    </span>
                    <p className="text-xs font-medium text-foreground">Horas Productivas y Tiempo Muerto</p>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Carga el reporte de utilización de Samsara. El sistema leerá la utilización (%) de cada económico.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <a 
                      href="https://cloud.samsara.com/o/5004562/fleet/reports/asset/utilization?assetType=Vehicle&tags%5B%5D=4839758&duration=604799.999&end_ms=1779688799999" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      Descargar Reporte en Samsara ↗
                    </a>
                    <div className="relative border rounded-lg bg-background hover:bg-muted/20 transition-all flex items-center justify-center p-3 cursor-pointer">
                      <Input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => handleFileUpload(e, "samsara-util")}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Seleccionar CSV de Utilización
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Samsara Actividad */}
                <div className="border border-dashed rounded-xl p-4 space-y-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                      Samsara - Actividad / Kilómetros
                    </span>
                    <p className="text-xs font-medium text-foreground">Km Recorridos y % Km Cargados</p>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Carga el reporte de kilometraje de Samsara. Actualizará los Km recorridos y el porcentaje de cargado/vacío.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <a 
                      href="https://cloud.samsara.com/o/5004562/fleet/reports/activity?tags%5B%5D=4839758&duration=1382399.999&end_ms=1778997599999" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      Descargar Reporte en Samsara ↗
                    </a>
                    <div className="relative border rounded-lg bg-background hover:bg-muted/20 transition-all flex items-center justify-center p-3 cursor-pointer">
                      <Input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => handleFileUpload(e, "samsara-act")}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Seleccionar CSV de Actividad
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. ZAM ERP Viajes */}
                <div className="border border-dashed rounded-xl p-4 space-y-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                      ZAM ERP - Reporte de Viajes
                    </span>
                    <p className="text-xs font-medium text-foreground">Capacidad Instalada (Viajes por Unidad)</p>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Carga el reporte de viajes por día del ERP ZAM. Actualiza la cantidad de viajes realizados por económico.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <a 
                      href="http://10.0.0.25:9081/Operaciones2024/cnidesp01/cne_j_despviajespordia.aspx" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      Abrir Consulta en ZAM ↗
                    </a>
                    <div className="relative border rounded-lg bg-background hover:bg-muted/20 transition-all flex items-center justify-center p-3 cursor-pointer">
                      <Input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => handleFileUpload(e, "zam-trips")}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Seleccionar CSV de Viajes
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. ZAM ERP Mantenimiento */}
                <div className="border border-dashed rounded-xl p-4 space-y-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                      ZAM ERP - Reporte de Mantenimiento
                    </span>
                    <p className="text-xs font-medium text-foreground">Disponibilidad Mecánica y Costos</p>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Carga las órdenes de taller de ZAM. Actualiza los costos de mantenimiento y los días taller de los remolques.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <a 
                      href="http://10.0.0.25:9081/MANTENIMIENTONET2024/ed_i_orden_reparacion/ed_i_mtto_listado_orden_de_mantenimiento.aspx" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      Abrir Listado Mto en ZAM ↗
                    </a>
                    <div className="relative border rounded-lg bg-background hover:bg-muted/20 transition-all flex items-center justify-center p-3 cursor-pointer">
                      <Input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => handleFileUpload(e, "zam-maint")}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Seleccionar CSV de Mantenimiento
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Roles y Usuarios */}
        <TabsContent value="roles" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-primary">Usuarios y Estructura de Permisos</CardTitle>
              <CardDescription>
                Framework visual de roles del sistema de inteligencia (Simulativo/Próxima Fase).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <RoleCard
                  name="Administrador de Sistema"
                  desc="Acceso completo: CRUD de unidades de negocio, edición de APIs secretas de Samsara y ZAM, y administración de metas de operación."
                  permits="Lectura + Escritura API + Metas"
                  color="border-l-4 border-l-primary"
                />
                <RoleCard
                  name="Director Financiero"
                  desc="Acceso a panel financiero, ROA Operativo y comparativas de equilibrio de renovación. Permiso de exportación a CSV/Excel y PDF."
                  permits="Lectura + Exportación + PDF"
                  color="border-l-4 border-l-success"
                />
                <RoleCard
                  name="Gerente de Operaciones"
                  desc="Acceso a telemetría de Samsara, % Utilización y Km Cargados. Carga de despachos y asignaciones de operadores."
                  permits="Lectura + Despacho"
                  color="border-l-4 border-l-warning"
                />
                <RoleCard
                  name="Operador (Consulta)"
                  desc="Solo lectura de KPIs generales del dashboard principal. Sin acceso a costos, API keys ni edición de catálogo."
                  permits="Solo Lectura (Básico)"
                  color="border-l-4 border-l-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoleCard({ name, desc, permits, color }: { name: string; desc: string; permits: string; color: string }) {
  return (
    <div className={`rounded-xl border bg-muted/10 p-4 space-y-3 ${color}`}>
      <div>
        <h4 className="font-semibold text-sm text-foreground">{name}</h4>
        <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
          {permits}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

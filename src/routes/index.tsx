import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Truck,
  Container,
  TrendingUp,
  Activity,
  DollarSign,
  Clock,
  Shield,
  Gauge,
  Sparkles,
  Download,
  Send,
  HelpCircle,
  Play,
  RotateCcw,
  Sliders,
  Bell,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Globe,
  Award,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  Line,
  PieChart,
  Pie,
  ReferenceLine,
} from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getTractos,
  getRemolques,
  getBusinessUnits,
  getSystemConfig,
  formatUSD,
  Tracto,
  Remolque,
  BusinessUnit,
  SystemConfig,
  saveTractos,
  saveRemolques,
  syncAllFromSamsara,
} from "@/lib/database";
import { syncSamsaraTelemetry } from "@/lib/samsara";

// Monthly performance mock data for charts
const monthlyPerformanceData = [
  { mes: "Ene", utilizacion: 72, ventas: 142000, utilidad: 38000 },
  { mes: "Feb", utilizacion: 75, ventas: 156000, utilidad: 42500 },
  { mes: "Mar", utilizacion: 78, ventas: 168000, utilidad: 47800 },
  { mes: "Abr", utilizacion: 81, ventas: 175000, utilidad: 51200 },
  { mes: "May", utilizacion: 79, ventas: 171000, utilidad: 49600 },
  { mes: "Jun", utilizacion: 84, ventas: 188000, utilidad: 56400 },
  { mes: "Jul", utilizacion: 86, ventas: 195000, utilidad: 60100 },
  { mes: "Ago", utilizacion: 83, ventas: 182000, utilidad: 54300 },
];

const MONTH_COEFFICIENTS: Record<string, { factor: number; label: string }> = {
  "Junio": { factor: 1.0, label: "Junio 2026 (Curso)" },
  "Mayo": { factor: 0.95, label: "Mayo 2026" },
  "Abril": { factor: 0.91, label: "Abril 2026" },
  "Marzo": { factor: 0.88, label: "Marzo 2026" },
  "Acumulado": { factor: 5.2, label: "Acumulado Año (Ene-Jun)" },
};

// List of live telemetry simulation log messages
const telemetryMessages = [
  "🟢 GPS: Unidad #101 reporta arribo a Terminal Lázaro Cárdenas a tiempo.",
  "🟡 Samsara: Unidad #106 Kenworth T680 reporta ralentí excesivo (22 min) en Celaya.",
  "🔴 Taller ZAM: OR #22410 creada para Unidad #103 Kenworth T680 por falla en balatas.",
  "🟢 GPS: Unidad #102 cruzando caseta Tepotzotlán a 82 km/h con destino a Lagos.",
  "🟢 Liquidación ERP: Liquidado viaje #44180 de Unidad #107 Refinados Mina.",
  "🟡 Samsara: Alerta de frenada brusca (0.22G) en Unidad #109 Lubricantes Jumbo.",
  "🟢 GPS: Unidad #104 reporta salida de planta Bachoco Celaya cargado.",
  "🔴 Taller ZAM: Unidad #110 (Freightliner Cascadia) programado para mantenimiento preventivo mañana.",
  "🟢 Samsara: Rendimiento promedio de combustible óptimo (2.75 km/L) en Unidad #110.",
  "🟡 Liquidación ERP: Viaje en tránsito #44192 reporta retraso de 15 min por tráfico.",
];

const getShortName = (fullName: string) => {
  if (!fullName) return "";
  const name = fullName.toUpperCase();
  if (name.includes("LAZARO")) return "Ref. Lázaro";
  if (name.includes("MINA")) return "Ref. Mina";
  if (name.includes("VERACRUZ")) return "Ref. Veracruz";
  if (name.includes("LAGOS")) return "Bac. Lagos";
  if (name.includes("CELAYA")) return "Bac. Celaya";
  if (name.includes("AGUASCALIENTES")) return "Bac. Ags.";
  if (name.includes("LUBRICANTES JUMBO")) return "Lub. Jumbo";
  if (name.includes("LUBRICANTES FULL")) return "Lub. Full";
  if (name.includes("REFRIGERADOS")) return "Refrigerados";
  if (name.includes("BULKMATIC")) return "Bulkmatic";
  if (name.includes("POZA RICA")) return "Ref. Poza Rica";
  if (name.includes("PROCESADO")) return "Bac. Procesado";
  if (name.includes("CLIENTES")) return "Bac. Clientes";
  if (name.includes("DRAGON CARGO")) return "Dragon Cargo";
  return fullName;
};

// Micro-sparkline helper component for cards
function Sparkline({ values, color = "#3B82F6" }: { values: number[]; color?: string }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min === 0 ? 1 : max - min;
  const width = 80;
  const height = 24;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible opacity-70 ml-2">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Ejecutivo — Centro de Inteligencia Corporativa" },
      { name: "description", content: "Panel de control de productividad de tu flota: utilización, carga útil, venta por km, tiempo muerto y utilidad real." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [tractos, setTractos] = useState<Tracto[]>(getTractos());
  const [remolques, setRemolques] = useState<Remolque[]>(getRemolques());
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>(getBusinessUnits());
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getSystemConfig());
  const [isLoading, setIsLoading] = useState(false);

  // BI Slicers / Filters
  const [buFilter, setBuFilter] = useState<string>("TODAS");
  const [opFilter, setOpFilter] = useState<string>("TODAS");
  const [monthFilter, setMonthFilter] = useState<string>("Junio");
  const [biTab, setBiTab] = useState<"consolidada" | "tractos" | "remolques">("consolidada");
  const [activeKpi, setActiveKpi] = useState<"equipoAsignado" | "utilizacion" | "kmCargados" | "renovacion" | "capacidad">("equipoAsignado");
  const [mapSearch, setMapSearch] = useState<string>("");
  const [leafletLoaded, setLeafletLoaded] = useState<boolean>(false);
  const [mapFilterMode, setMapFilterMode] = useState<"todos" | "movimiento" | "detenidos">("todos");
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite">("dark");
  const [mapCluster, setMapCluster] = useState<boolean>(true);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterGroupRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [metaUtilizacion, setMetaUtilizacion] = useState<number>(70);



  const getBUOperationType = (buName: string) => {
    if (!buName) return "Dedicado";
    const bu = businessUnits.find(u => (u.name || "").toUpperCase() === buName.toUpperCase());
    return bu ? bu.operation_type : "Dedicado";
  };

  const filteredTractos = tractos.filter((t) => {
    const matchesBU = buFilter === "TODAS" || (t.unidadNegocio || "").toUpperCase() === buFilter.toUpperCase();
    const matchesOp = opFilter === "TODAS" || getBUOperationType(t.unidadNegocio) === opFilter;
    return matchesBU && matchesOp;
  });

  const filteredRemolques = remolques.filter((r) => {
    const matchesBU = buFilter === "TODAS" || (r.unidadNegocio || "").toUpperCase() === buFilter.toUpperCase();
    const matchesOp = opFilter === "TODAS" || getBUOperationType(r.unidadNegocio) === opFilter;
    return matchesBU && matchesOp;
  });

  const getFilteredExcelData = () => {
    const factor = MONTH_COEFFICIENTS[monthFilter]?.factor || 1.0;

    const BU_MAPPING = [
      { dbKey: "BACHOCO CELAYA", display: "BACHOCO CELAYA POL" },
      { dbKey: "BACHOCO CLIENTES", display: "BACHOCO CELAYA CLIE" },
      { dbKey: "BACHOCO AGUASCALIENTES", display: "BACHOCO AGUAS ALIM" },
      { dbKey: "BACHOCO LAGOS", display: "BACHOCO LAGOS POLL" },
      { dbKey: "BACHOCO PROCESADO", display: "BACHOCO PROCESADO" },
      { dbKey: "LUBRICANTES JUMBO", display: "LUBRICANTES JUMBO" },
      { dbKey: "LUBRICANTES FULL", display: "LUBRICANTES FULL" },
      { dbKey: "REFINADOS LAZARO", display: "REFINADOS LAZARO" },
      { dbKey: "REFINADO MINA", display: "REFINADOS MINATITLA" },
      { dbKey: "REFINADOS VERACRUZ", display: "REFINADOS VERACRUZ" },
      { dbKey: "REFINADOS POZA RICA", display: "REFINADOS POZA RICA" },
      { dbKey: "BULKMATIC", display: "BULKMATIC" },
      { dbKey: "REFRIGERADOS", display: "REFRIGERADOS" },
      { dbKey: "DRAGON CARGO", display: "DCARGO" },
    ];

    return BU_MAPPING.map(item => {
      // Query database tractos for this specific business unit
      const buTractos = tractos.filter(t => (t.unidadNegocio || "").toUpperCase() === item.dbKey.toUpperCase());
      
      const venta = buTractos.reduce((sum, t) => sum + t.ventaPorKm * t.kmRecorridos, 0) * factor;
      const capInst = buTractos.length;
      const capUtil = buTractos.filter(t => t.estado === "Activo").length;
      
      // Compute Samsara and active utilization averages from database
      const totalSamsaraUtil = buTractos.reduce((sum, t) => sum + t.utilizacion, 0);
      const samsaraUtil = capInst > 0 ? (totalSamsaraUtil / capInst) / 100 : 0;

      const activeTractos = buTractos.filter(t => t.estado === "Activo");
      const totalCalcUtil = activeTractos.reduce((sum, t) => sum + t.utilizacion, 0);
      const calcUtil = capUtil > 0 ? (totalCalcUtil / capUtil) / 100 : 0;

      const proyInst = samsaraUtil > 0 ? venta * ((metaUtilizacion / 100) / samsaraUtil) : 0;
      const proyUtil = calcUtil > 0 ? venta * ((metaUtilizacion / 100) / calcUtil) : 0;

      return {
        area: item.display,
        venta,
        capInst,
        capUtil,
        samsaraUtil,
        calcUtil,
        proyInst,
        proyUtil,
      };
    }).filter(row => {
      if (buFilter === "TODAS") return true;
      
      const nameMap: Record<string, string[]> = {
        "REFINADOS LAZARO": ["REFINADOS LAZARO"],
        "REFINADO MINA": ["REFINADOS MINATITLA"],
        "REFINADOS VERACRUZ": ["REFINADOS VERACRUZ"],
        "BACHOCO LAGOS": ["BACHOCO LAGOS POLL"],
        "BACHOCO CELAYA": ["BACHOCO CELAYA POL"],
        "BACHOCO CLIENTES": ["BACHOCO CELAYA CLIE"],
        "BACHOCO AGUASCALIENTES": ["BACHOCO AGUAS ALIM"],
        "LUBRICANTES FULL": ["LUBRICANTES FULL"],
        "LUBRICANTES JUMBO": ["LUBRICANTES JUMBO"],
        "REFRIGERADOS": ["REFRIGERADOS"],
        "BULKMATIC": ["BULKMATIC"],
        "REFINADOS POZA RICA": ["REFINADOS POZA RICA"],
        "BACHOCO PROCESADO": ["BACHOCO PROCESADO"],
        "DRAGON CARGO": ["DCARGO"],
      };

      const targets = nameMap[buFilter] || [];
      return targets.some(target => row.area.toUpperCase() === target.toUpperCase());
    });
  };

  // Tab 2: Simulation States
  const [simUtil, setSimUtil] = useState<number>(82); // Initial avgUtil
  const [simRate, setSimRate] = useState<number>(2.46); // Initial avg sale/km
  const [simMaintReduction, setSimMaintReduction] = useState<number>(10); // Initial 10% saving

  // Tab 2: Live telemetry state
  const [logs, setLogs] = useState<string[]>([]);
  const logInterval = useRef<NodeJS.Timeout | null>(null);

  const triggerSync = async (silent = false) => {
    if (!systemConfig.samsaraApiKey) {
      if (!silent) {
        toast.error("API Key de Samsara vacía. Configúrala en 'Configuración > Conexiones de Datos' para sincronizar de forma real.", {
          duration: 5000,
        });
      }
      return;
    }

    setIsLoading(true);
    try {
      const res = await syncAllFromSamsara(systemConfig.samsaraApiKey);
      if (!res.success) {
        throw new Error(res.error || "Error al conectar con la API de Samsara");
      }

      if (res.matchCount > 0) {
        setTractos(getTractos());
        setRemolques(getRemolques());
        if (!silent) {
          toast.success(`Sincronización real completa: Se actualizaron ${res.matchCount} unidades desde Samsara API.`);
        }
      } else {
        if (!silent) {
          toast.warning(
            "API de Samsara respondió con éxito, pero ningún vehículo coincidió con el Inventario local (económico/placa)."
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        toast.error(`Error en sincronización real: ${err.message || "Error desconocido"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Populate logs initial state
    setLogs(telemetryMessages.slice(0, 4));

    if (typeof window !== "undefined") {
      const loadMarkerCluster = () => {
        // Load MarkerCluster CSS
        if (!document.getElementById("leaflet-cluster-css")) {
          const css1 = document.createElement("link");
          css1.id = "leaflet-cluster-css";
          css1.rel = "stylesheet";
          css1.href = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css";
          document.head.appendChild(css1);
        }
        if (!document.getElementById("leaflet-cluster-default-css")) {
          const css2 = document.createElement("link");
          css2.id = "leaflet-cluster-default-css";
          css2.rel = "stylesheet";
          css2.href = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css";
          document.head.appendChild(css2);
        }
        
        // Load MarkerCluster JS
        if (!document.getElementById("leaflet-cluster-js")) {
          const script = document.createElement("script");
          script.id = "leaflet-cluster-js";
          script.src = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js";
          script.async = true;
          script.onload = () => setLeafletLoaded(true);
          document.body.appendChild(script);
        } else {
          if ((window as any).L && (window as any).L.markerClusterGroup) {
            setLeafletLoaded(true);
          } else {
            const clusterInterval = setInterval(() => {
              if ((window as any).L && (window as any).L.markerClusterGroup) {
                setLeafletLoaded(true);
                clearInterval(clusterInterval);
              }
            }, 100);
          }
        }
      };

      // Load Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => loadMarkerCluster();
        document.body.appendChild(script);
      } else {
        if ((window as any).L) {
          loadMarkerCluster();
        } else {
          const interval = setInterval(() => {
            if ((window as any).L) {
              loadMarkerCluster();
              clearInterval(interval);
            }
          }, 100);
        }
      }
    }

    const handleUpdate = () => {
      const liveTractos = getTractos();
      const liveRemolques = getRemolques();
      setTractos(liveTractos);
      setRemolques(liveRemolques);
      setBusinessUnits(getBusinessUnits());
      setSystemConfig(getSystemConfig());

      // Update simulation base values
      const baseUtil = liveTractos.length
        ? Math.round(liveTractos.reduce((a, b) => a + b.utilizacion, 0) / liveTractos.length)
        : 82;
      const baseTotalKm = liveTractos.reduce((a, b) => a + (b.kmRecorridos || 0), 0);
      const baseRevenue = liveTractos.reduce((a, b) => a + (b.ventaPorKm || 0) * (b.kmRecorridos || 0), 0);
      const baseRate = baseTotalKm ? baseRevenue / baseTotalKm : 2.46;

      setSimUtil(baseUtil);
      setSimRate(parseFloat(baseRate.toFixed(2)));
    };

    window.addEventListener("fleet-data-updated", handleUpdate);

    // Trigger real-time sync automatically on mount
    triggerSync(true);

    // Telemetry ticker simulation interval
    logInterval.current = setInterval(() => {
      setLogs((prev) => {
        const activeUnits = getTractos().filter(t => t.estado === "Activo");
        const nextTracto = activeUnits[Math.floor(Math.random() * activeUnits.length)];
        const timeStr = new Date().toLocaleTimeString("es-MX", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        
        let msg = "";
        if (nextTracto) {
          const events = [
            `🟢 Samsara: Unidad #${nextTracto.economico} reporta Odométrico: ${(nextTracto.kmRecorridos || 0).toLocaleString()} km.`,
            `🟢 Samsara: Unidad #${nextTracto.economico} reporta motor encendido | Utilización: ${nextTracto.utilizacion || 0}%.`,
            `🟢 Samsara: Unidad #${nextTracto.economico} rendimiento promedio de combustible es de ${nextTracto.rendimiento || 0} km/L.`,
            `🟢 Samsara: Conducción en Unidad #${nextTracto.economico} | Score de seguridad: ${((nextTracto.scoreSeguridad || 0)*100).toFixed(2)}%`,
          ];
          msg = events[Math.floor(Math.random() * events.length)];
        } else {
          msg = "🟢 Samsara: Conexión telemática activa. Todos los códigos de falla limpios.";
        }
        
        const entry = `[${timeStr}] ${msg}`;
        return [entry, ...prev.slice(0, 7)];
      });
    }, 4500);

    // Background interval to auto-sync with Samsara API every 30 seconds
    const autoSyncInterval = setInterval(() => {
      triggerSync(true);
    }, 30000);

    return () => {
      window.removeEventListener("fleet-data-updated", handleUpdate);
      if (logInterval.current) clearInterval(logInterval.current);
      clearInterval(autoSyncInterval);
    };
  }, []);

  // 1. Initialize and clean up Leaflet map instance (runs once when library loaded)
  useEffect(() => {
    if (!leafletLoaded || typeof window === "undefined") return;
    const L = (window as any).L;
    if (!L) return;

    const mapContainer = document.getElementById("live-fleet-map");
    if (!mapContainer) return;

    if (!mapRef.current) {
      // Safe check: clear any leftover _leaflet_id associated with hot-reload or DOM states
      if ((mapContainer as any)._leaflet_id) {
        (mapContainer as any)._leaflet_id = null;
      }
      
      mapRef.current = L.map("live-fleet-map", {
        center: [19.8, -99.5], // Center of central/southern Mexico
        zoom: 6,
        zoomControl: true,
        maxZoom: 19,
        minZoom: 4,
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // 2. Manage layers and markers on map container
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || typeof window === "undefined") return;
    const L = (window as any).L;
    const map = mapRef.current;

    // Dynamically manage tile layer
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    if (mapStyle === "satellite") {
      tileLayerRef.current = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      }).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);
    }

    // Clear existing markers and cluster groups
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (clusterGroupRef.current) {
      clusterGroupRef.current.remove();
      clusterGroupRef.current = null;
    }

    // Filter tractos based on filters, search, and status modes
    const coordinateRegistry: Record<string, number> = {};

    const mapTractos = filteredTractos
      .filter(t => t.estado === "Activo" && t.latitude && t.longitude)
      .filter(t => {
        if (!mapSearch) return true;
        return (t.economico || "").toLowerCase().includes(mapSearch.toLowerCase()) ||
               (t.conductor || "").toLowerCase().includes(mapSearch.toLowerCase());
      })
      .filter(t => {
        if (mapFilterMode === "todos") return true;
        const speed = t.velocidad || 0;
        if (mapFilterMode === "movimiento") return speed > 0;
        return speed === 0;
      });

    const canCluster = typeof L.markerClusterGroup === "function";
    const shouldCluster = mapCluster && canCluster;

    let clusterGroup: any = null;
    if (shouldCluster) {
      clusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 16,
        iconCreateFunction: function (cluster: any) {
          const count = cluster.getChildCount();
          let colorClass = "bg-primary/95 text-primary-glow border-primary/40 shadow-[0_0_12px_rgba(59,130,246,0.5)]";
          if (count > 10) {
            colorClass = "bg-emerald-500/95 text-emerald-100 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.6)]";
          } else if (count > 5) {
            colorClass = "bg-amber-500/95 text-amber-100 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.6)]";
          }
          return L.divIcon({
            html: `<div class="flex items-center justify-center rounded-full font-black font-sans text-xs border backdrop-blur-md ${colorClass}" style="width: 30px; height: 30px;">${count}</div>`,
            className: 'custom-leaflet-cluster-icon',
            iconSize: [30, 30]
          });
        }
      });
      clusterGroupRef.current = clusterGroup;
    }

    mapTractos.forEach(t => {
      let lat = t.latitude || 20;
      let lon = t.longitude || -99;

      // Disperse overlaps in a spiral only if NOT clustering
      if (!shouldCluster) {
        const coordKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
        if (coordinateRegistry[coordKey] === undefined) {
          coordinateRegistry[coordKey] = 0;
        } else {
          coordinateRegistry[coordKey]++;
        }
        const overlapIndex = coordinateRegistry[coordKey];
        if (overlapIndex > 0) {
          const angle = overlapIndex * 1.0;
          const radius = 0.03 + overlapIndex * 0.012; // degrees offset
          lat += Math.sin(angle) * radius * 0.7;
          lon += Math.cos(angle) * radius;
        }
      }

      const speed = t.velocidad || 0;
      const isMoving = speed > 0;
      const pinColorClass = speed > 0 ? "bg-emerald-500" : "bg-amber-500";
      const pinGlowClass = speed > 0 ? "shadow-[0_0_8px_#10B981]" : "shadow-[0_0_8px_#F59E0B]";
      
      // Create custom div icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: `
          <div class="relative group/marker">
            ${isMoving ? `<span class="absolute -inset-1.5 rounded-full border border-emerald-500/40 animate-ping opacity-60 pointer-events-none"></span>` : ''}
            <div class="h-2.5 w-2.5 rounded-full ${pinColorClass} ${pinGlowClass} border border-white/20 transition-transform"></div>
            <div class="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 bg-slate-900/90 border border-slate-700/80 px-1 py-0.2 rounded text-[7px] text-slate-300 font-mono tracking-tighter opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none">
              ${t.economico}
            </div>
          </div>
        `,
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      });

      // Create popup content
      const popupContent = `
        <div class="text-[11px] p-2 space-y-1 bg-slate-900 text-white rounded-lg border border-slate-750 max-w-[200px]">
          <div class="flex justify-between items-center border-b border-slate-700 pb-1 font-bold">
            <span class="text-emerald-400">#${t.economico}</span>
            <span class="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">${t.estado}</span>
          </div>
          <div><span class="text-slate-400">Tipo:</span> <span class="bg-primary/20 text-primary border border-primary/30 px-1 py-0.2 rounded text-[9px] font-black uppercase">Tractocamión</span></div>
          <div><span class="text-slate-400">Modelo:</span> <b>${t.modelo}</b></div>
          <div><span class="text-slate-400">Placas:</span> <b>${t.placa}</b></div>
          <div><span class="text-slate-400">Operador:</span> <b>${t.conductor}</b></div>
          <div><span class="text-slate-400">Negocio:</span> <b>${t.unidadNegocio}</b></div>
          <div class="border-t border-slate-800 pt-1 flex justify-between font-extrabold text-emerald-400 text-xs">
            <span>Velocidad:</span>
            <span>${speed} km/h</span>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lon], { icon: customIcon })
        .bindPopup(popupContent, { className: 'custom-leaflet-popup' });

      if (shouldCluster) {
        clusterGroup.addLayer(marker);
      } else {
        marker.addTo(map);
      }

      markersRef.current.push(marker);
    });

    if (shouldCluster) {
      map.addLayer(clusterGroup);
    }

    // Fit bounds of all markers if search is active
    if (mapTractos.length > 0 && mapSearch.trim().length > 0) {
      if (shouldCluster) {
        map.fitBounds(clusterGroup.getBounds().pad(0.2));
      } else {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.2));
      }
    }

  }, [leafletLoaded, filteredTractos, mapSearch, mapFilterMode, mapStyle, mapCluster]);

  const currentFactor = MONTH_COEFFICIENTS[monthFilter]?.factor || 1.0;

  // Fleet stats
  const activeTractos = filteredTractos.filter((t) => t.estado === "Activo");
  const totalKm = filteredTractos.reduce((a, b) => a + b.kmRecorridos, 0) * currentFactor;
  const totalRevenue = filteredTractos.reduce((a, b) => a + b.ventaPorKm * b.kmRecorridos, 0) * currentFactor;
  const totalUtility = filteredTractos.reduce((a, b) => a + b.utilidadReal, 0) * currentFactor;
  const totalDirectCosts = totalRevenue - totalUtility;
  const totalMaintCost = filteredTractos.reduce((a, b) => a + b.costoManttoMensual, 0) * currentFactor;

  // BASE KPI CALCULATIONS
  // 1. % Utilización
  const avgUtil = filteredTractos.length ? Math.round(filteredTractos.reduce((a, b) => a + b.utilizacion, 0) / filteredTractos.length) : 0;
  // 2. % Km Cargados
  const avgKmCargados = activeTractos.length ? Math.round(activeTractos.reduce((a, b) => a + b.kmCargadosPct, 0) / activeTractos.length) : 0;
  // 3. Capacidad Instalada (Viajes del mes / Unidad)
  const totalTrips = (filteredRemolques.reduce((a, b) => a + b.viajesMes, 0) + filteredTractos.reduce((a, b) => a + b.viajesMes, 0)) * currentFactor;
  const capInst = filteredTractos.length ? (totalTrips / filteredTractos.length).toFixed(1) : "0";
  // 4. Disponibilidad Mecánica
  const maintenanceCount = filteredTractos.filter((t) => t.estado === "Mantenimiento").length;
  const totalMaintDays = (maintenanceCount * 8) + filteredRemolques.reduce((a, b) => a + b.diasTaller, 0);
  const totalDays = (filteredTractos.length + filteredRemolques.length) * 30;
  const mechanicalAvailability = totalDays ? ((1 - totalMaintDays / totalDays) * 100) : 100;
  // 5. Operadores Activos (Operadores / Unidades)
  const totalOperadores = filteredTractos.filter(t => t.conductor && t.conductor !== "—" && t.conductor.trim() !== "").length;
  const avgOperadoresRatio = filteredTractos.length ? parseFloat((totalOperadores / filteredTractos.length).toFixed(2)) : 0;

  const revPerTracto = filteredTractos.length ? Math.round(totalRevenue / filteredTractos.length) : 0;
  const salePerKm = totalKm ? totalRevenue / totalKm : 0;
  const totalHours = filteredTractos.reduce((a, b) => a + (b.utilizacion / 100) * 720, 0);
  const prodPerHr = totalHours ? totalRevenue / totalHours : 0;
  const utilPerUnit = filteredTractos.length ? Math.round(totalUtility / filteredTractos.length) : 0;
  const costPerKm = totalKm ? totalDirectCosts / totalKm : 0;
  const avgRendimiento = activeTractos.length ? (activeTractos.reduce((a, b) => a + b.rendimiento, 0) / activeTractos.length).toFixed(2) : "0";
  const roa = (totalUtility * 12) / Math.max(1, filteredTractos.length * 120000) * 100;
  const avgSafetyScore = activeTractos.length ? activeTractos.reduce((a, b) => a + b.scoreSeguridad, 0) / activeTractos.length : 0;
  const maintCostPerKm = totalKm ? totalMaintCost / totalKm : 0;
  const unitsToRenew = filteredTractos.filter((t) => t.costoManttoMensual + t.combustibleExcedenteCosto > 1500).length;

  // SIMULATOR FORMULAS (EBITDA Projection)
  const simulatedRevenue = totalKm * simRate * (simUtil / Math.max(1, avgUtil));
  const simulatedMaintCost = totalMaintCost * (1 - simMaintReduction / 100);
  const simulatedDirectCosts = totalDirectCosts - totalMaintCost + simulatedMaintCost;
  const simulatedUtility = simulatedRevenue - simulatedDirectCosts;
  const simulatedEbitdaDelta = simulatedUtility - totalUtility;
  const simulatedMargin = simulatedRevenue ? (simulatedUtility / simulatedRevenue) * 100 : 0;

  // Scatter plot data mapping (x: cost/km, y: sale/km, z: economic)
  const scatterData = filteredTractos
    .filter(t => t.estado !== "Inactivo")
    .map(t => ({
      name: `Tracto #${t.economico}`,
      costo: parseFloat(t.costoPorKm.toFixed(2)),
      venta: parseFloat(t.ventaPorKm.toFixed(2)),
      utilidad: t.utilidadReal,
      bu: t.unidadNegocio,
    }));

  // BI FLEET HUB CALCULATIONS
  const maintTractosCount = filteredTractos.filter(t => t.estado === "Mantenimiento").length;
  const maintRemolquesCount = filteredRemolques.filter(r => r.estado === "Mantenimiento").length;
  const dailyLoss = (maintTractosCount * 450) + (maintRemolquesCount * 150);
  const monthlyLoss = dailyLoss * 30;

  const biChartData = businessUnits
    .filter(bu => bu.active)
    .map(bu => {
      const buT = filteredTractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());
      const buR = filteredRemolques.filter(r => (r.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());
      
      const tActivo = buT.filter(t => t.estado === "Activo").length;
      const tInactivo = buT.filter(t => t.estado === "Inactivo").length;
      const tMaint = buT.filter(t => t.estado === "Mantenimiento").length;

      const rActivo = buR.filter(r => r.estado === "Activo").length;
      const rInactivo = buR.filter(r => r.estado === "Inactivo").length;
      const rMaint = buR.filter(r => r.estado === "Mantenimiento").length;

      let activo = 0;
      let inactivo = 0;
      let taller = 0;

      if (biTab === "consolidada") {
        activo = tActivo + rActivo;
        inactivo = tInactivo + rInactivo;
        taller = tMaint + rMaint;
      } else if (biTab === "tractos") {
        activo = tActivo;
        inactivo = tInactivo;
        taller = tMaint;
      } else {
        activo = rActivo;
        inactivo = rInactivo;
        taller = rMaint;
      }

      return {
        name: bu.name,
        shortName: getShortName(bu.name),
        Activo: activo,
        Inactivo: inactivo,
        Taller: taller,
        total: activo + inactivo + taller,
      };
    })
    .filter(d => d.total > 0);

  const tractosStatusData = [
    { name: "Activo", value: filteredTractos.filter(t => t.estado === "Activo").length, color: "#10B981" },
    { name: "Inactivo", value: filteredTractos.filter(t => t.estado === "Inactivo").length, color: "#EF4444" },
    { name: "Mantenimiento", value: filteredTractos.filter(t => t.estado === "Mantenimiento").length, color: "#F59E0B" },
  ].filter(d => d.value > 0);

  const remolquesStatusData = [
    { name: "Activo", value: filteredRemolques.filter(r => r.estado === "Activo").length, color: "#10B981" },
    { name: "Inactivo", value: filteredRemolques.filter(r => r.estado === "Inactivo").length, color: "#EF4444" },
    { name: "Mantenimiento", value: filteredRemolques.filter(r => r.estado === "Mantenimiento").length, color: "#F59E0B" },
  ].filter(d => d.value > 0);

  // BI Consola Explorer data calculations
  const buPerformanceData = businessUnits
    .filter(bu => bu.active)
    .map(bu => {
      const buTractos = filteredTractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());
      const buRemolques = filteredRemolques.filter(r => (r.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());

      // 1. % Utilización (promedio)
      const buUtil = buTractos.length 
        ? Math.round(buTractos.reduce((a, b) => a + b.utilizacion, 0) / buTractos.length) 
        : 0;

      // 2. % Km Cargados (promedio de los activos)
      const buActiveTractos = buTractos.filter(t => t.estado === "Activo");
      const buKmCargados = buActiveTractos.length
        ? Math.round(buActiveTractos.reduce((a, b) => a + b.kmCargadosPct, 0) / buActiveTractos.length)
        : 0;
      
      const buKmVacios = buActiveTractos.length ? (100 - buKmCargados) : 0;

      // 3. Punto de Equilibrio de Renovación (unidades críticas)
      const buUnitsToRenew = buTractos.filter(t => t.costoManttoMensual + t.combustibleExcedenteCosto > 1500).length;

      // 4. Capacidad Instalada (viajes del mes / unidad)
      const buTotalTrips = (buRemolques.reduce((a, b) => a + b.viajesMes, 0) + buTractos.reduce((a, b) => a + b.viajesMes, 0)) * currentFactor;
      const buCapInst = buTractos.length ? parseFloat((buTotalTrips / buTractos.length).toFixed(1)) : 0;

      // 5. Operadores Activos (Operadores / Unidades)
      const buOperadoresCount = buTractos.filter(t => t.conductor && t.conductor !== "—" && t.conductor.trim() !== "").length;
      const buOperadoresRatio = buTractos.length ? parseFloat((buOperadoresCount / buTractos.length).toFixed(2)) : 0;

      return {
        name: bu.name,
        shortName: getShortName(bu.name),
        utilizacion: buUtil,
        kmCargados: buKmCargados,
        kmVacios: buKmVacios,
        renovacion: buUnitsToRenew,
        capacidad: buCapInst,
        operadoresRatio: buOperadoresRatio,
        totalTractos: buTractos.length,
      };
    })
    .filter(d => d.totalTractos > 0);

  const sortedByUtil = [...buPerformanceData].sort((a, b) => b.utilizacion - a.utilizacion);
  const sortedByKm = [...buPerformanceData].sort((a, b) => b.kmCargados - a.kmCargados);
  const sortedByRenew = [...buPerformanceData].sort((a, b) => b.renovacion - a.renovacion);
  const sortedByCap = [...buPerformanceData].sort((a, b) => b.capacidad - a.capacidad);
  const sortedByEquipos = [...buPerformanceData].sort((a, b) => b.totalTractos - a.totalTractos);

  const getKpiDiagnostic = () => {
    switch (activeKpi) {
      case "utilizacion": {
        const top = sortedByUtil[0];
        const bottom = sortedByUtil[sortedByUtil.length - 1];
        return {
          title: "Diagnóstico de Utilización",
          topLabel: "Máxima Utilización",
          topName: top ? top.name : "N/A",
          topVal: top ? `${top.utilizacion}%` : "0%",
          bottomLabel: "Bajo Rendimiento",
          bottomName: bottom ? bottom.name : "N/A",
          bottomVal: bottom ? `${bottom.utilizacion}%` : "0%",
          insight: `La utilización consolidada está en ${avgUtil}%. ${top ? top.name : "N/A"} lidera con ${top ? top.utilizacion : 0}%, mientras que ${bottom ? bottom.name : "N/A"} se encuentra en zona crítica con ${bottom ? bottom.utilizacion : 0}%. Se sugiere coordinar con operaciones para reasignar unidades de las zonas inactivas.`,
        };
      }
      case "kmCargados": {
        const top = sortedByKm[0];
        const bottom = sortedByKm[sortedByKm.length - 1];
        return {
          title: "Eficiencia de Kilómetros",
          topLabel: "Mayor Km Cargado",
          topName: top ? top.name : "N/A",
          topVal: top ? `${top.kmCargados}%` : "0%",
          bottomLabel: "Mayor Km Vacío",
          bottomName: bottom ? bottom.name : "N/A",
          bottomVal: bottom ? `${100 - (bottom ? bottom.kmCargados : 0)}%` : "0%",
          insight: `El promedio de kilómetros cargados es de ${avgKmCargados}%. ${top ? top.name : "N/A"} mantiene el mejor aprovechamiento de ruta con ${top ? top.kmCargados : 0}%. Se recomienda revisar la logística de retorno y optimizar viajes vacíos de ${bottom ? bottom.name : "N/A"}.`,
        };
      }
      case "renovacion": {
        const top = sortedByRenew[sortedByRenew.length - 1]; // least critical units
        const bottom = sortedByRenew[0]; // most critical units
        return {
          title: "Punto de Equilibrio de Renovación",
          topLabel: "Flota Más Óptima",
          topName: top ? top.name : "N/A",
          topVal: top ? `${top.renovacion} uds.` : "0 uds.",
          bottomLabel: "Flota Crítica (Gastos Excesivos)",
          bottomName: bottom ? bottom.name : "N/A",
          bottomVal: bottom ? `${bottom.renovacion} uds.` : "0 uds.",
          insight: `Existen ${unitsToRenew} unidades críticas cuyo costo de mantenimiento y combustible excedente supera la mensualidad de un activo nuevo. Se recomienda priorizar la renovación en ${bottom ? bottom.name : "N/A"} para detener pérdidas financieras directas.`,
        };
      }
      case "capacidad": {
        const top = sortedByCap[0];
        const bottom = sortedByCap[sortedByCap.length - 1];
        return {
          title: "Rotación de Capacidad",
          topLabel: "Mayor Rotación",
          topName: top ? top.name : "N/A",
          topVal: top ? `${top.capacidad} viajes/ud` : "0",
          bottomLabel: "Menor Rotación",
          bottomName: bottom ? bottom.name : "N/A",
          bottomVal: bottom ? `${bottom.capacidad} viajes/ud` : "0",
          insight: `La capacidad instalada promedio es de ${capInst} viajes por unidad. ${top ? top.name : "N/A"} registra la mayor frecuencia de viajes. Es imperativo revisar la planeación de despachos y tiempos de carga de ${bottom ? bottom.name : "N/A"} para elevar el rendimiento global.`,
        };
      }
      case "equipoAsignado": {
        const top = sortedByEquipos[0];
        const bottom = sortedByEquipos[sortedByEquipos.length - 1];
        const totalAsignados = filteredTractos.length;
        return {
          title: "Distribución de Equipo Asignado",
          topLabel: "Mayor Flota Asignada",
          topName: top ? top.name : "N/A",
          topVal: top ? `${top.totalTractos} tractos` : "0",
          bottomLabel: "Menor Flota Asignada",
          bottomName: bottom ? bottom.name : "N/A",
          bottomVal: bottom ? `${bottom.totalTractos} tractos` : "0",
          insight: `El total de tractocamiones asignados a las divisiones activas es de ${totalAsignados} unidades. ${top ? top.name : "N/A"} concentra la mayor cantidad de activos. Esto nos ayuda a auditar la concentración de flota y justificar transferencias internas hacia terminales con sobredemanda de viajes.`,
        };
      }
    }
  };

  const diag = getKpiDiagnostic();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-[1400px]">
      <Tabs defaultValue="overview" className="space-y-6">
        
        {/* Elite Command Sub-Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Panel Corporativo</p>
            <h1 className="text-3xl font-extrabold text-primary font-display tracking-tight flex items-center gap-2 mt-1">
              Centro de Inteligencia Corporativa
            </h1>
          </div>
          <TabsList className="bg-muted/80 p-1 rounded-xl shrink-0 self-end">
            <TabsTrigger value="overview" className="text-xs font-semibold rounded-lg">Panel General</TabsTrigger>
            <TabsTrigger value="control-room" className="text-xs font-bold rounded-lg flex items-center gap-1 text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" /> Sala de Control
            </TabsTrigger>
            <TabsTrigger value="proyecciones" className="text-xs font-bold rounded-lg flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Proyecciones Financieras
            </TabsTrigger>
          </TabsList>
        </div>

        {/* BI Slicers Filter Bar (Global) */}
        <div className="flex flex-wrap gap-4 items-center justify-between p-4 rounded-xl border border-border/35 bg-card/40 backdrop-blur-md shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtros BI:</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Unidad de Negocio</span>
                <Select value={buFilter} onValueChange={setBuFilter}>
                  <SelectTrigger className="w-[200px] h-9 bg-background/50 border-border/40 text-xs font-semibold">
                    <SelectValue placeholder="Seleccionar BU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas las Unidades</SelectItem>
                    {businessUnits.map((bu) => (
                      <SelectItem key={bu.id} value={bu.name}>
                        {bu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Tipo de Operación</span>
                <Select value={opFilter} onValueChange={setOpFilter}>
                  <SelectTrigger className="w-[160px] h-9 bg-background/50 border-border/40 text-xs font-semibold">
                    <SelectValue placeholder="Seleccionar Operación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todos los Tipos</SelectItem>
                    <SelectItem value="Full">Full</SelectItem>
                    <SelectItem value="Refrigerado">Refrigerado</SelectItem>
                    <SelectItem value="Dedicado">Dedicado</SelectItem>
                    <SelectItem value="Tanque">Tanque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Mes de Operación</span>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-[180px] h-9 bg-background/50 border-border/40 text-xs font-semibold">
                    <SelectValue placeholder="Seleccionar Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(MONTH_COEFFICIENTS).map((key) => (
                      <SelectItem key={key} value={key}>
                        {MONTH_COEFFICIENTS[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center text-xs">
            {(buFilter !== "TODAS" || opFilter !== "TODAS" || monthFilter !== "Junio") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBuFilter("TODAS");
                  setOpFilter("TODAS");
                  setMonthFilter("Junio");
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpiar Filtros
              </Button>
            )}
            <div className="text-[11px] text-muted-foreground font-semibold bg-muted/40 px-3 py-1.5 rounded-lg border border-border/20">
              Mostrando: <span className="text-primary font-bold">{filteredTractos.length}</span> Tractos | <span className="text-primary font-bold">{filteredRemolques.length}</span> Remolques
            </div>
          </div>
        </div>

        {/* TAB 1: OVERVIEW (Existing Dashboard) */}
        <TabsContent value="overview" className="space-y-6">
          <section className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8 shadow-[var(--shadow-card)]">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            
            <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Operación & Productividad</p>
                <h2 className="text-2xl font-bold text-primary mt-1">Productividad de Transporte</h2>
                <p className="text-muted-foreground max-w-xl text-xs mt-1">
                  Visión consolidada del desempeño de tractos y remolques. Detecta unidades improductivas y maximiza tu utilidad real por kilómetro.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => triggerSync(false)} disabled={isLoading} className="text-xs">
                  <Activity className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                  Sincronizar Telemática
                </Button>
                <Button variant="gold" size="sm" className="text-xs">
                  <Send className="h-4 w-4 mr-1" /> Exportar Reporte
                </Button>
              </div>
            </div>
          </section>

          {/* BI FLEET HUB SUITE */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <div className="h-4 w-1 bg-primary rounded-full" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">📊 Centro de Control BI: Distribución de Equipo Asignado</h3>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Stacked Bar Chart Column */}
              <Card className="lg:col-span-2 shadow-[var(--shadow-card)] bg-card/65 backdrop-blur-lg border border-border/30 relative overflow-hidden flex flex-col h-full">
                <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4 shrink-0">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Distribución de Equipos por Unidad de Negocio
                    </CardTitle>
                    <CardDescription className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 leading-relaxed">
                      <span>Equipos activos, inactivos y en taller. Sincronizado en tiempo real.</span>
                      <span className="text-[9px] bg-muted/90 px-2 py-0.5 rounded border border-border/30 font-mono font-bold text-primary shrink-0">
                        Fórmula: Nº Tracto/Remolque por BU | Software: Samsara
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex bg-muted/70 p-0.5 rounded-lg border border-border/20 text-xs shrink-0">
                    <button
                      onClick={() => setBiTab("consolidada")}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-semibold transition-all",
                        biTab === "consolidada" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Consolidado
                    </button>
                    <button
                      onClick={() => setBiTab("tractos")}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-semibold transition-all",
                        biTab === "tractos" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Tractos
                    </button>
                    <button
                      onClick={() => setBiTab("remolques")}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-semibold transition-all",
                        biTab === "remolques" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Remolques
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-6 pt-0 flex flex-col min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
                    {/* Chart Area */}
                    <div className="md:col-span-2 flex flex-col h-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={biChartData}
                          margin={{ top: 10, right: 10, left: 30, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.05} />
                          <XAxis
                            dataKey="shortName"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                            angle={-25}
                            textAnchor="end"
                            interval={0}
                            height={60}
                          />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              borderColor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '11px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', marginTop: '-10px' }} />
                          <Bar dataKey="Activo" stackId="a" fill="#10B981" maxBarSize={24} />
                          <Bar dataKey="Taller" stackId="a" fill="#F59E0B" maxBarSize={24} />
                          <Bar dataKey="Inactivo" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} maxBarSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Numerical Summary Sidebar */}
                    <div className="border rounded-xl bg-background/30 backdrop-blur-md p-3 flex flex-col border-border/20 overflow-hidden h-full">
                      <div className="flex items-center justify-between border-b pb-1.5 mb-2 sticky top-0 bg-card/90 z-10 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Detalle de Equipos</span>
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase">Act | Tal | Ina | Tot</span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                        {biChartData.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-border/10 last:border-0 hover:bg-muted/40 px-1 rounded transition-colors">
                            <div className="truncate max-w-[150px] font-semibold text-foreground" title={d.name}>
                              {d.name}
                            </div>
                            <div className="flex gap-1 text-[9px] font-bold shrink-0">
                              <span className="bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded" title="Activo">
                                {d.Activo}
                              </span>
                              <span className="bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5 rounded" title="Taller">
                                {d.Taller}
                              </span>
                              <span className="bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded" title="Inactivo">
                                {d.Inactivo}
                              </span>
                              <span className="bg-muted text-muted-foreground border border-border/15 px-1.5 py-0.5 rounded" title="Total">
                                {d.total}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Donut and Cost of Opportunity Column */}
              <div className="space-y-6">
                {/* Estatus General Donut Charts */}
                <Card className="shadow-[var(--shadow-card)] bg-card/65 backdrop-blur-lg border border-border/30 relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
                      Estatus General de Flota
                    </CardTitle>
                    <CardDescription>Salud global de tractocamiones y remolques.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 py-4">
                    {/* Tractos Donut */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Tractocamiones</span>
                      <div className="h-[120px] w-full relative flex items-center justify-center">
                        {tractosStatusData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={tractosStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={45}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {tractosStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} uds.`, 'Cantidad']} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic text-center">Sin unidades</div>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-black text-foreground">{filteredTractos.length}</span>
                          <span className="text-[8px] uppercase text-muted-foreground font-semibold">Total</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-center mt-2">
                        {tractosStatusData.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-[8px] font-bold text-muted-foreground">{s.name}: {s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remolques Donut */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Remolques</span>
                      <div className="h-[120px] w-full relative flex items-center justify-center">
                        {remolquesStatusData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={remolquesStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={45}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {remolquesStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} uds.`, 'Cantidad']} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic text-center">Sin unidades</div>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-black text-foreground">{filteredRemolques.length}</span>
                          <span className="text-[8px] uppercase text-muted-foreground font-semibold">Total</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-center mt-2">
                        {remolquesStatusData.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-[8px] font-bold text-muted-foreground">{s.name}: {s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Costo de Oportunidad Card */}
                <Card className="shadow-[var(--shadow-card)] bg-card/65 backdrop-blur-lg border border-border/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-warning/5 rounded-full blur-xl pointer-events-none" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-warning" /> Costo de Oportunidad (Downtime)
                    </CardTitle>
                    <CardDescription>Valor perdido estimado por equipos retenidos en taller.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 border bg-muted/15 p-2.5 rounded-lg border-border/20 text-center">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Tractos en taller</span>
                        <p className="text-lg font-black text-warning">{maintTractosCount} uds.</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Remolques en taller</span>
                        <p className="text-lg font-black text-warning">{maintRemolquesCount} uds.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Costo de Downtime Diario:</span>
                        <span className="text-foreground">{formatUSD(dailyLoss)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Proyección Mensual (30d):</span>
                        <span className="text-destructive font-bold text-sm">{formatUSD(monthlyLoss)}</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-muted-foreground leading-normal bg-warning/10 p-2.5 rounded border border-warning/25">
                      💡 <span className="font-semibold text-warning-foreground">Fórmula:</span> Tracto $450 USD/día + Remolque $150 USD/día. Optimizar el tiempo de taller aumenta directamente el margen de utilidad.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Desempeño Financiero Consolidado Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Card 1: Venta Global Consolidada */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-card/85 via-card/55 to-background/90 border border-border/30 shadow-[var(--shadow-elegant)] backdrop-blur-xl group hover:border-primary/45 transition-all duration-300">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/15 transition-all duration-500 pointer-events-none" />
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/70">Desempeño Financiero</p>
                  <h3 className="text-sm font-extrabold text-foreground tracking-tight">Venta Global Consolidada</h3>
                  <div className="mt-2 flex items-center gap-4">
                    <p className="text-3xl font-black font-display text-primary tracking-tight flex items-baseline gap-1.5">
                      {formatUSD(totalRevenue)}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">MXN</span>
                    </p>
                    <Sparkline values={[142000, 156000, 168000, 175000, 171000, 188000]} color="var(--primary)" />
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    <span>Consolidando 14 Unidades de Negocio para <span className="font-semibold text-primary">{MONTH_COEFFICIENTS[monthFilter]?.label}</span></span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/25 shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Utilidad EBITDA Consolidada */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-card/85 via-card/55 to-background/90 border border-border/30 shadow-[var(--shadow-elegant)] backdrop-blur-xl group hover:border-success/45 transition-all duration-300">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-success/10 blur-2xl group-hover:bg-success/15 transition-all duration-500 pointer-events-none" />
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-success/70">Rentabilidad Global (EBITDA)</p>
                  <h3 className="text-sm font-extrabold text-foreground tracking-tight">Utilidad Consolidada EBITDA</h3>
                  <div className="mt-2 flex items-center gap-4">
                    <p className="text-3xl font-black font-display text-success tracking-tight flex items-baseline gap-1.5">
                      {formatUSD(totalUtility)}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">MXN</span>
                    </p>
                    <Sparkline values={[38000, 42500, 47800, 51200, 49600, 56400]} color="var(--success)" />
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-2">
                    <span className="bg-success/15 text-success border border-success/35 px-2 py-0.5 rounded font-bold">
                      Margen EBITDA: {totalRevenue ? ((totalUtility / totalRevenue) * 100).toFixed(1) : "0"}%
                    </span>
                    <span>• {MONTH_COEFFICIENTS[monthFilter]?.label}</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-success/10 rounded-xl flex items-center justify-center border border-success/25 shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Core 3 Categories of Cards */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-4 w-1 bg-primary rounded-full" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">📊 Consola Interactiva de BI: KPIs de Productividad</h3>
              </div>
              
              <div className="grid gap-6 lg:grid-cols-4">
                {/* Left Selectors Panel (1 column) */}
                <div className="flex flex-col gap-3 lg:col-span-1">
                  {/* Selector 1: Equipo Asignado */}
                  <button
                    onClick={() => setActiveKpi("equipoAsignado")}
                    className={cn(
                      "group text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[110px] backdrop-blur-md shadow-sm",
                      activeKpi === "equipoAsignado"
                        ? "bg-gradient-to-br from-primary/25 to-primary/5 border-primary shadow-[0_0_12px_rgba(59,130,246,0.2)] font-semibold"
                        : "bg-card/55 border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Equipo Asignado</span>
                      <span className="h-2 w-2 rounded-full bg-success" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between w-full">
                      <p className="text-2xl font-black font-display text-foreground">{filteredTractos.length} <span className="text-xs text-muted-foreground font-normal">uds.</span></p>
                      <span className="text-[10px] text-success font-semibold flex items-center">▲ 100%</span>
                    </div>
                    <div className="mt-1 flex flex-col text-[7.5px] text-muted-foreground/80 leading-tight">
                      <span className="font-bold text-primary-glow">Fórmula: Tractocamiones por BU</span>
                      <span>Meta: Distribución Óptima | Software: Samsara</span>
                    </div>
                  </button>

                  {/* Selector 2: Utilizacion */}
                  <button
                    onClick={() => setActiveKpi("utilizacion")}
                    className={cn(
                      "group text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[110px] backdrop-blur-md shadow-sm",
                      activeKpi === "utilizacion"
                        ? "bg-gradient-to-br from-primary/25 to-primary/5 border-primary shadow-[0_0_12px_rgba(59,130,246,0.2)] font-semibold"
                        : "bg-card/55 border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Utilización Unidad</span>
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        avgUtil >= 80 ? "bg-success" : avgUtil >= 70 ? "bg-warning" : "bg-destructive"
                      )} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between w-full">
                      <p className="text-2xl font-black font-display text-foreground">{avgUtil}%</p>
                      <span className="text-[10px] text-success font-semibold flex items-center">▲ 4%</span>
                    </div>
                    <div className="mt-1 flex flex-col text-[7.5px] text-muted-foreground/80 leading-tight">
                      <span className="font-bold text-primary-glow">Fórmula: (Horas Prod / Horas Disp) × 100</span>
                      <span>Meta: 80% | Software: Samsara + ZAM</span>
                    </div>
                  </button>

                  {/* Selector 3: Km Cargados */}
                  <button
                    onClick={() => setActiveKpi("kmCargados")}
                    className={cn(
                      "group text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[110px] backdrop-blur-md shadow-sm",
                      activeKpi === "kmCargados"
                        ? "bg-gradient-to-br from-primary/25 to-primary/5 border-primary shadow-[0_0_12px_rgba(59,130,246,0.2)] font-semibold"
                        : "bg-card/55 border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">% Km Cargados</span>
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        avgKmCargados >= 60 ? "bg-success" : avgKmCargados >= 50 ? "bg-warning" : "bg-destructive"
                      )} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between w-full">
                      <p className="text-2xl font-black font-display text-foreground">{avgKmCargados}%</p>
                      <span className="text-[10px] text-success font-semibold flex items-center">▲ 2%</span>
                    </div>
                    <div className="mt-1 flex flex-col text-[7.5px] text-muted-foreground/80 leading-tight">
                      <span className="font-bold text-primary-glow">Fórmula: (Km Cargados / Km Totales) × 100</span>
                      <span>Meta: &gt;50% | Software: Samsara</span>
                    </div>
                  </button>

                  {/* Selector 4: Renovacion */}
                  <button
                    onClick={() => setActiveKpi("renovacion")}
                    className={cn(
                      "group text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[110px] backdrop-blur-md shadow-sm",
                      activeKpi === "renovacion"
                        ? "bg-gradient-to-br from-primary/25 to-primary/5 border-primary shadow-[0_0_12px_rgba(59,130,246,0.2)] font-semibold"
                        : "bg-card/55 border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Equilibrio Renovación</span>
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        unitsToRenew === 0 ? "bg-success" : unitsToRenew <= 2 ? "bg-warning" : "bg-destructive"
                      )} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between w-full">
                      <p className="text-2xl font-black font-display text-foreground">{unitsToRenew} uds.</p>
                      <span className="text-[10px] text-destructive font-semibold flex items-center">▼ 1%</span>
                    </div>
                    <div className="mt-1 flex flex-col text-[7.5px] text-muted-foreground/80 leading-tight">
                      <span className="font-bold text-primary-glow">Fórmula: (Costo Mtto + Comb. Exc.) vs Arrendamiento</span>
                      <span>Meta: 0 críticas | Software: ZAM + Samsara</span>
                    </div>
                  </button>

                  {/* Selector 5: Capacidad */}
                  <button
                    onClick={() => setActiveKpi("capacidad")}
                    className={cn(
                      "group text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[110px] backdrop-blur-md shadow-sm",
                      activeKpi === "capacidad"
                        ? "bg-gradient-to-br from-primary/25 to-primary/5 border-primary shadow-[0_0_12px_rgba(59,130,246,0.2)] font-semibold"
                        : "bg-card/55 border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Capacidad Instalada</span>
                      <span className="h-2 w-2 rounded-full bg-success" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between w-full">
                      <p className="text-2xl font-black font-display text-foreground">{capInst}</p>
                      <span className="text-[10px] text-success font-semibold flex items-center">▲ 5%</span>
                    </div>
                    <div className="mt-1 flex flex-col text-[7.5px] text-muted-foreground/80 leading-tight">
                      <span className="font-bold text-primary-glow">Fórmula: Viajes / Unidad</span>
                      <span>Meta: Frecuencia Mensual | Software: ZAM</span>
                    </div>
                  </button>
                </div>

                {/* Main Visual Display (2 columns) */}
                <Card className="lg:col-span-2 shadow-[var(--shadow-card)] bg-card/65 backdrop-blur-lg border border-border/30 relative overflow-hidden flex flex-col justify-between h-[590px]">
                  <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
                      Desglose Comparativo por Unidad de Negocio
                    </CardTitle>
                    <CardDescription className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 leading-relaxed">
                      <span>
                        Visualización de {activeKpi === "equipoAsignado" ? "Distribución de Flota" : activeKpi === "utilizacion" ? "Porcentaje de Utilización" : activeKpi === "kmCargados" ? "Eficiencia de Km" : activeKpi === "renovacion" ? "Unidades Excedidas en Renovación" : "Rotación de Viajes Mensuales"}
                      </span>
                      <span className="text-[9px] bg-muted/90 px-2 py-0.5 rounded border border-border/30 font-mono font-bold text-primary shrink-0">
                        {activeKpi === "equipoAsignado" && "Fórmula: Conteo de Tractocamiones por BU"}
                        {activeKpi === "utilizacion" && "Fórmula: (Horas Productivas / Horas Disponibles) × 100"}
                        {activeKpi === "kmCargados" && "Fórmula: (Km Cargados / Km Totales) × 100"}
                        {activeKpi === "renovacion" && "Fórmula: (Costo Mtto Mensual + Costo Combustible Excedente) vs Arrendamiento"}
                        {activeKpi === "capacidad" && "Fórmula: Viajes / Unidad"}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      {activeKpi === "equipoAsignado" ? (
                        <BarChart data={buPerformanceData} margin={{ top: 10, right: 10, left: 25, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.05} />
                          <XAxis dataKey="shortName" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} angle={-25} textAnchor="end" interval={0} height={60} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                          <Bar dataKey="totalTractos" name="Tractos Asignados" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={24} />
                        </BarChart>
                      ) : activeKpi === "utilizacion" ? (
                        <BarChart data={buPerformanceData} margin={{ top: 10, right: 10, left: 25, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.05} />
                          <XAxis dataKey="shortName" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} angle={-25} textAnchor="end" interval={0} height={60} />
                          <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                          <Bar dataKey="utilizacion" name="Utilización (%)" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={24}>
                            {buPerformanceData.map((entry: any, index) => (
                              <Cell key={`cell-${index}`} fill={entry.utilizacion >= 80 ? "#10B981" : entry.utilizacion >= 70 ? "#F59E0B" : "#EF4444"} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : activeKpi === "kmCargados" ? (
                        <BarChart data={buPerformanceData} margin={{ top: 10, right: 10, left: 25, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.05} />
                          <XAxis dataKey="shortName" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} angle={-25} textAnchor="end" interval={0} height={60} />
                          <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: '9px', marginTop: '-10px' }} />
                          <Bar dataKey="kmCargados" name="Km Cargados (%)" stackId="a" fill="#10B981" maxBarSize={24} />
                          <Bar dataKey="kmVacios" name="Km Vacíos (%)" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
                        </BarChart>
                      ) : activeKpi === "renovacion" ? (
                        <BarChart data={buPerformanceData} layout="vertical" margin={{ top: 10, right: 10, left: 15, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.05} />
                          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                          <YAxis dataKey="shortName" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} width={90} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                          <Bar dataKey="renovacion" name="Unidades Críticas" fill="#EF4444" radius={[0, 4, 4, 0]} maxBarSize={24} />
                        </BarChart>
                      ) : (
                        <AreaChart data={buPerformanceData} margin={{ top: 10, right: 10, left: 25, bottom: 30 }}>
                          <defs>
                            <linearGradient id="colorCapacidad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.05} />
                          <XAxis dataKey="shortName" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} angle={-25} textAnchor="end" interval={0} height={60} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                          <Area type="monotone" dataKey="capacidad" name="Viajes/Ud" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCapacidad)" />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Right Diagnostic Panel (1 column) */}
                <Card className="lg:col-span-1 shadow-[var(--shadow-card)] bg-card/65 backdrop-blur-lg border border-border/30 relative overflow-hidden flex flex-col justify-between h-[590px]">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-gold" /> Diagnóstico BI
                    </CardTitle>
                    <CardDescription>Análisis operativo calculado en base a la telemetría viva.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Top Performer */}
                      <div className="p-3 border rounded-xl bg-success/5 border-success/20">
                        <span className="text-[9px] uppercase font-bold text-success/80 tracking-wider block">{diag?.topLabel}</span>
                        <span className="text-xs font-bold text-foreground mt-0.5 block">{diag?.topName}</span>
                        <span className="text-lg font-black text-success mt-1 block">{diag?.topVal}</span>
                      </div>

                      {/* Worst Performer */}
                      <div className="p-3 border rounded-xl bg-destructive/5 border-destructive/20">
                        <span className="text-[9px] uppercase font-bold text-destructive/80 tracking-wider block">{diag?.bottomLabel}</span>
                        <span className="text-xs font-bold text-foreground mt-0.5 block">{diag?.bottomName}</span>
                        <span className="text-lg font-black text-destructive mt-1 block">{diag?.bottomVal}</span>
                      </div>
                    </div>

                    <div className="text-[10px] leading-relaxed text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/10">
                      <span className="font-semibold text-primary block mb-1">💡 Análisis de Consola:</span>
                      {diag?.insight}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-4 w-1 bg-success rounded-full" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-success">🟢 KPIs Financieros (Rentabilidad)</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Ingresos por Tracto"
                  value={formatUSD(revPerTracto)}
                  delta={6}
                  icon={DollarSign}
                  category="financial"
                  formula="Ingresos totales / Número de tractos"
                  meta="Positiva incremental"
                  progreso={85}
                  semaforo="green"
                  fuente="ZAM + Samsara"
                />
                <KpiCard
                  label="Venta por km"
                  value={`${formatUSD(salePerKm)}/km`}
                  delta={3}
                  icon={DollarSign}
                  category="financial"
                  formula="Ingresos totales / Kilómetros totales"
                  meta="FULL debe superar Sencillo"
                  progreso={Math.min(100, (salePerKm / 3.0) * 100)}
                  semaforo={salePerKm >= 2.3 ? "green" : salePerKm >= 2.0 ? "yellow" : "red"}
                  fuente="ZAM + Samsara"
                />
                <KpiCard
                  label="Productividad $/hora"
                  value={`${formatUSD(prodPerHr)}/hr`}
                  delta={4}
                  icon={Gauge}
                  category="financial"
                  formula="Ingresos totales / Horas operadas"
                  meta="Tendencia incremental"
                  progreso={78}
                  semaforo="green"
                  fuente="ZAM + Samsara"
                />
                <KpiCard
                  label="Utilidad por unidad"
                  value={formatUSD(utilPerUnit)}
                  delta={8}
                  icon={TrendingUp}
                  category="financial"
                  formula="Ingresos - Costos directos operativos"
                  meta="Positiva"
                  progreso={82}
                  semaforo={utilPerUnit > 10000 ? "green" : utilPerUnit > 0 ? "yellow" : "red"}
                  fuente="ZAM ERP"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="h-4 w-1 bg-warning rounded-full" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-warning">🔴 KPIs de Mantenimiento & Seguridad</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                  label="Disponibilidad Mecánica"
                  value={`${mechanicalAvailability.toFixed(1)}%`}
                  delta={1.2}
                  icon={Clock}
                  category="maintenance"
                  formula="(1 - Días taller / Días calendario) × 100"
                  meta="Meta: >90% disponible"
                  progreso={mechanicalAvailability}
                  semaforo={mechanicalAvailability >= 90 ? "green" : mechanicalAvailability >= 85 ? "yellow" : "red"}
                  fuente="ZAM + Samsara"
                />
                <KpiCard
                  label="Score de Seguridad"
                  value={`${(avgSafetyScore * 100).toFixed(2)}%`}
                  delta={-5}
                  icon={Shield}
                  category="maintenance"
                  formula="Eventos frenada brusca / Kilómetros"
                  meta="Meta: < 0.20% incidencias"
                  progreso={Math.max(0, 100 - (avgSafetyScore * 100 * 5))}
                  semaforo={avgSafetyScore <= 0.15 ? "green" : avgSafetyScore <= 0.20 ? "yellow" : "red"}
                  fuente="Samsara"
                />
                <KpiCard
                  label="Costo por km Mantto"
                  value={`${formatUSD(maintCostPerKm)}/km`}
                  delta={-4}
                  icon={Container}
                  category="maintenance"
                  formula="Costo mantenimiento / Kilómetros totales"
                  meta="Mantener bajo mensualidad nuevo activo"
                  progreso={Math.min(100, (0.3 / Math.max(0.05, maintCostPerKm)) * 100)}
                  semaforo={maintCostPerKm < 0.2 ? "green" : maintCostPerKm < 0.3 ? "yellow" : "red"}
                  fuente="ZAM + Samsara"
                />
              </div>
            </div>
          </div>


        </TabsContent>

        {/* TAB 2: SALA DE CONTROL (Premium High-Tech Dashboard) */}
        <TabsContent value="control-room" className="space-y-6">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl border bg-[#1E293B] p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="absolute top-0 right-0 h-40 w-40 bg-primary/20 rounded-full blur-2xl" />
            <div className="space-y-1 relative">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/30 border border-primary-glow/40 px-2.5 py-0.5 text-[10px] font-bold text-primary-glow">
                <Gauge className="h-3 w-3 animate-pulse" /> MONITOREO EJECUTIVO DE CONTROL ROOM
              </div>
              <h2 className="text-2xl font-black font-display tracking-tight mt-1">Sala de Control de Mandos</h2>
              <p className="text-slate-400 text-xs max-w-xl">
                Panel unificado para auditorías rápidas por directivos. Simula escenarios de impacto EBITDA, supervisa el heatmap de salud por Unidad de Negocio y monitorea el feed telemático vivo.
              </p>
            </div>
            <div className="flex gap-2 relative">
              <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-success animate-ping mt-1.5" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Canal Telemático:</span> Activo y sincronizado
              </div>
            </div>
          </div>

          {/* 1. NATIVE RADIAL DIALS (VELOCIMETROS) */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RadialGauge value={avgUtil} label="Utilización Flota" color="#3B82F6" icon={Activity} />
            <RadialGauge value={avgKmCargados} label="Km Cargados (Eficiencia)" color="#F59E0B" icon={Truck} />
            <RadialGauge value={Math.round(mechanicalAvailability)} label="Disponibilidad Mecánica" color="#10B981" icon={Clock} />
            
            {/* Net Income Summary Card */}
            <div className="bg-card/65 border rounded-xl p-5 shadow-sm flex flex-col justify-between backdrop-blur-md min-h-[160px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Utilidad Consolidada</span>
                <div className="h-8 w-8 bg-success/15 rounded-lg flex items-center justify-center text-success">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight font-display text-success">{formatUSD(totalUtility)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  EBITDA mensual de flota activa acumulada.
                </p>
              </div>
            </div>
          </section>

          {/* 2. HEATMAP Y BITACORA EN VIVO */}
          <section className="grid gap-4 lg:grid-cols-3">
            
            {/* BU Heatmap */}
            <Card className="lg:col-span-2 shadow-sm bg-card/65 backdrop-blur-md border">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase text-primary">Matriz de Salud Operativa (BU Heatmap)</CardTitle>
                <CardDescription>
                  Semáforo de cumplimiento de Unidades de Negocio. PR = Productividad | FN = Finanzas | MT = Mantenimiento.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {businessUnits.filter(bu => bu.active).map(bu => {
                  const data = getBUMetrics(bu, tractos, remolques, currentFactor);
                  return (
                    <div key={bu.id} className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-muted/40 transition-colors">
                      <div className="truncate max-w-[160px]">
                        <span className="text-xs font-bold text-foreground block truncate">{bu.name}</span>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{bu.operation_type}</span>
                      </div>
                      <div className="flex gap-2">
                        <HealthPill label="PR" status={data.pr} tooltip="Productividad (Utilización)" />
                        <HealthPill label="FN" status={data.fn} tooltip="Finanzas (Rentabilidad)" />
                        <HealthPill label="MT" status={data.mt} tooltip="Mantenimiento (Estancia taller)" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Live Telemetry Ticker */}
            <Card className="shadow-sm bg-card/65 backdrop-blur-md border flex flex-col justify-between h-[360px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase text-primary flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Feed de Telemetría Activo (Samsara + ERP)
                </CardTitle>
                <CardDescription>Eventos en vivo emitidos en tiempo real por la flota.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] text-muted-foreground pr-1">
                {logs.length === 0 ? (
                  <p className="text-center italic mt-12">Escuchando canal de telemetría...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-b border-dashed pb-1 last:border-0 hover:text-foreground transition-colors">
                      {log}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          {/* LIVE GPS CORRIDOR MAP & AI PREDICTIONS */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* Live GPS Corridor Map (2 columns) */}
            <Card className="lg:col-span-2 shadow-sm bg-card/65 backdrop-blur-md border relative overflow-hidden flex flex-col min-h-[500px]">
              <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-bold uppercase text-primary flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary animate-pulse" /> Consola de Rastreo GPS en Vivo (Mapa de Corredores)
                  </CardTitle>
                  <CardDescription>
                    Geolocalización en tiempo real de tractos activos en los corredores logísticos principales de México.
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {/* Vista Satelital Toggle */}
                  <div className="flex bg-muted/85 p-0.5 rounded-lg border border-border/20 text-[10px] shrink-0">
                    <button
                      type="button"
                      onClick={() => setMapStyle("dark")}
                      className={cn(
                        "px-2 py-1 rounded font-semibold transition-all cursor-pointer",
                        mapStyle === "dark" ? "bg-background shadow text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Oscuro
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapStyle("satellite")}
                      className={cn(
                        "px-2 py-1 rounded font-semibold transition-all cursor-pointer",
                        mapStyle === "satellite" ? "bg-background shadow text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Satélite
                    </button>
                  </div>

                  {/* Agrupamiento Toggle */}
                  <div className="flex bg-muted/85 p-0.5 rounded-lg border border-border/20 text-[10px] shrink-0">
                    <button
                      type="button"
                      onClick={() => setMapCluster(true)}
                      className={cn(
                        "px-2 py-1 rounded font-semibold transition-all cursor-pointer",
                        mapCluster ? "bg-background shadow text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Agrupar
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapCluster(false)}
                      className={cn(
                        "px-2 py-1 rounded font-semibold transition-all cursor-pointer",
                        !mapCluster ? "bg-background shadow text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Disperso
                    </button>
                  </div>

                  {/* Estatus Filters */}
                  <div className="flex bg-muted/85 p-0.5 rounded-lg border border-border/20 text-[10px] shrink-0">
                    <button
                      type="button"
                      onClick={() => setMapFilterMode("todos")}
                      className={cn(
                        "px-2 py-1 rounded font-semibold transition-all cursor-pointer",
                        mapFilterMode === "todos" ? "bg-background shadow text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilterMode("movimiento")}
                      className={cn(
                        "px-2 py-1 rounded font-semibold transition-all cursor-pointer",
                        mapFilterMode === "movimiento" ? "bg-background shadow text-success font-bold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      En Tránsito
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilterMode("detenidos")}
                      className={cn(
                        "px-2 py-1 rounded font-semibold transition-all cursor-pointer",
                        mapFilterMode === "detenidos" ? "bg-background shadow text-warning font-bold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Detenidos
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="relative w-full sm:w-40 shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Buscar unidad..."
                      value={mapSearch}
                      onChange={(e) => setMapSearch(e.target.value)}
                      className="pl-7 h-7 text-[10px] bg-background/50 border-border/40"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 relative bg-slate-950/75 border border-border/10 rounded-xl m-4 overflow-hidden min-h-[420px] p-0 shadow-inner">
                {!leafletLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-900/50 backdrop-blur-sm z-20">
                    <Activity className="h-8 w-8 text-primary animate-spin" />
                    <span className="text-xs font-semibold">Cargando Mapa Logístico en Vivo...</span>
                  </div>
                )}
                <div id="live-fleet-map" className="w-full h-full min-h-[420px] rounded-lg z-0" />
              </CardContent>
            </Card>

            {/* AI Predictive Analytics Panel (1 column) */}
            <Card className="lg:col-span-1 shadow-sm bg-card/65 backdrop-blur-md border relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase text-primary flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-gold animate-bounce" /> AI Predictive Analytics
                </CardTitle>
                <CardDescription>Análisis predictivo computado de telemetría e historial operativo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                
                {/* EBITDA AI Forecast */}
                <div className="space-y-2 border border-border/10 bg-slate-950/20 p-3 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proyección EBITDA (Próx. Mes)</span>
                    <span className="text-[9px] font-extrabold bg-primary/10 text-primary-glow border border-primary/20 px-1.5 py-0.5 rounded">Forecast IA</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-black text-foreground font-display">{formatUSD(totalUtility * 1.12)}</p>
                    <span className="text-[10px] text-success font-black flex items-center">▲ 12.0%</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-normal">
                    Estimado con base en la tendencia de kilometraje mensual y optimización de rutas (Samsara GPS).
                  </p>
                </div>

                {/* Tire & Brake Wear Alerts */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Alerta de Desgaste Estimado (Frenos / Llantas)
                  </span>
                  <div className="space-y-1.5">
                    {filteredTractos
                      .filter(t => t.estado === "Activo")
                      .slice(0, 3)
                      .map((t, idx) => {
                        // Estimate wear from mileage and safety score
                        const wear = Math.min(98, Math.round(((t.kmRecorridos * 1.8 + t.scoreSeguridad * 12000) % 40) + 55));
                        const isCritical = wear >= 80;
                        return (
                          <div key={t.id} className="flex flex-col gap-1 p-2 rounded-lg border border-border/10 bg-muted/20">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-foreground">Tracto #{t.economico} <span className="text-[8px] font-normal text-muted-foreground">({t.modelo})</span></span>
                              <span className={cn("font-bold px-1 py-0.2 rounded text-[9px]", isCritical ? "text-destructive bg-destructive/10" : "text-warning bg-warning/10")}>
                                {wear}% Desgaste
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", isCritical ? "bg-destructive" : "bg-warning")} style={{ width: `${wear}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* KPI de Ahorro Proyectado en Ralentí */}
                <div className="border border-warning/20 bg-warning/5 p-3 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-warning-foreground">
                    <span>Ahorro Estimado por Ralentí</span>
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-foreground">{formatUSD(filteredTractos.filter(t => t.estado === "Activo").length * 85)}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">MXN / Mes</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-normal">
                    Reduciendo ralentí excesivo actual de 22 minutos a un estándar de 8 minutos en Celaya/Veracruz.
                  </p>
                </div>

              </CardContent>
            </Card>
          </section>

          {/* 3. SIMULADOR EBITDA Y SCATTER DE RENTABILIDAD */}
          <section className="grid gap-4 lg:grid-cols-2">
            
            {/* Auditoría Directiva de Costos y Utilidades */}
            <Card className="shadow-sm bg-card/65 backdrop-blur-md border flex flex-col justify-between h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase text-primary flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-primary" /> Auditoría Directiva: Desempeño por Tipo de Operación
                </CardTitle>
                <CardDescription>
                  Resumen financiero real consolidado de las unidades activas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="overflow-x-auto rounded-xl border bg-background/30 border-border/10">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground border-b border-border/10">
                      <tr>
                        <th className="px-3 py-2">Operación</th>
                        <th className="px-3 py-2 text-right">Uds</th>
                        <th className="px-3 py-2 text-right">Ventas</th>
                        <th className="px-3 py-2 text-right">Utilidad</th>
                        <th className="px-3 py-2 text-right">Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {["Full", "Refrigerado", "Dedicado", "Tanque"].map((op) => {
                        const opTractos = filteredTractos.filter(t => getBUOperationType(t.unidadNegocio) === op);
                        const rev = opTractos.reduce((sum, t) => sum + t.ventaPorKm * t.kmRecorridos, 0) * currentFactor;
                        const util = opTractos.reduce((sum, t) => sum + t.utilidadReal, 0) * currentFactor;
                        const margin = rev ? (util / rev) * 100 : 0;
                        return (
                          <tr key={op} className="hover:bg-muted/20">
                            <td className="px-3 py-2.5 font-bold text-foreground">{op}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-muted-foreground">{opTractos.length}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-foreground/90">{formatUSD(rev)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-success font-semibold">{formatUSD(util)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                margin >= 20 ? "bg-success/15 text-success" : margin >= 10 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                              )}>
                                {margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-[10px] text-muted-foreground leading-relaxed bg-primary/5 p-3 rounded-lg border border-primary/20">
                  <span className="font-semibold text-primary block mb-1">💡 Análisis de Costos consolidados:</span>
                  El tipo de operación <span className="font-bold text-foreground">Tanque</span> concentra el mayor flujo de refinados, mientras que <span className="font-bold text-foreground">Refrigerado</span> mantiene los estándares más altos de cumplimiento de setpoint térmico en patio.
                </div>
              </CardContent>
            </Card>

            {/* Bubble scatter-plot for active tractors profitability */}
            <Card className="shadow-sm bg-card/65 backdrop-blur-md border">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase text-primary">Matriz Costo vs. Beneficio por Activo</CardTitle>
                <CardDescription>
                  Tractos ubicados en el plano. El objetivo es operar en el cuadrante superior izquierdo (Bajo costo, alta tarifa).
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[230px] pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis type="number" dataKey="costo" name="Costo" unit=" $/km" label={{ value: "Costo / Km ($)", position: "insideBottom", offset: -5, fontSize: 10 }} tick={{ fontSize: 9 }} />
                    <YAxis type="number" dataKey="venta" name="Venta" unit=" $/km" label={{ value: "Venta / Km ($)", angle: -90, position: "insideLeft", offset: 5, fontSize: 10 }} tick={{ fontSize: 9 }} />
                    <ZAxis type="number" dataKey="utilidad" range={[40, 400]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value, name) => [`$${value}/km`, name === "costo" ? "Costo por Km" : "Venta por Km"]} />
                    <Scatter name="Activos" data={scatterData}>
                      {scatterData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.venta < entry.costo ? "#EF4444" : entry.venta > 2.5 ? "#10B981" : "#3B82F6"}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="proyecciones" className="space-y-6">
          {/* Top Formula Explainers */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm bg-card/65 backdrop-blur-md border border-border/30 hover:border-primary/25 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-primary" /> Promedio por Unidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black font-display text-foreground">Venta / Cap. Utilizada</div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  Mide los ingresos mensuales generados por cada camión que estuvo activo.
                </p>
                <div className="bg-primary/5 p-2 rounded border border-primary/10 mt-3 text-[9px] font-mono leading-tight">
                  <span className="text-primary font-bold">Ejemplo:</span> $16,270,651 ÷ 29 = $561,056.95
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-card/65 backdrop-blur-md border border-border/30 hover:border-primary/25 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-warning" /> Samsara 24h (Doble Turno)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black font-display text-foreground">Utilización × 2</div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  Escala la telemetría a 24h. Si supera el 90%, indica necesidad de inversión.
                </p>
                <div className="bg-warning/5 p-2 rounded border border-warning/10 mt-3 text-[9px] font-mono leading-tight">
                  <span className="text-warning font-bold">Alerta:</span> &gt;90% = Compra más camiones.
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-card/65 backdrop-blur-md border border-border/30 hover:border-primary/25 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-destructive" /> Capacidad Potencial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black font-display text-foreground">Instalada - Utilizada</div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  Identifica unidades ociosas o paradas que generan costo ocioso de leasing.
                </p>
                <div className="bg-destructive/5 p-2 rounded border border-destructive/10 mt-3 text-[9px] font-mono leading-tight">
                  <span className="text-destructive font-bold">Alerta:</span> &lt;80% Activos = Sobra equipo.
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-card/65 backdrop-blur-md border border-border/30 hover:border-primary/25 transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-success" /> Proyección Financiera
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black font-display text-foreground">Venta × (Meta / Util)</div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  Estima ingresos futuros si la flota trabaja a la meta de utilización deseada.
                </p>
                <div className="bg-success/5 p-2 rounded border border-success/10 mt-3 text-[9px] font-mono leading-tight">
                  <span className="text-success font-bold">Meta:</span> Escala ingresos proporcionalmente.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Simulation & Visual Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Simulator Controls & Donut Capacity */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-sm bg-card/65 backdrop-blur-md border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase text-primary">Simulador de Meta de Utilización</CardTitle>
                  <CardDescription>Ajusta el porcentaje meta de utilización para simular proyecciones de venta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-muted-foreground">Utilización Meta:</span>
                      <span className="text-primary text-sm font-black">{metaUtilizacion}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      value={metaUtilizacion}
                      onChange={(e) => setMetaUtilizacion(Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-muted-foreground font-mono">
                      <span>50% (Bajo)</span>
                      <span>70% (Meta Excel)</span>
                      <span>95% (Máximo)</span>
                    </div>
                  </div>

                  {/* Donut Chart */}
                  {(() => {
                    const data = getFilteredExcelData();
                    const totalInst = data.reduce((sum, r) => sum + r.capInst, 0);
                    const totalUtil = data.reduce((sum, r) => sum + r.capUtil, 0);
                    const totalPot = Math.max(0, totalInst - totalUtil);
                    const chartData = [
                      { name: "Capacidad Utilizada", value: totalUtil, fill: "#3B82F6" },
                      { name: "Capacidad Potencial", value: totalPot, fill: "#EF4444" },
                    ];

                    return (
                      <div className="space-y-4 pt-4 border-t">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block text-center">Distribución de Capacidad de Flota</span>
                        <div className="h-[140px] flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={55}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} uds.`, "Cantidad"]} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 text-[9px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            <span>Utilizada: {totalUtil} uds.</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <span>Excedente: {totalPot} uds.</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Right Column (2 Columns): Opportunity Gap Chart */}
            <Card className="lg:col-span-2 shadow-sm bg-card/65 backdrop-blur-md border">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase text-primary">Gráfico de Brecha de Ventas (Revenue Opportunity Gap)</CardTitle>
                <CardDescription>
                  Comparativa de Facturación Real vs Proyección al {metaUtilizacion}% sobre Capacidad Instalada y Utilizada.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px] pr-4">
                {(() => {
                  const data = getFilteredExcelData().map(row => ({
                    name: row.area.replace("BACHOCO ", "").replace("REFINADOS ", ""),
                    "Venta Real": Math.round(row.venta),
                    "Proy. Instalada": Math.round(row.proyInst),
                    "Proy. Utilizada": Math.round(row.proyUtil),
                  }));

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 10, right: 10, left: 25, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.05} />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 7.5 }} angle={-25} textAnchor="end" interval={0} height={65} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8.5 }} tickFormatter={(val: number) => `$${(val / 1000000).toFixed(1)}M`} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} formatter={(value: any) => [formatUSD(value), ""]} />
                        <Legend wrapperStyle={{ fontSize: '9px', marginTop: '-10px' }} />
                        <Bar dataKey="Venta Real" fill="#475569" maxBarSize={16} />
                        <Bar dataKey="Proy. Instalada" fill="#10B981" maxBarSize={16} />
                        <Bar dataKey="Proy. Utilizada" fill="#8B5CF6" maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Excel Detailed Grid table */}
          <Card className="shadow-sm bg-card/65 backdrop-blur-md border overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/10">
              <CardTitle className="text-sm font-bold uppercase text-primary flex items-center justify-between">
                <span>Desglose de Capacidad y Facturación Proyectada (Simulación Mayo 2026)</span>
                <span className="text-[10px] text-muted-foreground font-mono">Fórmulas del Excel Integradas</span>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left text-foreground">
                <thead className="bg-muted/50 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border/15">
                  <tr>
                    <th className="px-3 py-2">Área</th>
                    <th className="px-3 py-2 text-right">Venta Mensual</th>
                    <th className="px-3 py-2 text-right">Prom. Unidad</th>
                    <th className="px-3 py-2 text-right">Util. Samsara</th>
                    <th className="px-3 py-2 text-right">Util. 24h (Doble)</th>
                    <th className="px-3 py-2 text-right">Util. Calc.</th>
                    <th className="px-3 py-2 text-right">Cap. Inst.</th>
                    <th className="px-3 py-2 text-right">Cap. Util.</th>
                    <th className="px-3 py-2 text-right">Cap. Pot.</th>
                    <th className="px-3 py-2 text-right">Util. Activos</th>
                    <th className="px-3 py-2 text-right text-success-foreground bg-success/5 border-l border-r border-border/15">Proy. Venta (Instalada)</th>
                    <th className="px-3 py-2 text-right text-primary-glow bg-primary/5">Proy. Venta (Utilizada)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {(() => {
                    const data = getFilteredExcelData();
                    
                    const totalVenta = data.reduce((sum, r) => sum + r.venta, 0);
                    const totalCapInst = data.reduce((sum, r) => sum + r.capInst, 0);
                    const totalCapUtil = data.reduce((sum, r) => sum + r.capUtil, 0);
                    const totalCapPot = Math.max(0, totalCapInst - totalCapUtil);
                    
                    const avgPromUnidad = totalCapUtil > 0 ? totalVenta / totalCapUtil : 0;
                    
                    const avgSamsaraUtil = data.reduce((sum, r) => sum + (r.samsaraUtil * r.capInst), 0) / (totalCapInst || 1);
                    const avgCalcUtil = data.reduce((sum, r) => sum + (r.calcUtil * r.capUtil), 0) / (totalCapUtil || 1);
                    const avgActivos = totalCapInst > 0 ? (totalCapUtil / totalCapInst) : 0;

                    const totalProyInst = data.reduce((sum, r) => sum + r.proyInst, 0);
                    const totalProyUtil = data.reduce((sum, r) => sum + r.proyUtil, 0);

                    return (
                      <>
                        {data.map((row, idx) => {
                          const doubleUtil = row.samsaraUtil * 2;
                          const activosUtil = row.capInst > 0 ? (row.capUtil / row.capInst) : 0;
                          
                          const alertInversion = doubleUtil >= 0.90;
                          const alertSobra = activosUtil < 0.80;

                          return (
                            <tr key={idx} className="hover:bg-muted/15 font-mono">
                              <td className="px-3 py-2 font-bold font-sans text-foreground">{row.area}</td>
                              <td className="px-3 py-2 text-right text-foreground/90">{formatUSD(row.venta)}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{formatUSD(row.venta / (row.capUtil || 1))}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{(row.samsaraUtil * 100).toFixed(0)}%</td>
                              <td className="px-3 py-2 text-right">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold font-sans",
                                  alertInversion ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                                )}>
                                  {(doubleUtil * 100).toFixed(0)}%
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{(row.calcUtil * 100).toFixed(0)}%</td>
                              <td className="px-3 py-2 text-right text-foreground/80">{row.capInst}</td>
                              <td className="px-3 py-2 text-right text-foreground/80">{row.capUtil}</td>
                              <td className="px-3 py-2 text-right">
                                <span className={cn(
                                  "font-bold",
                                  (row.capInst - row.capUtil) > 0 ? "text-warning" : "text-muted-foreground/60"
                                )}>
                                  {row.capInst - row.capUtil}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold font-sans",
                                  alertSobra ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                                )}>
                                  {(activosUtil * 100).toFixed(0)}%
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-success bg-success/5 border-l border-r border-border/15">{formatUSD(row.proyInst)}</td>
                              <td className="px-3 py-2 text-right font-bold text-primary-glow bg-primary/5">{formatUSD(row.proyUtil)}</td>
                            </tr>
                          );
                        })}

                        {/* TOTAL ROW */}
                        <tr className="bg-muted/30 font-bold border-t-2 border-border/25 font-mono text-xs">
                          <td className="px-3 py-3 font-sans text-foreground">TOTAL / PROMEDIO</td>
                          <td className="px-3 py-3 text-right text-foreground">{formatUSD(totalVenta)}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground">{formatUSD(avgPromUnidad)}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground">{(avgSamsaraUtil * 100).toFixed(0)}%</td>
                          <td className="px-3 py-3 text-right text-foreground">{(avgSamsaraUtil * 2 * 100).toFixed(0)}%</td>
                          <td className="px-3 py-3 text-right text-muted-foreground">{(avgCalcUtil * 100).toFixed(0)}%</td>
                          <td className="px-3 py-3 text-right text-foreground">{totalCapInst}</td>
                          <td className="px-3 py-3 text-right text-foreground">{totalCapUtil}</td>
                          <td className="px-3 py-3 text-right text-warning">{totalCapPot}</td>
                          <td className="px-3 py-3 text-right text-success">{(avgActivos * 100).toFixed(0)}%</td>
                          <td className="px-3 py-3 text-right text-success bg-success/10 border-l border-r border-border/25">{formatUSD(totalProyInst)}</td>
                          <td className="px-3 py-3 text-right text-primary-glow bg-primary/10">{formatUSD(totalProyUtil)}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-Component Radial Gauge (Gauges)
function RadialGauge({
  value,
  label,
  color,
  icon: Icon,
}: {
  value: number;
  label: string;
  color: string;
  icon: any;
}) {
  const radius = 45;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-card/65 p-4 rounded-xl border backdrop-blur-md shadow-sm relative group hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5 transition-all duration-200 min-h-[160px]">
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="stroke-muted fill-transparent"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="fill-transparent transition-all duration-1000 ease-out"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Icon className="h-4.5 w-4.5 text-muted-foreground/80 mb-1 group-hover:text-primary transition-colors" />
          <span className="text-xl font-black font-display tracking-tight text-foreground">{value}%</span>
        </div>
      </div>
      <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
        {label}
      </p>
    </div>
  );
}

// Sub-Component Health Pill for Heatmap
function HealthPill({ label, status, tooltip }: { label: string; status: "green" | "yellow" | "red"; tooltip: string }) {
  const colors = {
    green: "bg-success text-success-foreground shadow-[0_0_6px_rgba(34,197,94,0.4)]",
    yellow: "bg-warning text-warning-foreground shadow-[0_0_6px_rgba(234,179,8,0.4)]",
    red: "bg-destructive text-destructive-foreground shadow-[0_0_6px_rgba(239,68,68,0.4)]",
  };

  return (
    <div
      className={`h-5 w-7 text-[9px] font-bold rounded flex items-center justify-center cursor-help shrink-0 ${colors[status]}`}
      title={`${tooltip}: ${status === "green" ? "Óptimo" : status === "yellow" ? "Alerta" : "Crítico"}`}
    >
      {label}
    </div>
  );
}

// Helper to calculate status metrics of BU Heatmap
function getBUMetrics(bu: BusinessUnit, tractos: Tracto[], remolques: Remolque[], currentFactor: number) {
  const buTractos = tractos.filter(t => (t.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());
  const buRemolques = remolques.filter(r => (r.unidadNegocio || "").toUpperCase() === (bu.name || "").toUpperCase());

  // Productivity status
  const avgUtil = buTractos.length ? buTractos.reduce((a, b) => a + b.utilizacion, 0) / buTractos.length : 0;
  const pr: "green" | "yellow" | "red" = avgUtil >= 80 ? "green" : avgUtil >= 65 ? "yellow" : "red";

  // Financial status
  const totalRevenue = buTractos.reduce((a, b) => a + b.ventaPorKm * b.kmRecorridos, 0) * currentFactor;
  const totalUtility = buTractos.reduce((a, b) => a + b.utilidadReal, 0) * currentFactor;
  const margin = totalRevenue ? (totalUtility / totalRevenue) * 100 : 0;
  const fn: "green" | "yellow" | "red" = margin >= 20 ? "green" : margin >= 10 ? "yellow" : "red";

  // Maintenance status (Availability)
  const maintTractos = buTractos.filter(t => t.estado === "Mantenimiento").length;
  const maintRemolques = buRemolques.filter(r => r.estado === "Mantenimiento").length;
  const mt: "green" | "yellow" | "red" = (maintTractos + maintRemolques) === 0 ? "green" : (maintTractos + maintRemolques) <= 1 ? "yellow" : "red";

  return { pr, fn, mt };
}



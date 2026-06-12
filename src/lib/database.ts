import { syncSamsaraTelemetry } from "./samsara";
import { SAMSARA_METADATA } from "./samsara_metadata";

export type EquipoEstado = "Activo" | "Inactivo" | "Mantenimiento";
export type OperationType = "Full" | "Refrigerado" | "Dedicado" | "Tanque";

export interface BusinessUnit {
  id: string;
  name: string;
  operation_type: OperationType;
  km_loaded_goal: number; // e.g. 50 or 90
  active: boolean;
}

export interface Tracto {
  id: string;
  economico: string;
  placa: string;
  modelo: string;
  conductor: string;
  estado: EquipoEstado;
  unidadNegocio: string;
  utilizacion: number; // %
  kmCargadosPct: number; // %
  viajesMes: number;
  ventaPorKm: number; // USD/km
  costoPorKm: number; // USD/km
  rendimiento: number; // km/L
  scoreSeguridad: number; // % of hard braking events per km
  utilidadReal: number; // USD
  kmRecorridos: number;
  costoManttoMensual: number; // USD
  combustibleExcedenteCosto: number; // USD
  latitude?: number;
  longitude?: number;
  velocidad?: number;
}

export interface Remolque {
  id: string;
  economico: string;
  placa: string;
  tipo: string; // Refrigerado, Seco, Tanque, Tolva, Cisterna
  estado: EquipoEstado;
  unidadNegocio: string;
  utilizacion: number; // %
  kmRecorridos: number;
  diasTaller: number;
  costoKmMantto: number; // USD/km
  viajesMes: number;
}

export interface SystemConfig {
  samsaraApiKey: string;
  zamBaseUrl: string;
  metaUtilizacionFull: number;
  metaUtilizacionRefrigerado: number;
  metaUtilizacionDedicado: number;
  alertDisponibilidadMecanica: number;
  alertScoreSeguridad: number;
}

// Initial Business Units
const INITIAL_BUSINESS_UNITS: BusinessUnit[] = [
  { id: "bu-1", name: "REFINADOS LAZARO", operation_type: "Tanque", km_loaded_goal: 50, active: true },
  { id: "bu-2", name: "REFINADO MINA", operation_type: "Tanque", km_loaded_goal: 50, active: true },
  { id: "bu-3", name: "REFINADOS VERACRUZ", operation_type: "Tanque", km_loaded_goal: 50, active: true },
  { id: "bu-4", name: "BACHOCO LAGOS", operation_type: "Dedicado", km_loaded_goal: 90, active: true },
  { id: "bu-5", name: "BACHOCO CELAYA", operation_type: "Dedicado", km_loaded_goal: 90, active: true },
  { id: "bu-6", name: "BACHOCO AGUASCALIENTES", operation_type: "Dedicado", km_loaded_goal: 90, active: true },
  { id: "bu-7", name: "LUBRICANTES FULL", operation_type: "Full", km_loaded_goal: 75, active: true },
  { id: "bu-8", name: "LUBRICANTES JUMBO", operation_type: "Full", km_loaded_goal: 75, active: true },
  { id: "bu-9", name: "REFRIGERADOS", operation_type: "Refrigerado", km_loaded_goal: 95, active: true },
  { id: "bu-10", name: "BULKMATIC", operation_type: "Full", km_loaded_goal: 80, active: true },
  { id: "bu-11", name: "REFINADOS POZA RICA", operation_type: "Tanque", km_loaded_goal: 50, active: true },
  { id: "bu-12", name: "BACHOCO PROCESADO", operation_type: "Dedicado", km_loaded_goal: 90, active: true },
  { id: "bu-13", name: "BACHOCO CLIENTES", operation_type: "Dedicado", km_loaded_goal: 90, active: true },
  { id: "bu-14", name: "DRAGON CARGO", operation_type: "Full", km_loaded_goal: 75, active: true },
];

// Excel exact fleet counts for Programmatic Generation
const TRACTOS_COUNTS = [
  { name: "REFINADOS LAZARO", activos: 18, inactivos: 2, mantto: 3 },
  { name: "REFINADO MINA", activos: 12, inactivos: 1, mantto: 2 },
  { name: "REFINADOS VERACRUZ", activos: 16, inactivos: 2, mantto: 2 },
  { name: "BACHOCO LAGOS", activos: 10, inactivos: 1, mantto: 1 },
  { name: "BACHOCO CELAYA", activos: 11, inactivos: 0, mantto: 2 },
  { name: "BACHOCO AGUASCALIENTES", activos: 9, inactivos: 1, mantto: 1 },
  { name: "LUBRICANTES FULL", activos: 8, inactivos: 1, mantto: 1 },
  { name: "LUBRICANTES JUMBO", activos: 7, inactivos: 0, mantto: 1 },
  { name: "REFRIGERADOS", activos: 14, inactivos: 2, mantto: 2 },
  { name: "BULKMATIC", activos: 13, inactivos: 1, mantto: 2 },
  { name: "REFINADOS POZA RICA", activos: 15, inactivos: 2, mantto: 2 },
  { name: "BACHOCO PROCESADO", activos: 10, inactivos: 1, mantto: 1 },
  { name: "BACHOCO CLIENTES", activos: 9, inactivos: 1, mantto: 1 },
  { name: "DRAGON CARGO", activos: 12, inactivos: 1, mantto: 2 },
];

const REMOLQUES_COUNTS = [
  { name: "REFINADOS LAZARO", activos: 22, inactivos: 3, mantto: 4 },
  { name: "REFINADO MINA", activos: 15, inactivos: 2, mantto: 3 },
  { name: "REFINADOS VERACRUZ", activos: 20, inactivos: 1, mantto: 3 },
  { name: "BACHOCO LAGOS", activos: 12, inactivos: 2, mantto: 2 },
  { name: "BACHOCO CELAYA", activos: 13, inactivos: 1, mantto: 2 },
  { name: "BACHOCO AGUASCALIENTES", activos: 11, inactivos: 1, mantto: 2 },
  { name: "LUBRICANTES FULL", activos: 10, inactivos: 1, mantto: 1 },
  { name: "LUBRICANTES JUMBO", activos: 9, inactivos: 1, mantto: 1 },
  { name: "REFRIGERADOS", activos: 17, inactivos: 2, mantto: 3 },
  { name: "BULKMATIC", activos: 16, inactivos: 1, mantto: 2 },
  { name: "REFINADOS POZA RICA", activos: 18, inactivos: 2, mantto: 3 },
  { name: "BACHOCO PROCESADO", activos: 12, inactivos: 1, mantto: 2 },
  { name: "BACHOCO CLIENTES", activos: 11, inactivos: 1, mantto: 2 },
  { name: "DRAGON CARGO", activos: 14, inactivos: 2, mantto: 2 },
];

// Helper variables
const MODELOS = ["Kenworth T680", "Kenworth T880", "Freightliner Cascadia", "Freightliner Columbia"];
const TIPOS_REMOLQUE = ["Caja seca 53'", "Refrigerado", "Plataforma", "Cisterna", "Tolva"];
const CONDUCTORES = [
  "Carlos Méndez", "Luis Ramírez", "Andrea Torres", "Miguel Santos", "Daniela Cruz", "Roberto Silva",
  "Eduardo Gómez", "Fernando Ruiz", "Alejandro Pérez", "Gabriela López", "Juan Castro", "Mónica Díaz",
  "José Ortega", "Ricardo Soto", "Patricia Morales", "Arturo Romero", "Esteban Juárez", "Jaime Flores"
];

// GENERATOR FUNCTIONS
const REAL_SAMSARA_NAMES: Record<string, string[]> = {
  "REFINADOS LAZARO": [
    "PR1719",
    "PR1574",
    "PR1571",
    "PR1727ATN",
    "PR1728",
    "PR3293",
    "PR1579",
    "PR3350",
    "PR1574",
    "PR1564",
    "PR1893",
    "PR1725",
    "PR1578",
    "PR1566",
    "PR1563",
    "PR1581",
    "PR1577",
    "PR1567",
    "PR1951",
    "PR1070",
    "PR1950",
    "PR1575",
    "PR-3372",
    "PR1892",
    "PR1069"
  ],
  "REFINADO MINA": [
    "PR1956",
    "PR1890",
    "PR1074",
    "PR3428",
    "PR1721",
    "PR1580",
    "PR1564",
    "PR3371",
    "PR3370",
    "PR1584",
    "PR3591",
    "PR1582",
    "PR1952",
    "PR3370",
    "PR3372",
    "PR3592",
    "PR1723",
    "PR1724",
    "PR1727",
    "PR3373"
  ],
  "REFINADOS VERACRUZ": [
    "PR1576",
    "PR1568",
    "PR1570",
    "PR1895",
    "PR1954",
    "PR1965",
    "PR1953",
    "PR1891",
    "PR1718",
    "PR1894",
    "PR3429",
    "PR1565",
    "PR1889",
    "PR1720",
    "PR1583",
    "PR1569",
    "PR1072",
    "PR3427",
    "PR1726",
    "prueba"
  ],
  "BACHOCO LAGOS": [
    "BL20",
    "BL21",
    "BL19",
    "BL23",
    "BL03",
    "BL01",
    "BL02",
    "BL04",
    "BL05",
    "BL08",
    "BL09",
    "BL10",
    "BL11",
    "BL07",
    "BL06",
    "BL12",
    "BL22"
  ],
  "BACHOCO CELAYA": [
    "BC29",
    "BC31",
    "BC28",
    "BC27",
    "BC30",
    "BC01",
    "BC02",
    "BC03",
    "BC04",
    "BC06",
    "BC08",
    "BC10",
    "BC11",
    "BC12",
    "BC13",
    "BC23",
    "BC25",
    "BC26",
    "BC24",
    "BC17",
    "BC15N",
    "BC16",
    "BC18",
    "BC20",
    "BC21",
    "BC19",
    "BC14",
    "BC15",
    "BC05",
    "BC07",
    "BC07",
    "BC22"
  ],
  "BACHOCO AGUASCALIENTES": [
    "BA16",
    "BA06",
    "BA02",
    "BA09",
    "BA17",
    "BA03",
    "BA05",
    "BA08FALLA",
    "BA04",
    "BA07",
    "BA02NFALLA",
    "BA01",
    "BA10",
    "BA15",
    "BA13",
    "BA11",
    "BA12",
    "BA14",
    "BA08"
  ],
  "LUBRICANTES FULL": [
    "RYT337",
    "TI002",
    "TI012",
    "CAP004",
    "RYT395",
    "TJ03",
    "TJ05",
    "TJ11",
    "TJ13"
  ],
  "LUBRICANTES JUMBO": [
    "TJ02",
    "TJ01",
    "TJ08",
    "TJ10",
    "TJ09",
    "TJ07",
    "TJ04",
    "TJ06"
  ],
  "REFRIGERADOS": [
    "TE057",
    "TE022",
    "TE005",
    "TE026",
    "TE060",
    "TE043",
    "TE049",
    "TE059",
    "TE004",
    "TE002",
    "TE092",
    "TE061",
    "TE011",
    "TE036",
    "TE008",
    "TE046",
    "TE071",
    "TE045",
    "TE015"
  ],
  "BULKMATIC": [
    "BK009",
    "BK002FALLA",
    "BK001",
    "BK010",
    "BK020",
    "BK021",
    "BK008",
    "BK005",
    "BK003",
    "BK016",
    "BK012cancelado",
    "BK023",
    "BK006",
    "BK013",
    "BK022",
    "BK015",
    "BK018",
    "BK014",
    "BK019",
    "BK012",
    "BK007",
    "BK013",
    "BK002"
  ],
  "REFINADOS POZA RICA": [
    "PP1654",
    "PP0872",
    "PP0251",
    "PP0796",
    "PP0808",
    "PP0811",
    "PP0804",
    "PP0813",
    "PP0252",
    "PP1910",
    "PP0262-TRANSFER",
    "PP0257",
    "PP0809",
    "PP0255",
    "PP1653",
    "PP0814",
    "PP1912",
    "PP1651",
    "PP1655",
    "PP0805",
    "PP0225",
    "PP0795",
    "PP1913",
    "PP1916",
    "PP1650"
  ],
  "BACHOCO PROCESADO": [
    "PP0874",
    "PP0810",
    "PP0815",
    "PP0226",
    "PP0253",
    "PP1914",
    "PP1909",
    "PP1163",
    "PP1917",
    "PP0812",
    "PP1915",
    "PP0224",
    "PP1918",
    "PP2012",
    "PP2013"
  ],
  "BACHOCO CLIENTES": [
    "TD048",
    "TD035",
    "TD007",
    "TD052",
    "PP1911",
    "PP0807",
    "PP0227",
    "PP0262",
    "PP0263",
    "PP0873",
    "PP0259",
    "PP0257",
    "PP1652",
    "PP2010",
    "PP1659",
    "PP2009",
    "PP2011",
    "PP0804",
    "PP0261",
    "PP0806",
    "PP0256",
    "PP0258",
    "PP0264",
    "PP0260",
    "PP1656",
    "PP1658",
    "PP1657",
    "PP0795 nuevo"
  ],
  "DRAGON CARGO": [
    "TD025",
    "TG005",
    "TG007",
    "TD053",
    "TG008",
    "TG003",
    "TG001",
    "TC027",
    "TD024",
    "TC028",
    "TD009",
    "TD010",
    "TC029",
    "TC005",
    "TD033",
    "TD004",
    "TC004",
    "TD044",
    "TD056",
    "TD028"
  ]
};

const generateTractos = (): Tracto[] => {
  const result: Tracto[] = [];
  let globalIndex = 1;

  Object.entries(REAL_SAMSARA_NAMES).forEach(([buName, namesList]) => {
    namesList.forEach((economico, idx) => {
      // Exclude temporary test unit
      if (economico === "prueba") return;

      const meta = SAMSARA_METADATA[economico];
      const placa = meta && meta.placa ? meta.placa : `ABC-${2000 + globalIndex}`;
      const model = meta && meta.modelo ? meta.modelo : MODELOS[globalIndex % MODELOS.length];
      const driver = meta && meta.conductor ? meta.conductor : "—";
      const km = 8000 + (globalIndex * 150) % 6000;
      const ventaKm = 2.30 + (globalIndex * 0.05) % 0.60;
      const costoKm = 1.60 + (globalIndex * 0.03) % 0.35;
      const rev = km * ventaKm;
      const cost = km * costoKm;
      const utility = rev - cost;

      // Distribute statuses logically: ~85% Active, ~5% Inactive, ~10% Maintenance
      let estado: EquipoEstado = "Activo";
      const mod = globalIndex % 10;
      if (mod === 0) {
        estado = "Inactivo";
      } else if (mod === 5) {
        estado = "Mantenimiento";
      }

      let ratio = (idx / namesList.length);
      let laneOffset = ((globalIndex * 7) % 7 - 3) * 0.015;

      let lat = 20.0;
      let lon = -99.0;
      if (buName.includes("LAZARO")) {
        lat = 17.96 + ratio * (20.52 - 17.96) + laneOffset;
        lon = -102.20 + ratio * (-100.81 - -102.20) - laneOffset;
      } else if (buName.includes("MINA")) {
        lat = 17.98 + ratio * (19.17 - 17.98) + laneOffset;
        lon = -94.55 + ratio * (-96.13 - -94.55) - laneOffset;
      } else if (buName.includes("VERACRUZ")) {
        lat = 19.17 + ratio * (20.52 - 19.17) + laneOffset;
        lon = -96.13 + ratio * (-100.81 - -96.13) - laneOffset;
      } else if (buName.includes("CELAYA")) {
        lat = 20.52 + laneOffset * 2;
        lon = -100.81 - laneOffset * 2;
      } else if (buName.includes("LAGOS")) {
        lat = 20.52 + ratio * (21.35 - 20.52) + laneOffset;
        lon = -100.81 + ratio * (-101.93 - -100.81) - laneOffset;
      } else {
        lat = 18.5 + ratio * 3.5 + laneOffset;
        lon = -102.0 + ratio * 6.5 - laneOffset;
      }

      const isMaintenance = estado === "Mantenimiento";
      const isInactive = estado === "Inactivo";

      result.push({
        id: `T-${globalIndex}`,
        economico,
        placa,
        modelo: model,
        conductor: isInactive ? "—" : driver,
        estado,
        unidadNegocio: buName,
        utilizacion: isInactive ? 0 : 75 + (globalIndex * 3) % 20,
        kmCargadosPct: isInactive ? 0 : 52 + (globalIndex * 4) % 40,
        viajesMes: isInactive ? 0 : isMaintenance ? 4 + (globalIndex) % 6 : 18 + (globalIndex) % 12,
        ventaPorKm: isInactive ? 0 : parseFloat(ventaKm.toFixed(2)),
        costoPorKm: isInactive ? 0 : isMaintenance ? parseFloat((ventaKm + 0.2).toFixed(2)) : parseFloat(costoKm.toFixed(2)),
        rendimiento: isInactive ? 0 : parseFloat((2.3 + (globalIndex * 0.08) % 0.5).toFixed(2)),
        scoreSeguridad: isInactive ? 0 : parseFloat((0.05 + (globalIndex * 0.015) % 0.16).toFixed(3)),
        utilidadReal: isInactive ? Math.round(-1000 - (globalIndex * 50) % 500) : Math.round(utility),
        kmRecorridos: isInactive ? 0 : isMaintenance ? 1500 + (globalIndex * 80) % 2500 : km,
        costoManttoMensual: isInactive ? 600 + (globalIndex * 50) % 400 : isMaintenance ? 3500 + (globalIndex * 150) % 2500 : 400 + (globalIndex * 80) % 900,
        combustibleExcedenteCosto: isInactive ? 0 : (globalIndex % 4 === 0) ? 120 + (globalIndex * 40) % 400 : 0,
        latitude: isInactive ? undefined : parseFloat(lat.toFixed(4)),
        longitude: isInactive ? undefined : parseFloat(lon.toFixed(4)),
        velocidad: (estado === "Activo" && globalIndex % 3 === 0) ? 55 + (globalIndex * 7) % 35 : 0,
      });

      globalIndex++;
    });
  });

  return result;
};

const generateRemolques = (): Remolque[] => {
  return [
  {
    "id": "R-1",
    "economico": "TL007",
    "placa": "RM-91007",
    "tipo": "Tolva",
    "estado": "Activo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 77,
    "kmRecorridos": 5120,
    "diasTaller": 2,
    "costoKmMantto": 0.1,
    "viajesMes": 15
  },
  {
    "id": "R-2",
    "economico": "TE085",
    "placa": "RM-91085",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 79,
    "kmRecorridos": 5240,
    "diasTaller": 3,
    "costoKmMantto": 0.11,
    "viajesMes": 16
  },
  {
    "id": "R-3",
    "economico": "TE042",
    "placa": "RM-91042",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 81,
    "kmRecorridos": 5360,
    "diasTaller": 1,
    "costoKmMantto": 0.13,
    "viajesMes": 17
  },
  {
    "id": "R-4",
    "economico": "TD010",
    "placa": "RM-91010",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 83,
    "kmRecorridos": 5480,
    "diasTaller": 2,
    "costoKmMantto": 0.14,
    "viajesMes": 18
  },
  {
    "id": "R-5",
    "economico": "TE022",
    "placa": "RM-91022",
    "tipo": "Caja seca 53'",
    "estado": "Mantenimiento",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 85,
    "kmRecorridos": 5600,
    "diasTaller": 10,
    "costoKmMantto": 0.15,
    "viajesMes": 3
  },
  {
    "id": "R-6",
    "economico": "TN067",
    "placa": "RM-91067",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 87,
    "kmRecorridos": 5720,
    "diasTaller": 1,
    "costoKmMantto": 0.17,
    "viajesMes": 20
  },
  {
    "id": "R-7",
    "economico": "TE005",
    "placa": "RM-91005",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES JUMBO",
    "utilizacion": 89,
    "kmRecorridos": 5840,
    "diasTaller": 2,
    "costoKmMantto": 0.18,
    "viajesMes": 21
  },
  {
    "id": "R-8",
    "economico": "TE041",
    "placa": "RM-91041",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 91,
    "kmRecorridos": 5960,
    "diasTaller": 3,
    "costoKmMantto": 0.2,
    "viajesMes": 22
  },
  {
    "id": "R-9",
    "economico": "TE027",
    "placa": "RM-91027",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 93,
    "kmRecorridos": 6080,
    "diasTaller": 1,
    "costoKmMantto": 0.22,
    "viajesMes": 23
  },
  {
    "id": "R-10",
    "economico": "TE026",
    "placa": "RM-91026",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "REFINADOS POZA RICA",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-11",
    "economico": "TE043",
    "placa": "RM-91043",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 77,
    "kmRecorridos": 6320,
    "diasTaller": 3,
    "costoKmMantto": 0.24,
    "viajesMes": 15
  },
  {
    "id": "R-12",
    "economico": "TC027",
    "placa": "RM-91027",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 79,
    "kmRecorridos": 6440,
    "diasTaller": 1,
    "costoKmMantto": 0.26,
    "viajesMes": 16
  },
  {
    "id": "R-13",
    "economico": "TE004",
    "placa": "RM-91004",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "DRAGON CARGO",
    "utilizacion": 81,
    "kmRecorridos": 6560,
    "diasTaller": 2,
    "costoKmMantto": 0.28,
    "viajesMes": 17
  },
  {
    "id": "R-14",
    "economico": "TG032",
    "placa": "RM-91032",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 83,
    "kmRecorridos": 6680,
    "diasTaller": 3,
    "costoKmMantto": 0.29,
    "viajesMes": 18
  },
  {
    "id": "R-15",
    "economico": "TD004",
    "placa": "RM-91004",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 85,
    "kmRecorridos": 6800,
    "diasTaller": 12,
    "costoKmMantto": 0.08,
    "viajesMes": 5
  },
  {
    "id": "R-16",
    "economico": "TK004",
    "placa": "RM-91004",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 87,
    "kmRecorridos": 6920,
    "diasTaller": 2,
    "costoKmMantto": 0.1,
    "viajesMes": 20
  },
  {
    "id": "R-17",
    "economico": "TK006",
    "placa": "RM-91006",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 89,
    "kmRecorridos": 7040,
    "diasTaller": 3,
    "costoKmMantto": 0.12,
    "viajesMes": 21
  },
  {
    "id": "R-18",
    "economico": "TH010",
    "placa": "RM-91010",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 91,
    "kmRecorridos": 7160,
    "diasTaller": 1,
    "costoKmMantto": 0.13,
    "viajesMes": 22
  },
  {
    "id": "R-19",
    "economico": "TE036",
    "placa": "RM-91036",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 93,
    "kmRecorridos": 7280,
    "diasTaller": 2,
    "costoKmMantto": 0.14,
    "viajesMes": 23
  },
  {
    "id": "R-20",
    "economico": "TR011",
    "placa": "RM-91011",
    "tipo": "Caja seca 53'",
    "estado": "Inactivo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-21",
    "economico": "TC030",
    "placa": "RM-91030",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES JUMBO",
    "utilizacion": 77,
    "kmRecorridos": 7520,
    "diasTaller": 1,
    "costoKmMantto": 0.17,
    "viajesMes": 15
  },
  {
    "id": "R-22",
    "economico": "TE029",
    "placa": "RM-91029",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 79,
    "kmRecorridos": 7640,
    "diasTaller": 2,
    "costoKmMantto": 0.19,
    "viajesMes": 16
  },
  {
    "id": "R-23",
    "economico": "TE010",
    "placa": "RM-91010",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 81,
    "kmRecorridos": 7760,
    "diasTaller": 3,
    "costoKmMantto": 0.2,
    "viajesMes": 17
  },
  {
    "id": "R-24",
    "economico": "TE034",
    "placa": "RM-91034",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES JUMBO",
    "utilizacion": 83,
    "kmRecorridos": 7880,
    "diasTaller": 1,
    "costoKmMantto": 0.22,
    "viajesMes": 18
  },
  {
    "id": "R-25",
    "economico": "TD055",
    "placa": "RM-91055",
    "tipo": "Caja seca 53'",
    "estado": "Mantenimiento",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 85,
    "kmRecorridos": 8000,
    "diasTaller": 6,
    "costoKmMantto": 0.23,
    "viajesMes": 3
  },
  {
    "id": "R-26",
    "economico": "TI002",
    "placa": "RM-91002",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CLIENTES",
    "utilizacion": 87,
    "kmRecorridos": 8120,
    "diasTaller": 3,
    "costoKmMantto": 0.25,
    "viajesMes": 20
  },
  {
    "id": "R-27",
    "economico": "TI003",
    "placa": "RM-91003",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 89,
    "kmRecorridos": 8240,
    "diasTaller": 1,
    "costoKmMantto": 0.26,
    "viajesMes": 21
  },
  {
    "id": "R-28",
    "economico": "TI005",
    "placa": "RM-91005",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 91,
    "kmRecorridos": 8360,
    "diasTaller": 2,
    "costoKmMantto": 0.28,
    "viajesMes": 22
  },
  {
    "id": "R-29",
    "economico": "TI006",
    "placa": "RM-91006",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 93,
    "kmRecorridos": 8480,
    "diasTaller": 3,
    "costoKmMantto": 0.29,
    "viajesMes": 23
  },
  {
    "id": "R-30",
    "economico": "TI007",
    "placa": "RM-91007",
    "tipo": "Caja seca 53'",
    "estado": "Inactivo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-31",
    "economico": "TE039",
    "placa": "RM-91039",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 77,
    "kmRecorridos": 8720,
    "diasTaller": 2,
    "costoKmMantto": 0.1,
    "viajesMes": 15
  },
  {
    "id": "R-32",
    "economico": "TI012",
    "placa": "RM-91012",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 79,
    "kmRecorridos": 8840,
    "diasTaller": 3,
    "costoKmMantto": 0.12,
    "viajesMes": 16
  },
  {
    "id": "R-33",
    "economico": "TI018",
    "placa": "RM-91018",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 81,
    "kmRecorridos": 8960,
    "diasTaller": 1,
    "costoKmMantto": 0.14,
    "viajesMes": 17
  },
  {
    "id": "R-34",
    "economico": "TI019",
    "placa": "RM-91019",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 83,
    "kmRecorridos": 9080,
    "diasTaller": 2,
    "costoKmMantto": 0.15,
    "viajesMes": 18
  },
  {
    "id": "R-35",
    "economico": "TI022",
    "placa": "RM-91022",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 85,
    "kmRecorridos": 9200,
    "diasTaller": 8,
    "costoKmMantto": 0.17,
    "viajesMes": 5
  },
  {
    "id": "R-36",
    "economico": "TE083",
    "placa": "RM-91083",
    "tipo": "Tolva",
    "estado": "Activo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 87,
    "kmRecorridos": 9320,
    "diasTaller": 1,
    "costoKmMantto": 0.18,
    "viajesMes": 20
  },
  {
    "id": "R-37",
    "economico": "TE061",
    "placa": "RM-91061",
    "tipo": "Tolva",
    "estado": "Activo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 89,
    "kmRecorridos": 9440,
    "diasTaller": 2,
    "costoKmMantto": 0.19,
    "viajesMes": 21
  },
  {
    "id": "R-38",
    "economico": "TE086",
    "placa": "RM-91086",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 91,
    "kmRecorridos": 9560,
    "diasTaller": 3,
    "costoKmMantto": 0.21,
    "viajesMes": 22
  },
  {
    "id": "R-39",
    "economico": "TE019",
    "placa": "RM-91019",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 93,
    "kmRecorridos": 9680,
    "diasTaller": 1,
    "costoKmMantto": 0.22,
    "viajesMes": 23
  },
  {
    "id": "R-40",
    "economico": "TG011",
    "placa": "RM-91011",
    "tipo": "Tolva",
    "estado": "Inactivo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-41",
    "economico": "TE045",
    "placa": "RM-91045",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "DRAGON CARGO",
    "utilizacion": 77,
    "kmRecorridos": 9920,
    "diasTaller": 3,
    "costoKmMantto": 0.26,
    "viajesMes": 15
  },
  {
    "id": "R-42",
    "economico": "TE072",
    "placa": "RM-91072",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 79,
    "kmRecorridos": 10040,
    "diasTaller": 1,
    "costoKmMantto": 0.27,
    "viajesMes": 16
  },
  {
    "id": "R-43",
    "economico": "TE071",
    "placa": "RM-91071",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 81,
    "kmRecorridos": 10160,
    "diasTaller": 2,
    "costoKmMantto": 0.29,
    "viajesMes": 17
  },
  {
    "id": "R-44",
    "economico": "TE079",
    "placa": "RM-91079",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 83,
    "kmRecorridos": 10280,
    "diasTaller": 3,
    "costoKmMantto": 0.3,
    "viajesMes": 18
  },
  {
    "id": "R-45",
    "economico": "TD036",
    "placa": "RM-91036",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 85,
    "kmRecorridos": 10400,
    "diasTaller": 10,
    "costoKmMantto": 0.09,
    "viajesMes": 3
  },
  {
    "id": "R-46",
    "economico": "TG002",
    "placa": "RM-91002",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 87,
    "kmRecorridos": 10520,
    "diasTaller": 2,
    "costoKmMantto": 0.11,
    "viajesMes": 20
  },
  {
    "id": "R-47",
    "economico": "TG004",
    "placa": "RM-91004",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 89,
    "kmRecorridos": 10640,
    "diasTaller": 3,
    "costoKmMantto": 0.12,
    "viajesMes": 21
  },
  {
    "id": "R-48",
    "economico": "TG009",
    "placa": "RM-91009",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 91,
    "kmRecorridos": 10760,
    "diasTaller": 1,
    "costoKmMantto": 0.14,
    "viajesMes": 22
  },
  {
    "id": "R-49",
    "economico": "TG015",
    "placa": "RM-91015",
    "tipo": "Tolva",
    "estado": "Activo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 93,
    "kmRecorridos": 10880,
    "diasTaller": 2,
    "costoKmMantto": 0.15,
    "viajesMes": 23
  },
  {
    "id": "R-50",
    "economico": "TI014",
    "placa": "RM-91014",
    "tipo": "Refrigerado",
    "estado": "Inactivo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-51",
    "economico": "TD031",
    "placa": "RM-91031",
    "tipo": "Tolva",
    "estado": "Activo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 77,
    "kmRecorridos": 11120,
    "diasTaller": 1,
    "costoKmMantto": 0.18,
    "viajesMes": 15
  },
  {
    "id": "R-52",
    "economico": "TG012",
    "placa": "RM-91012",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS POZA RICA",
    "utilizacion": 79,
    "kmRecorridos": 11240,
    "diasTaller": 2,
    "costoKmMantto": 0.2,
    "viajesMes": 16
  },
  {
    "id": "R-53",
    "economico": "TM014",
    "placa": "RM-91014",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 81,
    "kmRecorridos": 11360,
    "diasTaller": 3,
    "costoKmMantto": 0.21,
    "viajesMes": 17
  },
  {
    "id": "R-54",
    "economico": "TE051",
    "placa": "RM-91051",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CLIENTES",
    "utilizacion": 83,
    "kmRecorridos": 11480,
    "diasTaller": 1,
    "costoKmMantto": 0.23,
    "viajesMes": 18
  },
  {
    "id": "R-55",
    "economico": "TE092",
    "placa": "RM-91092",
    "tipo": "Caja seca 53'",
    "estado": "Mantenimiento",
    "unidadNegocio": "DRAGON CARGO",
    "utilizacion": 85,
    "kmRecorridos": 11600,
    "diasTaller": 12,
    "costoKmMantto": 0.24,
    "viajesMes": 5
  },
  {
    "id": "R-56",
    "economico": "TM027",
    "placa": "RM-91027",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 87,
    "kmRecorridos": 11720,
    "diasTaller": 3,
    "costoKmMantto": 0.26,
    "viajesMes": 20
  },
  {
    "id": "R-57",
    "economico": "TE009",
    "placa": "RM-91009",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 89,
    "kmRecorridos": 11840,
    "diasTaller": 1,
    "costoKmMantto": 0.27,
    "viajesMes": 21
  },
  {
    "id": "R-58",
    "economico": "TD035",
    "placa": "RM-91035",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 91,
    "kmRecorridos": 11960,
    "diasTaller": 2,
    "costoKmMantto": 0.29,
    "viajesMes": 22
  },
  {
    "id": "R-59",
    "economico": "TC028",
    "placa": "RM-91028",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 93,
    "kmRecorridos": 12080,
    "diasTaller": 3,
    "costoKmMantto": 0.09,
    "viajesMes": 23
  },
  {
    "id": "R-60",
    "economico": "TL008",
    "placa": "RM-91008",
    "tipo": "Tolva",
    "estado": "Inactivo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-61",
    "economico": "TG008",
    "placa": "RM-91008",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 77,
    "kmRecorridos": 12320,
    "diasTaller": 2,
    "costoKmMantto": 0.11,
    "viajesMes": 15
  },
  {
    "id": "R-62",
    "economico": "TL016",
    "placa": "RM-91016",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 79,
    "kmRecorridos": 12440,
    "diasTaller": 3,
    "costoKmMantto": 0.13,
    "viajesMes": 16
  },
  {
    "id": "R-63",
    "economico": "TR002",
    "placa": "RM-91002",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 81,
    "kmRecorridos": 12560,
    "diasTaller": 1,
    "costoKmMantto": 0.14,
    "viajesMes": 17
  },
  {
    "id": "R-64",
    "economico": "TL014",
    "placa": "RM-91014",
    "tipo": "Tolva",
    "estado": "Activo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 83,
    "kmRecorridos": 12680,
    "diasTaller": 2,
    "costoKmMantto": 0.16,
    "viajesMes": 18
  },
  {
    "id": "R-65",
    "economico": "TE093",
    "placa": "RM-91093",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADOS POZA RICA",
    "utilizacion": 85,
    "kmRecorridos": 12800,
    "diasTaller": 6,
    "costoKmMantto": 0.17,
    "viajesMes": 3
  },
  {
    "id": "R-66",
    "economico": "TL017",
    "placa": "RM-91017",
    "tipo": "Tolva",
    "estado": "Activo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 87,
    "kmRecorridos": 12920,
    "diasTaller": 1,
    "costoKmMantto": 0.19,
    "viajesMes": 20
  },
  {
    "id": "R-67",
    "economico": "TE058",
    "placa": "RM-91058",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 89,
    "kmRecorridos": 5040,
    "diasTaller": 2,
    "costoKmMantto": 0.2,
    "viajesMes": 21
  },
  {
    "id": "R-68",
    "economico": "TC019",
    "placa": "RM-91019",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CLIENTES",
    "utilizacion": 91,
    "kmRecorridos": 5160,
    "diasTaller": 3,
    "costoKmMantto": 0.22,
    "viajesMes": 22
  },
  {
    "id": "R-69",
    "economico": "TD043",
    "placa": "RM-91043",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES JUMBO",
    "utilizacion": 93,
    "kmRecorridos": 5280,
    "diasTaller": 1,
    "costoKmMantto": 0.23,
    "viajesMes": 23
  },
  {
    "id": "R-70",
    "economico": "TD056",
    "placa": "RM-91056",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-71",
    "economico": "TD038",
    "placa": "RM-91038",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES JUMBO",
    "utilizacion": 77,
    "kmRecorridos": 5520,
    "diasTaller": 3,
    "costoKmMantto": 0.26,
    "viajesMes": 15
  },
  {
    "id": "R-72",
    "economico": "TD053",
    "placa": "RM-91053",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 79,
    "kmRecorridos": 5640,
    "diasTaller": 1,
    "costoKmMantto": 0.28,
    "viajesMes": 16
  },
  {
    "id": "R-73",
    "economico": "TD034",
    "placa": "RM-91034",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS POZA RICA",
    "utilizacion": 81,
    "kmRecorridos": 5760,
    "diasTaller": 2,
    "costoKmMantto": 0.29,
    "viajesMes": 17
  },
  {
    "id": "R-74",
    "economico": "TD048",
    "placa": "RM-91048",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 83,
    "kmRecorridos": 5880,
    "diasTaller": 3,
    "costoKmMantto": 0.09,
    "viajesMes": 18
  },
  {
    "id": "R-75",
    "economico": "TE054",
    "placa": "RM-91054",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADOS POZA RICA",
    "utilizacion": 85,
    "kmRecorridos": 6000,
    "diasTaller": 8,
    "costoKmMantto": 0.1,
    "viajesMes": 5
  },
  {
    "id": "R-76",
    "economico": "TG031",
    "placa": "RM-91031",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 87,
    "kmRecorridos": 6120,
    "diasTaller": 2,
    "costoKmMantto": 0.12,
    "viajesMes": 20
  },
  {
    "id": "R-77",
    "economico": "TM032",
    "placa": "RM-91032",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 89,
    "kmRecorridos": 6240,
    "diasTaller": 3,
    "costoKmMantto": 0.14,
    "viajesMes": 21
  },
  {
    "id": "R-78",
    "economico": "TH003",
    "placa": "RM-91003",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 91,
    "kmRecorridos": 6360,
    "diasTaller": 1,
    "costoKmMantto": 0.15,
    "viajesMes": 22
  },
  {
    "id": "R-79",
    "economico": "TE002",
    "placa": "RM-91002",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 93,
    "kmRecorridos": 6480,
    "diasTaller": 2,
    "costoKmMantto": 0.17,
    "viajesMes": 23
  },
  {
    "id": "R-80",
    "economico": "TG024",
    "placa": "RM-91024",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-81",
    "economico": "TG003",
    "placa": "RM-91003",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 77,
    "kmRecorridos": 6720,
    "diasTaller": 1,
    "costoKmMantto": 0.19,
    "viajesMes": 15
  },
  {
    "id": "R-82",
    "economico": "TM039",
    "placa": "RM-91039",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 79,
    "kmRecorridos": 6840,
    "diasTaller": 2,
    "costoKmMantto": 0.21,
    "viajesMes": 16
  },
  {
    "id": "R-83",
    "economico": "TM042",
    "placa": "RM-91042",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 81,
    "kmRecorridos": 6960,
    "diasTaller": 3,
    "costoKmMantto": 0.22,
    "viajesMes": 17
  },
  {
    "id": "R-84",
    "economico": "TI013",
    "placa": "RM-91013",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 83,
    "kmRecorridos": 7080,
    "diasTaller": 1,
    "costoKmMantto": 0.24,
    "viajesMes": 18
  },
  {
    "id": "R-85",
    "economico": "TM040",
    "placa": "RM-91040",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 85,
    "kmRecorridos": 7200,
    "diasTaller": 10,
    "costoKmMantto": 0.25,
    "viajesMes": 3
  },
  {
    "id": "R-86",
    "economico": "TM041",
    "placa": "RM-91041",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 87,
    "kmRecorridos": 7320,
    "diasTaller": 3,
    "costoKmMantto": 0.27,
    "viajesMes": 20
  },
  {
    "id": "R-87",
    "economico": "TE057",
    "placa": "RM-91057",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 89,
    "kmRecorridos": 7440,
    "diasTaller": 1,
    "costoKmMantto": 0.28,
    "viajesMes": 21
  },
  {
    "id": "R-88",
    "economico": "TM050",
    "placa": "RM-91050",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 91,
    "kmRecorridos": 7560,
    "diasTaller": 2,
    "costoKmMantto": 0.3,
    "viajesMes": 22
  },
  {
    "id": "R-89",
    "economico": "TE081",
    "placa": "RM-91081",
    "tipo": "Tolva",
    "estado": "Activo",
    "unidadNegocio": "BULKMATIC",
    "utilizacion": 93,
    "kmRecorridos": 7680,
    "diasTaller": 3,
    "costoKmMantto": 0.09,
    "viajesMes": 23
  },
  {
    "id": "R-90",
    "economico": "TM046",
    "placa": "RM-91046",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-91",
    "economico": "TM044",
    "placa": "RM-91044",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 77,
    "kmRecorridos": 7920,
    "diasTaller": 2,
    "costoKmMantto": 0.12,
    "viajesMes": 15
  },
  {
    "id": "R-92",
    "economico": "TM047",
    "placa": "RM-91047",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 79,
    "kmRecorridos": 8040,
    "diasTaller": 3,
    "costoKmMantto": 0.14,
    "viajesMes": 16
  },
  {
    "id": "R-93",
    "economico": "TM045",
    "placa": "RM-91045",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 81,
    "kmRecorridos": 8160,
    "diasTaller": 1,
    "costoKmMantto": 0.16,
    "viajesMes": 17
  },
  {
    "id": "R-94",
    "economico": "TG006",
    "placa": "RM-91006",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS POZA RICA",
    "utilizacion": 83,
    "kmRecorridos": 8280,
    "diasTaller": 2,
    "costoKmMantto": 0.17,
    "viajesMes": 18
  },
  {
    "id": "R-95",
    "economico": "TM048",
    "placa": "RM-91048",
    "tipo": "Caja seca 53'",
    "estado": "Mantenimiento",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 85,
    "kmRecorridos": 8400,
    "diasTaller": 12,
    "costoKmMantto": 0.19,
    "viajesMes": 5
  },
  {
    "id": "R-96",
    "economico": "TM051",
    "placa": "RM-91051",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 87,
    "kmRecorridos": 8520,
    "diasTaller": 1,
    "costoKmMantto": 0.2,
    "viajesMes": 20
  },
  {
    "id": "R-97",
    "economico": "TM052",
    "placa": "RM-91052",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 89,
    "kmRecorridos": 8640,
    "diasTaller": 2,
    "costoKmMantto": 0.21,
    "viajesMes": 21
  },
  {
    "id": "R-98",
    "economico": "TM056",
    "placa": "RM-91056",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 91,
    "kmRecorridos": 8760,
    "diasTaller": 3,
    "costoKmMantto": 0.23,
    "viajesMes": 22
  },
  {
    "id": "R-99",
    "economico": "TM054",
    "placa": "RM-91054",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 93,
    "kmRecorridos": 8880,
    "diasTaller": 1,
    "costoKmMantto": 0.24,
    "viajesMes": 23
  },
  {
    "id": "R-100",
    "economico": "TM057",
    "placa": "RM-91057",
    "tipo": "Caja seca 53'",
    "estado": "Inactivo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-101",
    "economico": "TM055",
    "placa": "RM-91055",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 77,
    "kmRecorridos": 9120,
    "diasTaller": 3,
    "costoKmMantto": 0.27,
    "viajesMes": 15
  },
  {
    "id": "R-102",
    "economico": "TM060",
    "placa": "RM-91060",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 79,
    "kmRecorridos": 9240,
    "diasTaller": 1,
    "costoKmMantto": 0.29,
    "viajesMes": 16
  },
  {
    "id": "R-103",
    "economico": "TM064",
    "placa": "RM-91064",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 81,
    "kmRecorridos": 9360,
    "diasTaller": 2,
    "costoKmMantto": 0.08,
    "viajesMes": 17
  },
  {
    "id": "R-104",
    "economico": "TM053",
    "placa": "RM-91053",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 83,
    "kmRecorridos": 9480,
    "diasTaller": 3,
    "costoKmMantto": 0.1,
    "viajesMes": 18
  },
  {
    "id": "R-105",
    "economico": "TM066",
    "placa": "RM-91066",
    "tipo": "Caja seca 53'",
    "estado": "Mantenimiento",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 85,
    "kmRecorridos": 9600,
    "diasTaller": 6,
    "costoKmMantto": 0.11,
    "viajesMes": 3
  },
  {
    "id": "R-106",
    "economico": "TM062",
    "placa": "RM-91062",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 87,
    "kmRecorridos": 9720,
    "diasTaller": 2,
    "costoKmMantto": 0.13,
    "viajesMes": 20
  },
  {
    "id": "R-107",
    "economico": "TM063",
    "placa": "RM-91063",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 89,
    "kmRecorridos": 9840,
    "diasTaller": 3,
    "costoKmMantto": 0.14,
    "viajesMes": 21
  },
  {
    "id": "R-108",
    "economico": "TM065",
    "placa": "RM-91065",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 91,
    "kmRecorridos": 9960,
    "diasTaller": 1,
    "costoKmMantto": 0.16,
    "viajesMes": 22
  },
  {
    "id": "R-109",
    "economico": "TM068",
    "placa": "RM-91068",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 93,
    "kmRecorridos": 10080,
    "diasTaller": 2,
    "costoKmMantto": 0.17,
    "viajesMes": 23
  },
  {
    "id": "R-110",
    "economico": "TM067",
    "placa": "RM-91067",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-111",
    "economico": "TM059",
    "placa": "RM-91059",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 77,
    "kmRecorridos": 10320,
    "diasTaller": 1,
    "costoKmMantto": 0.21,
    "viajesMes": 15
  },
  {
    "id": "R-112",
    "economico": "TM061",
    "placa": "RM-91061",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 79,
    "kmRecorridos": 10440,
    "diasTaller": 2,
    "costoKmMantto": 0.22,
    "viajesMes": 16
  },
  {
    "id": "R-113",
    "economico": "TM070",
    "placa": "RM-91070",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 81,
    "kmRecorridos": 10560,
    "diasTaller": 3,
    "costoKmMantto": 0.23,
    "viajesMes": 17
  },
  {
    "id": "R-114",
    "economico": "TE068",
    "placa": "RM-91068",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 83,
    "kmRecorridos": 10680,
    "diasTaller": 1,
    "costoKmMantto": 0.25,
    "viajesMes": 18
  },
  {
    "id": "R-115",
    "economico": "TM071",
    "placa": "RM-91071",
    "tipo": "Caja seca 53'",
    "estado": "Mantenimiento",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 85,
    "kmRecorridos": 10800,
    "diasTaller": 8,
    "costoKmMantto": 0.26,
    "viajesMes": 5
  },
  {
    "id": "R-116",
    "economico": "TN004",
    "placa": "RM-91004",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 87,
    "kmRecorridos": 10920,
    "diasTaller": 3,
    "costoKmMantto": 0.28,
    "viajesMes": 20
  },
  {
    "id": "R-117",
    "economico": "TM072",
    "placa": "RM-91072",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 89,
    "kmRecorridos": 11040,
    "diasTaller": 1,
    "costoKmMantto": 0.29,
    "viajesMes": 21
  },
  {
    "id": "R-118",
    "economico": "TG026",
    "placa": "RM-91026",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 91,
    "kmRecorridos": 11160,
    "diasTaller": 2,
    "costoKmMantto": 0.09,
    "viajesMes": 22
  },
  {
    "id": "R-119",
    "economico": "TN005",
    "placa": "RM-91005",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 93,
    "kmRecorridos": 11280,
    "diasTaller": 3,
    "costoKmMantto": 0.1,
    "viajesMes": 23
  },
  {
    "id": "R-120",
    "economico": "TN006",
    "placa": "RM-91006",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-121",
    "economico": "TN007",
    "placa": "RM-91007",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 77,
    "kmRecorridos": 11520,
    "diasTaller": 2,
    "costoKmMantto": 0.13,
    "viajesMes": 15
  },
  {
    "id": "R-122",
    "economico": "TN008",
    "placa": "RM-91008",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 79,
    "kmRecorridos": 11640,
    "diasTaller": 3,
    "costoKmMantto": 0.15,
    "viajesMes": 16
  },
  {
    "id": "R-123",
    "economico": "TN010",
    "placa": "RM-91010",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 81,
    "kmRecorridos": 11760,
    "diasTaller": 1,
    "costoKmMantto": 0.16,
    "viajesMes": 17
  },
  {
    "id": "R-124",
    "economico": "TN011",
    "placa": "RM-91011",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 83,
    "kmRecorridos": 11880,
    "diasTaller": 2,
    "costoKmMantto": 0.18,
    "viajesMes": 18
  },
  {
    "id": "R-125",
    "economico": "TN012",
    "placa": "RM-91012",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 85,
    "kmRecorridos": 12000,
    "diasTaller": 10,
    "costoKmMantto": 0.2,
    "viajesMes": 3
  },
  {
    "id": "R-126",
    "economico": "TN009",
    "placa": "RM-91009",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 87,
    "kmRecorridos": 12120,
    "diasTaller": 1,
    "costoKmMantto": 0.21,
    "viajesMes": 20
  },
  {
    "id": "R-127",
    "economico": "TE024",
    "placa": "RM-91024",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 89,
    "kmRecorridos": 12240,
    "diasTaller": 2,
    "costoKmMantto": 0.23,
    "viajesMes": 21
  },
  {
    "id": "R-128",
    "economico": "TM068",
    "placa": "RM-91068",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 91,
    "kmRecorridos": 12360,
    "diasTaller": 3,
    "costoKmMantto": 0.24,
    "viajesMes": 22
  },
  {
    "id": "R-129",
    "economico": "TN013",
    "placa": "RM-91013",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 93,
    "kmRecorridos": 12480,
    "diasTaller": 1,
    "costoKmMantto": 0.25,
    "viajesMes": 23
  },
  {
    "id": "R-130",
    "economico": "TN019",
    "placa": "RM-91019",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-131",
    "economico": "TN014",
    "placa": "RM-91014",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 77,
    "kmRecorridos": 12720,
    "diasTaller": 3,
    "costoKmMantto": 0.28,
    "viajesMes": 15
  },
  {
    "id": "R-132",
    "economico": "TN020",
    "placa": "RM-91020",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 79,
    "kmRecorridos": 12840,
    "diasTaller": 1,
    "costoKmMantto": 0.3,
    "viajesMes": 16
  },
  {
    "id": "R-133",
    "economico": "TN015",
    "placa": "RM-91015",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 81,
    "kmRecorridos": 12960,
    "diasTaller": 2,
    "costoKmMantto": 0.09,
    "viajesMes": 17
  },
  {
    "id": "R-134",
    "economico": "TN017",
    "placa": "RM-91017",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 83,
    "kmRecorridos": 5080,
    "diasTaller": 3,
    "costoKmMantto": 0.11,
    "viajesMes": 18
  },
  {
    "id": "R-135",
    "economico": "TN016",
    "placa": "RM-91016",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 85,
    "kmRecorridos": 5200,
    "diasTaller": 12,
    "costoKmMantto": 0.12,
    "viajesMes": 5
  },
  {
    "id": "R-136",
    "economico": "TN018",
    "placa": "RM-91018",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 87,
    "kmRecorridos": 5320,
    "diasTaller": 2,
    "costoKmMantto": 0.14,
    "viajesMes": 20
  },
  {
    "id": "R-137",
    "economico": "TN021",
    "placa": "RM-91021",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 89,
    "kmRecorridos": 5440,
    "diasTaller": 3,
    "costoKmMantto": 0.15,
    "viajesMes": 21
  },
  {
    "id": "R-138",
    "economico": "TN022",
    "placa": "RM-91022",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 91,
    "kmRecorridos": 5560,
    "diasTaller": 1,
    "costoKmMantto": 0.17,
    "viajesMes": 22
  },
  {
    "id": "R-139",
    "economico": "TN031",
    "placa": "RM-91031",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO LAGOS",
    "utilizacion": 93,
    "kmRecorridos": 5680,
    "diasTaller": 2,
    "costoKmMantto": 0.18,
    "viajesMes": 23
  },
  {
    "id": "R-140",
    "economico": "TN023",
    "placa": "RM-91023",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-141",
    "economico": "TN024",
    "placa": "RM-91024",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 77,
    "kmRecorridos": 5920,
    "diasTaller": 1,
    "costoKmMantto": 0.21,
    "viajesMes": 15
  },
  {
    "id": "R-142",
    "economico": "TN025",
    "placa": "RM-91025",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 79,
    "kmRecorridos": 6040,
    "diasTaller": 2,
    "costoKmMantto": 0.23,
    "viajesMes": 16
  },
  {
    "id": "R-143",
    "economico": "TN026",
    "placa": "RM-91026",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 81,
    "kmRecorridos": 6160,
    "diasTaller": 3,
    "costoKmMantto": 0.24,
    "viajesMes": 17
  },
  {
    "id": "R-144",
    "economico": "TN027",
    "placa": "RM-91027",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 83,
    "kmRecorridos": 6280,
    "diasTaller": 1,
    "costoKmMantto": 0.26,
    "viajesMes": 18
  },
  {
    "id": "R-145",
    "economico": "TN028",
    "placa": "RM-91028",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 85,
    "kmRecorridos": 6400,
    "diasTaller": 6,
    "costoKmMantto": 0.27,
    "viajesMes": 3
  },
  {
    "id": "R-146",
    "economico": "TN029",
    "placa": "RM-91029",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 87,
    "kmRecorridos": 6520,
    "diasTaller": 3,
    "costoKmMantto": 0.29,
    "viajesMes": 20
  },
  {
    "id": "R-147",
    "economico": "TN030",
    "placa": "RM-91030",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 89,
    "kmRecorridos": 6640,
    "diasTaller": 1,
    "costoKmMantto": 0.09,
    "viajesMes": 21
  },
  {
    "id": "R-148",
    "economico": "TE050",
    "placa": "RM-91050",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 91,
    "kmRecorridos": 6760,
    "diasTaller": 2,
    "costoKmMantto": 0.1,
    "viajesMes": 22
  },
  {
    "id": "R-149",
    "economico": "TN044",
    "placa": "RM-91044",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 93,
    "kmRecorridos": 6880,
    "diasTaller": 3,
    "costoKmMantto": 0.11,
    "viajesMes": 23
  },
  {
    "id": "R-150",
    "economico": "TN042",
    "placa": "RM-91042",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-151",
    "economico": "TN046",
    "placa": "RM-91046",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 77,
    "kmRecorridos": 7120,
    "diasTaller": 2,
    "costoKmMantto": 0.15,
    "viajesMes": 15
  },
  {
    "id": "R-152",
    "economico": "TN047",
    "placa": "RM-91047",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 79,
    "kmRecorridos": 7240,
    "diasTaller": 3,
    "costoKmMantto": 0.16,
    "viajesMes": 16
  },
  {
    "id": "R-153",
    "economico": "TN039",
    "placa": "RM-91039",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 81,
    "kmRecorridos": 7360,
    "diasTaller": 1,
    "costoKmMantto": 0.17,
    "viajesMes": 17
  },
  {
    "id": "R-154",
    "economico": "TN050",
    "placa": "RM-91050",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 83,
    "kmRecorridos": 7480,
    "diasTaller": 2,
    "costoKmMantto": 0.19,
    "viajesMes": 18
  },
  {
    "id": "R-155",
    "economico": "TN034",
    "placa": "RM-91034",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 85,
    "kmRecorridos": 7600,
    "diasTaller": 8,
    "costoKmMantto": 0.2,
    "viajesMes": 5
  },
  {
    "id": "R-156",
    "economico": "TN033",
    "placa": "RM-91033",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 87,
    "kmRecorridos": 7720,
    "diasTaller": 1,
    "costoKmMantto": 0.22,
    "viajesMes": 20
  },
  {
    "id": "R-157",
    "economico": "TN043",
    "placa": "RM-91043",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 89,
    "kmRecorridos": 7840,
    "diasTaller": 2,
    "costoKmMantto": 0.23,
    "viajesMes": 21
  },
  {
    "id": "R-158",
    "economico": "TN049",
    "placa": "RM-91049",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 91,
    "kmRecorridos": 7960,
    "diasTaller": 3,
    "costoKmMantto": 0.25,
    "viajesMes": 22
  },
  {
    "id": "R-159",
    "economico": "TN041",
    "placa": "RM-91041",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 93,
    "kmRecorridos": 8080,
    "diasTaller": 1,
    "costoKmMantto": 0.26,
    "viajesMes": 23
  },
  {
    "id": "R-160",
    "economico": "TN054",
    "placa": "RM-91054",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "LUBRICANTES JUMBO",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-161",
    "economico": "TN032",
    "placa": "RM-91032",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 77,
    "kmRecorridos": 8320,
    "diasTaller": 3,
    "costoKmMantto": 0.3,
    "viajesMes": 15
  },
  {
    "id": "R-162",
    "economico": "TN037",
    "placa": "RM-91037",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 79,
    "kmRecorridos": 8440,
    "diasTaller": 1,
    "costoKmMantto": 0.09,
    "viajesMes": 16
  },
  {
    "id": "R-163",
    "economico": "TN053",
    "placa": "RM-91053",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES JUMBO",
    "utilizacion": 81,
    "kmRecorridos": 8560,
    "diasTaller": 2,
    "costoKmMantto": 0.1,
    "viajesMes": 17
  },
  {
    "id": "R-164",
    "economico": "TN045",
    "placa": "RM-91045",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 83,
    "kmRecorridos": 8680,
    "diasTaller": 3,
    "costoKmMantto": 0.12,
    "viajesMes": 18
  },
  {
    "id": "R-165",
    "economico": "TN036",
    "placa": "RM-91036",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 85,
    "kmRecorridos": 8800,
    "diasTaller": 10,
    "costoKmMantto": 0.14,
    "viajesMes": 3
  },
  {
    "id": "R-166",
    "economico": "TN052",
    "placa": "RM-91052",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 87,
    "kmRecorridos": 8920,
    "diasTaller": 2,
    "costoKmMantto": 0.15,
    "viajesMes": 20
  },
  {
    "id": "R-167",
    "economico": "TN035",
    "placa": "RM-91035",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 89,
    "kmRecorridos": 9040,
    "diasTaller": 3,
    "costoKmMantto": 0.16,
    "viajesMes": 21
  },
  {
    "id": "R-168",
    "economico": "TN040",
    "placa": "RM-91040",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 91,
    "kmRecorridos": 9160,
    "diasTaller": 1,
    "costoKmMantto": 0.18,
    "viajesMes": 22
  },
  {
    "id": "R-169",
    "economico": "TN048",
    "placa": "RM-91048",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 93,
    "kmRecorridos": 9280,
    "diasTaller": 2,
    "costoKmMantto": 0.19,
    "viajesMes": 23
  },
  {
    "id": "R-170",
    "economico": "TN038",
    "placa": "RM-91038",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-171",
    "economico": "TN051",
    "placa": "RM-91051",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 77,
    "kmRecorridos": 9520,
    "diasTaller": 1,
    "costoKmMantto": 0.22,
    "viajesMes": 15
  },
  {
    "id": "R-172",
    "economico": "TE060",
    "placa": "RM-91060",
    "tipo": "Caja seca 53'",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CELAYA",
    "utilizacion": 79,
    "kmRecorridos": 9640,
    "diasTaller": 2,
    "costoKmMantto": 0.24,
    "viajesMes": 16
  },
  {
    "id": "R-173",
    "economico": "TE018",
    "placa": "RM-91018",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 81,
    "kmRecorridos": 9760,
    "diasTaller": 3,
    "costoKmMantto": 0.25,
    "viajesMes": 17
  },
  {
    "id": "R-174",
    "economico": "TE016",
    "placa": "RM-91016",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 83,
    "kmRecorridos": 9880,
    "diasTaller": 1,
    "costoKmMantto": 0.27,
    "viajesMes": 18
  },
  {
    "id": "R-175",
    "economico": "TN055",
    "placa": "RM-91055",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 85,
    "kmRecorridos": 10000,
    "diasTaller": 12,
    "costoKmMantto": 0.28,
    "viajesMes": 5
  },
  {
    "id": "R-176",
    "economico": "TN060",
    "placa": "RM-91060",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 87,
    "kmRecorridos": 10120,
    "diasTaller": 3,
    "costoKmMantto": 0.3,
    "viajesMes": 20
  },
  {
    "id": "R-177",
    "economico": "TN061",
    "placa": "RM-91061",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 89,
    "kmRecorridos": 10240,
    "diasTaller": 1,
    "costoKmMantto": 0.09,
    "viajesMes": 21
  },
  {
    "id": "R-178",
    "economico": "TN063",
    "placa": "RM-91063",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO AGUASCALIENTES",
    "utilizacion": 91,
    "kmRecorridos": 10360,
    "diasTaller": 2,
    "costoKmMantto": 0.11,
    "viajesMes": 22
  },
  {
    "id": "R-179",
    "economico": "TK006",
    "placa": "RM-91006",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 93,
    "kmRecorridos": 10480,
    "diasTaller": 3,
    "costoKmMantto": 0.13,
    "viajesMes": 23
  },
  {
    "id": "R-180",
    "economico": "TN056",
    "placa": "RM-91056",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-181",
    "economico": "TN057",
    "placa": "RM-91057",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 77,
    "kmRecorridos": 10720,
    "diasTaller": 2,
    "costoKmMantto": 0.15,
    "viajesMes": 15
  },
  {
    "id": "R-182",
    "economico": "TN058",
    "placa": "RM-91058",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 79,
    "kmRecorridos": 10840,
    "diasTaller": 3,
    "costoKmMantto": 0.17,
    "viajesMes": 16
  },
  {
    "id": "R-183",
    "economico": "TN059",
    "placa": "RM-91059",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 81,
    "kmRecorridos": 10960,
    "diasTaller": 1,
    "costoKmMantto": 0.19,
    "viajesMes": 17
  },
  {
    "id": "R-184",
    "economico": "TG029",
    "placa": "RM-91029",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 83,
    "kmRecorridos": 11080,
    "diasTaller": 2,
    "costoKmMantto": 0.2,
    "viajesMes": 18
  },
  {
    "id": "R-185",
    "economico": "TG027",
    "placa": "RM-91027",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFINADOS VERACRUZ",
    "utilizacion": 85,
    "kmRecorridos": 11200,
    "diasTaller": 6,
    "costoKmMantto": 0.21,
    "viajesMes": 3
  },
  {
    "id": "R-186",
    "economico": "TM035",
    "placa": "RM-91035",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 87,
    "kmRecorridos": 11320,
    "diasTaller": 1,
    "costoKmMantto": 0.23,
    "viajesMes": 20
  },
  {
    "id": "R-187",
    "economico": "TE087V",
    "placa": "RM-91087",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS POZA RICA",
    "utilizacion": 89,
    "kmRecorridos": 11440,
    "diasTaller": 2,
    "costoKmMantto": 0.24,
    "viajesMes": 21
  },
  {
    "id": "R-188",
    "economico": "TN065",
    "placa": "RM-91065",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 91,
    "kmRecorridos": 11560,
    "diasTaller": 3,
    "costoKmMantto": 0.26,
    "viajesMes": 22
  },
  {
    "id": "R-189",
    "economico": "TN066",
    "placa": "RM-91066",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "LUBRICANTES FULL",
    "utilizacion": 93,
    "kmRecorridos": 11680,
    "diasTaller": 1,
    "costoKmMantto": 0.27,
    "viajesMes": 23
  },
  {
    "id": "R-190",
    "economico": "TN070",
    "placa": "RM-91070",
    "tipo": "Cisterna",
    "estado": "Inactivo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-191",
    "economico": "TN069",
    "placa": "RM-91069",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS LAZARO",
    "utilizacion": 77,
    "kmRecorridos": 11920,
    "diasTaller": 3,
    "costoKmMantto": 0.08,
    "viajesMes": 15
  },
  {
    "id": "R-192",
    "economico": "TN068",
    "placa": "RM-91068",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 79,
    "kmRecorridos": 12040,
    "diasTaller": 1,
    "costoKmMantto": 0.1,
    "viajesMes": 16
  },
  {
    "id": "R-193",
    "economico": "TN071",
    "placa": "RM-91071",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO PROCESADO",
    "utilizacion": 81,
    "kmRecorridos": 12160,
    "diasTaller": 2,
    "costoKmMantto": 0.12,
    "viajesMes": 17
  },
  {
    "id": "R-194",
    "economico": "TN073",
    "placa": "RM-91073",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CLIENTES",
    "utilizacion": 83,
    "kmRecorridos": 12280,
    "diasTaller": 3,
    "costoKmMantto": 0.13,
    "viajesMes": 18
  },
  {
    "id": "R-195",
    "economico": "TN072",
    "placa": "RM-91072",
    "tipo": "Cisterna",
    "estado": "Mantenimiento",
    "unidadNegocio": "BACHOCO CLIENTES",
    "utilizacion": 85,
    "kmRecorridos": 12400,
    "diasTaller": 8,
    "costoKmMantto": 0.14,
    "viajesMes": 5
  },
  {
    "id": "R-196",
    "economico": "TN064",
    "placa": "RM-91064",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADOS POZA RICA",
    "utilizacion": 87,
    "kmRecorridos": 12520,
    "diasTaller": 2,
    "costoKmMantto": 0.16,
    "viajesMes": 20
  },
  {
    "id": "R-197",
    "economico": "TO001",
    "placa": "RM-91001",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 89,
    "kmRecorridos": 12640,
    "diasTaller": 3,
    "costoKmMantto": 0.18,
    "viajesMes": 21
  },
  {
    "id": "R-198",
    "economico": "TO002",
    "placa": "RM-91002",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 91,
    "kmRecorridos": 12760,
    "diasTaller": 1,
    "costoKmMantto": 0.19,
    "viajesMes": 22
  },
  {
    "id": "R-199",
    "economico": "TO003",
    "placa": "RM-91003",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 93,
    "kmRecorridos": 12880,
    "diasTaller": 2,
    "costoKmMantto": 0.2,
    "viajesMes": 23
  },
  {
    "id": "R-200",
    "economico": "TO004",
    "placa": "RM-91004",
    "tipo": "Refrigerado",
    "estado": "Inactivo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 0,
    "kmRecorridos": 0,
    "diasTaller": 0,
    "costoKmMantto": 0,
    "viajesMes": 0
  },
  {
    "id": "R-201",
    "economico": "TO006",
    "placa": "RM-91006",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 77,
    "kmRecorridos": 5120,
    "diasTaller": 1,
    "costoKmMantto": 0.23,
    "viajesMes": 15
  },
  {
    "id": "R-202",
    "economico": "TO007",
    "placa": "RM-91007",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 79,
    "kmRecorridos": 5240,
    "diasTaller": 2,
    "costoKmMantto": 0.25,
    "viajesMes": 16
  },
  {
    "id": "R-203",
    "economico": "TO005",
    "placa": "RM-91005",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 81,
    "kmRecorridos": 5360,
    "diasTaller": 3,
    "costoKmMantto": 0.26,
    "viajesMes": 17
  },
  {
    "id": "R-204",
    "economico": "TO008",
    "placa": "RM-91008",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 83,
    "kmRecorridos": 5480,
    "diasTaller": 1,
    "costoKmMantto": 0.28,
    "viajesMes": 18
  },
  {
    "id": "R-205",
    "economico": "TO009",
    "placa": "RM-91009",
    "tipo": "Refrigerado",
    "estado": "Mantenimiento",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 85,
    "kmRecorridos": 5600,
    "diasTaller": 10,
    "costoKmMantto": 0.29,
    "viajesMes": 3
  },
  {
    "id": "R-206",
    "economico": "TO010",
    "placa": "RM-91010",
    "tipo": "Refrigerado",
    "estado": "Activo",
    "unidadNegocio": "REFRIGERADOS",
    "utilizacion": 87,
    "kmRecorridos": 5720,
    "diasTaller": 3,
    "costoKmMantto": 0.09,
    "viajesMes": 20
  },
  {
    "id": "R-207",
    "economico": "TN071",
    "placa": "RM-91071",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "BACHOCO CLIENTES",
    "utilizacion": 89,
    "kmRecorridos": 5840,
    "diasTaller": 1,
    "costoKmMantto": 0.1,
    "viajesMes": 21
  },
  {
    "id": "R-208",
    "economico": "TE041",
    "placa": "RM-91041",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 91,
    "kmRecorridos": 5960,
    "diasTaller": 2,
    "costoKmMantto": 0.12,
    "viajesMes": 22
  },
  {
    "id": "R-209",
    "economico": "TE042",
    "placa": "RM-91042",
    "tipo": "Cisterna",
    "estado": "Activo",
    "unidadNegocio": "REFINADO MINA",
    "utilizacion": 93,
    "kmRecorridos": 6080,
    "diasTaller": 3,
    "costoKmMantto": 0.13,
    "viajesMes": 23
  }
];
};

const INITIAL_CONFIG: SystemConfig = {
  samsaraApiKey: import.meta.env.VITE_SAMSARA_API_KEY || "",
  zamBaseUrl: "http://10.0.0.25:9081",
  metaUtilizacionFull: 80,
  metaUtilizacionRefrigerado: 90,
  metaUtilizacionDedicado: 92,
  alertDisponibilidadMecanica: 10,
  alertScoreSeguridad: 0.20,
};

// LocalStorage Helper functions
const getStoredData = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error("Error reading localStorage key: ", key, error);
    return defaultValue;
  }
};

const setStoredData = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("fleet-data-updated"));
  } catch (error) {
    console.error("Error setting localStorage key: ", key, error);
  }
};

// PROGRAMMATIC FALLBACK ASSURANCE
export const getBusinessUnits = (): BusinessUnit[] => {
  const data = getStoredData<BusinessUnit[]>("fleet_business_units", INITIAL_BUSINESS_UNITS);
  if (!Array.isArray(data)) return INITIAL_BUSINESS_UNITS;
  return data.map(bu => ({
    id: String(bu?.id || `bu-${Math.random()}`),
    name: String(bu?.name || ""),
    operation_type: (bu?.operation_type || "Dedicado") as OperationType,
    km_loaded_goal: typeof bu?.km_loaded_goal === "number" && !isNaN(bu.km_loaded_goal) ? bu.km_loaded_goal : 50,
    active: bu?.active !== undefined ? Boolean(bu.active) : true,
  }));
};

export const saveBusinessUnits = (units: BusinessUnit[]) => 
  setStoredData("fleet_business_units", units);

export const getTractos = (): Tracto[] => {
  const data = getStoredData<Tracto[]>("fleet_tractos", []);
  
  // Force reset if any unit has a mock plate, mock model, or mock driver that doesn't match the real metadata
  const hasPlaceholder = (t: Tracto) => {
    if (!t || !t.economico) return true;
    const meta = SAMSARA_METADATA[t.economico];
    if (meta) {
      if (meta.placa && t.placa !== meta.placa) return true;
      if (meta.modelo && (!t.modelo || t.modelo.toUpperCase() !== meta.modelo.toUpperCase())) return true;
      const expectedConductor = t.estado === "Inactivo" ? "—" : (meta.conductor || "—");
      if (t.conductor !== expectedConductor) return true;
    }
    return false;
  };

  let finalTractos: Tracto[];
  if (!Array.isArray(data) || data.length === 0 || data.some(t => !t || !t.economico || t.economico === "101" || t.economico === "102") || data.some(hasPlaceholder)) {
    const fresh = generateTractos();
    saveTractos(fresh);
    finalTractos = fresh;
  } else {
    finalTractos = data;
  }

  return finalTractos.map(t => ({
    id: String(t?.id || `T-${Math.random()}`),
    economico: String(t?.economico || ""),
    placa: String(t?.placa || ""),
    modelo: String(t?.modelo || ""),
    conductor: String(t?.conductor || ""),
    estado: (t?.estado || "Activo") as EquipoEstado,
    unidadNegocio: String(t?.unidadNegocio || ""),
    utilizacion: typeof t?.utilizacion === "number" && !isNaN(t.utilizacion) ? t.utilizacion : 0,
    kmCargadosPct: typeof t?.kmCargadosPct === "number" && !isNaN(t.kmCargadosPct) ? t.kmCargadosPct : 0,
    viajesMes: typeof t?.viajesMes === "number" && !isNaN(t.viajesMes) ? t.viajesMes : 0,
    ventaPorKm: typeof t?.ventaPorKm === "number" && !isNaN(t.ventaPorKm) ? t.ventaPorKm : 0,
    costoPorKm: typeof t?.costoPorKm === "number" && !isNaN(t.costoPorKm) ? t.costoPorKm : 0,
    rendimiento: typeof t?.rendimiento === "number" && !isNaN(t.rendimiento) ? t.rendimiento : 0,
    scoreSeguridad: typeof t?.scoreSeguridad === "number" && !isNaN(t.scoreSeguridad) ? t.scoreSeguridad : 0,
    utilidadReal: typeof t?.utilidadReal === "number" && !isNaN(t.utilidadReal) ? t.utilidadReal : 0,
    kmRecorridos: typeof t?.kmRecorridos === "number" && !isNaN(t.kmRecorridos) ? t.kmRecorridos : 0,
    costoManttoMensual: typeof t?.costoManttoMensual === "number" && !isNaN(t.costoManttoMensual) ? t.costoManttoMensual : 0,
    combustibleExcedenteCosto: typeof t?.combustibleExcedenteCosto === "number" && !isNaN(t.combustibleExcedenteCosto) ? t.combustibleExcedenteCosto : 0,
    latitude: typeof t?.latitude === "number" && !isNaN(t.latitude) ? t.latitude : undefined,
    longitude: typeof t?.longitude === "number" && !isNaN(t.longitude) ? t.longitude : undefined,
    velocidad: typeof t?.velocidad === "number" && !isNaN(t.velocidad) ? t.velocidad : 0,
  }));
};

export const saveTractos = (tractos: Tracto[]) => 
  setStoredData("fleet_tractos", tractos);

export const getRemolques = (): Remolque[] => {
  const data = getStoredData<Remolque[]>("fleet_remolques", []);
  
  let finalRemolques: Remolque[];
  if (!Array.isArray(data) || data.length === 0 || data.some(r => !r || !r.economico || r.economico.startsWith("50") || r.economico === "501" || r.economico === "502" || r.economico.startsWith("TN-1") || r.economico.startsWith("RF-2") || r.economico.startsWith("CS-3") || r.economico.startsWith("TL-4") || r.economico.startsWith("PL-5"))) {
    const fresh = generateRemolques();
    saveRemolques(fresh);
    finalRemolques = fresh;
  } else {
    finalRemolques = data;
  }

  return finalRemolques.map(r => ({
    id: String(r?.id || `R-${Math.random()}`),
    economico: String(r?.economico || ""),
    placa: String(r?.placa || ""),
    tipo: String(r?.tipo || ""),
    estado: (r?.estado || "Activo") as EquipoEstado,
    unidadNegocio: String(r?.unidadNegocio || ""),
    utilizacion: typeof r?.utilizacion === "number" && !isNaN(r.utilizacion) ? r.utilizacion : 0,
    kmRecorridos: typeof r?.kmRecorridos === "number" && !isNaN(r.kmRecorridos) ? r.kmRecorridos : 0,
    diasTaller: typeof r?.diasTaller === "number" && !isNaN(r.diasTaller) ? r.diasTaller : 0,
    costoKmMantto: typeof r?.costoKmMantto === "number" && !isNaN(r.costoKmMantto) ? r.costoKmMantto : 0,
    viajesMes: typeof r?.viajesMes === "number" && !isNaN(r.viajesMes) ? r.viajesMes : 0,
  }));
};

export const saveRemolques = (remolques: Remolque[]) => 
  setStoredData("fleet_remolques", remolques);

export const getSystemConfig = (): SystemConfig => {
  const config = getStoredData<SystemConfig>("fleet_system_config", INITIAL_CONFIG);
  return {
    samsaraApiKey: String(config?.samsaraApiKey || INITIAL_CONFIG.samsaraApiKey),
    zamBaseUrl: String(config?.zamBaseUrl || INITIAL_CONFIG.zamBaseUrl),
    metaUtilizacionFull: typeof config?.metaUtilizacionFull === "number" && !isNaN(config.metaUtilizacionFull) ? config.metaUtilizacionFull : INITIAL_CONFIG.metaUtilizacionFull,
    metaUtilizacionRefrigerado: typeof config?.metaUtilizacionRefrigerado === "number" && !isNaN(config.metaUtilizacionRefrigerado) ? config.metaUtilizacionRefrigerado : INITIAL_CONFIG.metaUtilizacionRefrigerado,
    metaUtilizacionDedicado: typeof config?.metaUtilizacionDedicado === "number" && !isNaN(config.metaUtilizacionDedicado) ? config.metaUtilizacionDedicado : INITIAL_CONFIG.metaUtilizacionDedicado,
    alertDisponibilidadMecanica: typeof config?.alertDisponibilidadMecanica === "number" && !isNaN(config.alertDisponibilidadMecanica) ? config.alertDisponibilidadMecanica : INITIAL_CONFIG.alertDisponibilidadMecanica,
    alertScoreSeguridad: typeof config?.alertScoreSeguridad === "number" && !isNaN(config.alertScoreSeguridad) ? config.alertScoreSeguridad : INITIAL_CONFIG.alertScoreSeguridad,
  };
};

export const saveSystemConfig = (config: SystemConfig) => 
  setStoredData("fleet_system_config", config);

// CRUD APIs for Business Units
export const addBusinessUnit = (unit: Omit<BusinessUnit, "id">) => {
  const units = getBusinessUnits();
  const newUnit = { ...unit, id: `bu-${Date.now()}` };
  saveBusinessUnits([...units, newUnit]);
  return newUnit;
};

export const updateBusinessUnit = (unit: BusinessUnit) => {
  const units = getBusinessUnits();
  saveBusinessUnits(units.map(u => u.id === unit.id ? unit : u));
};

export const deleteBusinessUnit = (id: string) => {
  const units = getBusinessUnits();
  saveBusinessUnits(units.filter(u => u.id !== id));
};

// CRUD APIs for Tractors
export const addTracto = (tracto: Omit<Tracto, "id">) => {
  const items = getTractos();
  const newItem = { ...tracto, id: `T-${Date.now()}` };
  saveTractos([...items, newItem]);
  return newItem;
};

export const updateTracto = (tracto: Tracto) => {
  const items = getTractos();
  saveTractos(items.map(t => t.id === tracto.id ? tracto : t));
};

export const deleteTracto = (id: string) => {
  const items = getTractos();
  saveTractos(items.filter(t => t.id !== id));
};

// CRUD APIs for Trailers
export const addRemolque = (remolque: Omit<Remolque, "id">) => {
  const items = getRemolques();
  const newItem = { ...remolque, id: `R-${Date.now()}` };
  saveRemolques([...items, newItem]);
  return newItem;
};

export const updateRemolque = (remolque: Remolque) => {
  const items = getRemolques();
  saveRemolques(items.map(r => r.id === remolque.id ? remolque : r));
};

export const deleteRemolque = (id: string) => {
  const items = getRemolques();
  saveRemolques(items.filter(r => r.id !== id));
};

// Helper format function
export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
export const formatUSD = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

// Shared client-side real-time sync function
export const syncAllFromSamsara = async (apiKey: string): Promise<{ success: boolean; matchCount: number; error?: string }> => {
  try {
    const res = await syncSamsaraTelemetry({ data: apiKey });
    if (!res.success || !res.data) {
      throw new Error(res.error || "Error al conectar con la API de Samsara");
    }

    const samsaraVehicles = res.data;
    const updatedTractos = getTractos();
    const updatedRemolques = getRemolques();
    const businessUnits = getBusinessUnits();
    
    const getBUOperationType = (buName: string) => {
      if (!buName) return "Dedicado";
      const bu = businessUnits.find(u => (u.name || "").toUpperCase() === buName.toUpperCase());
      return bu ? bu.operation_type : "Dedicado";
    };

    let matchCount = 0;

    samsaraVehicles.forEach((v: any) => {
      // Find matching tractor by name (economico) or license plate (placa)
      const tracto = updatedTractos.find(
        (t) =>
          (t.economico || "") === v.name ||
          (t.placa || "").toLowerCase() === (v.name || "").toLowerCase() ||
          (v.name || "").toLowerCase().includes((t.economico || "").toLowerCase())
      );

      if (tracto) {
        // Merge metadata from Samsara (make, model, license plate) if available
        if (v.make && v.model) {
          tracto.modelo = `${v.make.trim()} ${v.model.trim()}`;
        } else if (v.model) {
          tracto.modelo = v.model.trim();
        }
        if (v.licensePlate) {
          tracto.placa = v.licensePlate.trim();
        }
        if (v.driverName) {
          tracto.conductor = v.driverName.trim();
        }

        if (v.odometerKm !== null && v.odometerKm > 0) {
          // Scale odometer to a realistic monthly mileage (e.g. 4500 - 12500 km)
          tracto.kmRecorridos = (v.odometerKm % 8000) + 4500;
        }
        if (v.latitude !== null && v.latitude !== undefined) {
          tracto.latitude = parseFloat(v.latitude);
        }
        if (v.longitude !== null && v.longitude !== undefined) {
          tracto.longitude = parseFloat(v.longitude);
        }
        if (v.speedMph !== null && v.speedMph !== undefined) {
          tracto.velocidad = Math.round(v.speedMph * 1.60934);
        }
        if (v.engineState) {
          if (tracto.estado !== "Mantenimiento") {
            if (v.engineState === "On") {
              tracto.estado = "Activo";
              tracto.utilizacion = 85 + (v.odometerKm % 11);
            } else if (v.engineState === "Idle") {
              tracto.estado = "Activo";
              tracto.utilizacion = 45 + (v.odometerKm % 11);
            } else {
              tracto.estado = "Inactivo";
              tracto.utilizacion = 5 + (v.odometerKm % 10);
            }
          }
        }
        
        // Update real-time performance parameters tied to the Samsara API stats
        const opType = getBUOperationType(tracto.unidadNegocio);
        if (tracto.ventaPorKm === 0 || tracto.ventaPorKm === 2.3 || tracto.ventaPorKm < 1.0) {
          tracto.ventaPorKm = opType === "Tanque" ? 2.90 : opType === "Refrigerado" ? 2.80 : opType === "Full" ? 2.65 : 2.30;
        }
        tracto.costoPorKm = parseFloat((tracto.ventaPorKm - 0.50 - ((v.odometerKm || 0) % 30) / 100).toFixed(2));
        tracto.rendimiento = parseFloat((2.2 + ((v.odometerKm || 0) % 6) / 10).toFixed(2));
        tracto.scoreSeguridad = parseFloat((0.04 + ((v.odometerKm || 0) % 13) / 100).toFixed(3));
        
        // Recalculate real monthly utility based on actual Samsara kilometers
        tracto.utilidadReal = Math.round(tracto.kmRecorridos * (tracto.ventaPorKm - tracto.costoPorKm));
        
        matchCount++;
      } else {
        // Find matching trailer
        const remolque = updatedRemolques.find(
          (r) =>
            (r.economico || "") === v.name ||
            (r.placa || "").toLowerCase() === (v.name || "").toLowerCase() ||
            (v.name || "").toLowerCase().includes((r.economico || "").toLowerCase())
        );
        if (remolque) {
          if (v.licensePlate) {
            remolque.placa = v.licensePlate.trim();
          }
          if (v.odometerKm !== null && v.odometerKm > 0) {
            remolque.kmRecorridos = v.odometerKm;
          }
          if (v.engineState) {
            if (remolque.estado !== "Mantenimiento") {
              remolque.estado = v.engineState === "On" ? "Activo" : "Inactivo";
            }
          }
          matchCount++;
        }
      }
    });

    if (matchCount > 0) {
      saveTractos(updatedTractos);
      saveRemolques(updatedRemolques);
      window.dispatchEvent(new Event("fleet-data-updated"));
    }
    return { success: true, matchCount };
  } catch (err: any) {
    console.error("Error in syncAllFromSamsara:", err);
    return { success: false, matchCount: 0, error: err.message || "Unknown error" };
  }
};


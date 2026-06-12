export type EquipoEstado = "Activo" | "Inactivo" | "Mantenimiento";

export interface Tracto {
  id: string;
  placa: string;
  modelo: string;
  conductor: string;
  estado: EquipoEstado;
  utilizacion: number; // %
  cargaUtil: number; // %
  ventaPorKm: number; // USD/km
  tiempoMuerto: number; // %
  utilidadReal: number; // USD
  kmRecorridos: number;
}

export interface Remolque {
  id: string;
  placa: string;
  tipo: string;
  estado: EquipoEstado;
  utilizacion: number;
  cargaUtil: number;
  viajesMes: number;
}

export const tractos: Tracto[] = [
  { id: "T-001", placa: "ABC-1245", modelo: "Kenworth T680", conductor: "Carlos Méndez", estado: "Activo", utilizacion: 87, cargaUtil: 92, ventaPorKm: 2.45, tiempoMuerto: 8, utilidadReal: 18420, kmRecorridos: 12450 },
  { id: "T-002", placa: "DEF-3387", modelo: "Freightliner Cascadia", conductor: "Luis Ramírez", estado: "Activo", utilizacion: 91, cargaUtil: 88, ventaPorKm: 2.61, tiempoMuerto: 6, utilidadReal: 21300, kmRecorridos: 13880 },
  { id: "T-003", placa: "GHI-7721", modelo: "Volvo VNL 760", conductor: "Andrea Torres", estado: "Mantenimiento", utilizacion: 42, cargaUtil: 70, ventaPorKm: 2.18, tiempoMuerto: 38, utilidadReal: 6420, kmRecorridos: 4210 },
  { id: "T-004", placa: "JKL-9012", modelo: "Peterbilt 579", conductor: "Miguel Santos", estado: "Activo", utilizacion: 78, cargaUtil: 84, ventaPorKm: 2.32, tiempoMuerto: 12, utilidadReal: 15890, kmRecorridos: 11100 },
  { id: "T-005", placa: "MNO-4456", modelo: "Mack Anthem", conductor: "—", estado: "Inactivo", utilizacion: 0, cargaUtil: 0, ventaPorKm: 0, tiempoMuerto: 100, utilidadReal: -1240, kmRecorridos: 0 },
  { id: "T-006", placa: "PQR-2298", modelo: "Kenworth T880", conductor: "Daniela Cruz", estado: "Activo", utilizacion: 84, cargaUtil: 90, ventaPorKm: 2.55, tiempoMuerto: 9, utilidadReal: 19750, kmRecorridos: 12980 },
  { id: "T-007", placa: "STU-6610", modelo: "Volvo VNR 640", conductor: "Roberto Silva", estado: "Activo", utilizacion: 88, cargaUtil: 86, ventaPorKm: 2.40, tiempoMuerto: 7, utilidadReal: 17680, kmRecorridos: 12120 },
  { id: "T-008", placa: "VWX-8843", modelo: "Freightliner Cascadia", conductor: "—", estado: "Inactivo", utilizacion: 0, cargaUtil: 0, ventaPorKm: 0, tiempoMuerto: 100, utilidadReal: -980, kmRecorridos: 0 },
];

export const remolques: Remolque[] = [
  { id: "R-101", placa: "RM-2210", tipo: "Caja seca 53'", estado: "Activo", utilizacion: 89, cargaUtil: 94, viajesMes: 22 },
  { id: "R-102", placa: "RM-3318", tipo: "Refrigerado", estado: "Activo", utilizacion: 82, cargaUtil: 88, viajesMes: 19 },
  { id: "R-103", placa: "RM-4490", tipo: "Plataforma", estado: "Mantenimiento", utilizacion: 35, cargaUtil: 60, viajesMes: 8 },
  { id: "R-104", placa: "RM-5521", tipo: "Tolva", estado: "Activo", utilizacion: 78, cargaUtil: 91, viajesMes: 18 },
  { id: "R-105", placa: "RM-6612", tipo: "Caja seca 48'", estado: "Inactivo", utilizacion: 0, cargaUtil: 0, viajesMes: 0 },
  { id: "R-106", placa: "RM-7783", tipo: "Cisterna", estado: "Activo", utilizacion: 86, cargaUtil: 95, viajesMes: 21 },
];

export const monthlyPerformance = [
  { mes: "Ene", utilizacion: 72, ventas: 142000, utilidad: 38000 },
  { mes: "Feb", utilizacion: 75, ventas: 156000, utilidad: 42500 },
  { mes: "Mar", utilizacion: 78, ventas: 168000, utilidad: 47800 },
  { mes: "Abr", utilizacion: 81, ventas: 175000, utilidad: 51200 },
  { mes: "May", utilizacion: 79, ventas: 171000, utilidad: 49600 },
  { mes: "Jun", utilizacion: 84, ventas: 188000, utilidad: 56400 },
  { mes: "Jul", utilizacion: 86, ventas: 195000, utilidad: 60100 },
  { mes: "Ago", utilizacion: 83, ventas: 182000, utilidad: 54300 },
];

export interface UnidadNegocioStats {
  nombre: string;
  tractos: { activos: number; inactivos: number; mantto: number };
  remolques: { activos: number; inactivos: number; mantto: number };
}

export const unidadesNegocio: UnidadNegocioStats[] = [
  { nombre: "REFINADOS LAZARO",       tractos: { activos: 18, inactivos: 2, mantto: 3 }, remolques: { activos: 22, inactivos: 3, mantto: 4 } },
  { nombre: "REFINADO MINA",          tractos: { activos: 12, inactivos: 1, mantto: 2 }, remolques: { activos: 15, inactivos: 2, mantto: 3 } },
  { nombre: "REFINADOS VERACRUZ",     tractos: { activos: 16, inactivos: 2, mantto: 2 }, remolques: { activos: 20, inactivos: 1, mantto: 3 } },
  { nombre: "BACHOCO LAGOS",          tractos: { activos: 10, inactivos: 1, mantto: 1 }, remolques: { activos: 12, inactivos: 2, mantto: 2 } },
  { nombre: "BACHOCO CELAYA",         tractos: { activos: 11, inactivos: 0, mantto: 2 }, remolques: { activos: 13, inactivos: 1, mantto: 2 } },
  { nombre: "BACHOCO AGUASCALIENTES", tractos: { activos:  9, inactivos: 1, mantto: 1 }, remolques: { activos: 11, inactivos: 1, mantto: 2 } },
  { nombre: "LUBRICANTES FULL",       tractos: { activos:  8, inactivos: 1, mantto: 1 }, remolques: { activos: 10, inactivos: 1, mantto: 1 } },
  { nombre: "LUBRICANTES JUMBO",      tractos: { activos:  7, inactivos: 0, mantto: 1 }, remolques: { activos:  9, inactivos: 1, mantto: 1 } },
  { nombre: "REFRIGERADOS",           tractos: { activos: 14, inactivos: 2, mantto: 2 }, remolques: { activos: 17, inactivos: 2, mantto: 3 } },
  { nombre: "BULKMATIC",              tractos: { activos: 13, inactivos: 1, mantto: 2 }, remolques: { activos: 16, inactivos: 1, mantto: 2 } },
  { nombre: "REFINADOS POZA RICA",    tractos: { activos: 15, inactivos: 2, mantto: 2 }, remolques: { activos: 18, inactivos: 2, mantto: 3 } },
  { nombre: "BACHOCO PROCESADO",      tractos: { activos: 10, inactivos: 1, mantto: 1 }, remolques: { activos: 12, inactivos: 1, mantto: 2 } },
  { nombre: "BACHOCO CLIENTES",       tractos: { activos:  9, inactivos: 1, mantto: 1 }, remolques: { activos: 11, inactivos: 1, mantto: 2 } },
  { nombre: "DRAGON CARGO",           tractos: { activos: 12, inactivos: 1, mantto: 2 }, remolques: { activos: 14, inactivos: 2, mantto: 2 } },
];

export const formatUSD = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

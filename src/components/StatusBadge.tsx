import { cn } from "@/lib/utils";
import type { EquipoEstado } from "@/lib/fleet-data";

const styles: Record<EquipoEstado, string> = {
  Activo: "bg-success/10 text-success ring-success/20",
  Inactivo: "bg-destructive/10 text-destructive ring-destructive/20",
  Mantenimiento: "bg-warning/15 text-warning-foreground ring-warning/30",
};

export function StatusBadge({ estado }: { estado: EquipoEstado }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[estado],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          estado === "Activo" && "bg-success animate-pulse",
          estado === "Inactivo" && "bg-destructive",
          estado === "Mantenimiento" && "bg-warning",
        )}
      />
      {estado}
    </span>
  );
}

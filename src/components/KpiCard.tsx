import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, ExternalLink, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon: LucideIcon;
  category?: "productivity" | "financial" | "maintenance";
  formula?: string;
  meta?: string;
  progreso?: number; // percentage 0 to 100 for progress bar
  semaforo?: "green" | "yellow" | "red";
  fuente?: string;
  fuenteUrl?: string;
}

const categoryStyles = {
  productivity: "border-t-[3px] border-t-primary shadow-[0_4px_20px_-4px_rgba(59,130,246,0.06)] hover:border-primary/60",
  financial: "border-t-[3px] border-t-success shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)] hover:border-success/60",
  maintenance: "border-t-[3px] border-t-warning shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)] hover:border-warning/60",
};

const glowColors = {
  productivity: "rgba(59,130,246,0.08)",
  financial: "rgba(16,185,129,0.08)",
  maintenance: "rgba(245,158,11,0.08)",
};

const sparklineColors = {
  productivity: "#3B82F6",
  financial: "#10B981",
  maintenance: "#F59E0B",
};

const semaforoStyles = {
  green: "bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse",
  yellow: "bg-warning shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse",
  red: "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse",
};

const getWavePath = (seed: string) => {
  const val = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const y1 = 45 + (val % 10);
  const y2 = 20 + (val % 20);
  const y3 = 50 - (val % 15);
  const y4 = 30 + (val % 15);
  return `M 0 ${y1} Q 25 ${y2}, 50 ${y3} T 100 ${y4}`;
};

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel = "vs mes anterior",
  icon: Icon,
  category = "productivity",
  formula,
  meta,
  progreso,
  semaforo = "green",
  fuente,
  fuenteUrl,
}: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-card/70 to-card/25 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:-translate-y-1 flex flex-col justify-between min-h-[165px]",
          categoryStyles[category]
        )}
      >
        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle 120px at 50% 50%, ${glowColors[category]}, transparent)`,
          }}
        />

        {/* Embedded Vector Sparkline */}
        <div className="absolute bottom-0 left-0 right-0 h-10 opacity-20 group-hover:opacity-35 transition-opacity duration-300 overflow-hidden pointer-events-none">
          <svg viewBox="0 0 100 60" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`grad-${label.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparklineColors[category]} stopOpacity="0.4" />
                <stop offset="100%" stopColor={sparklineColors[category]} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area under wave */}
            <path
              d={`${getWavePath(label)} L 100 60 L 0 60 Z`}
              fill={`url(#grad-${label.replace(/[^a-zA-Z0-9]/g, '')})`}
            />
            {/* Wave line */}
            <path
              d={getWavePath(label)}
              fill="none"
              stroke={sparklineColors[category]}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
              {formula && (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/60 hover:text-muted-foreground cursor-help focus:outline-none">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] p-3 text-xs bg-popover border text-popover-foreground rounded-lg shadow-lg">
                    <p className="font-semibold text-primary mb-1">Fórmula:</p>
                    <p className="font-mono text-[11px] mb-2 bg-muted p-1 rounded border">{formula}</p>
                    {meta && (
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Meta:</span> {meta}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Indicator & Icon */}
            <div className="flex items-center gap-2">
              <span 
                className={cn("h-2.5 w-2.5 rounded-full shrink-0", semaforoStyles[semaforo])} 
                title={`Estado: ${semaforo}`}
              />
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>

          {/* Main KPI Value */}
          <div className="mt-2 flex items-baseline justify-between">
            <p className="font-display text-2xl font-bold tracking-tight text-foreground">{value}</p>
          </div>
        </div>

        {/* Footer info: Progress & source / delta */}
        <div className="mt-4 space-y-3">
          {progreso !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Avance meta</span>
                <span className="font-medium">{Math.round(progreso)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    semaforo === "green" ? "bg-success" : semaforo === "yellow" ? "bg-warning" : "bg-destructive"
                  )} 
                  style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px]">
            {delta !== undefined ? (
              <div
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  positive ? "text-success" : "text-destructive"
                )}
              >
                {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                <span>{Math.abs(delta)}%</span>
                <span className="text-muted-foreground/80 font-normal ml-0.5">{deltaLabel}</span>
              </div>
            ) : (
              <div className="text-muted-foreground/60 italic">Sin histórico</div>
            )}

            {fuenteUrl && (
              <a
                href={fuenteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-glow transition-colors focus:outline-none"
              >
                <span>{fuente}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

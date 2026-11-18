import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import {
  NOMBRES_DE_ESTADO_DE_PROYECTO,
  PUNTOS_DE_ESTADO_DE_PROYECTO,
  type EstadoProyecto,
} from "@/lib/portal/filtros-proyectos";

export function EstadoDeProyecto({ estado }: { estado?: EstadoProyecto }) {
  const actual = estado ?? "EN_DESARROLLO";
  return (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_PROYECTO[actual]}>{NOMBRES_DE_ESTADO_DE_PROYECTO[actual]}</PuntoDeEstado>
  );
}

export function BarraDeAvance({ porcentaje, etiqueta }: { porcentaje?: number | null; etiqueta: string }) {
  if (typeof porcentaje !== "number") {
    return <span className="text-sm text-tenue">Sin avances con porcentaje</span>;
  }
  const valor = Math.min(Math.max(porcentaje, 0), 100);
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-superficie-alta"
      >
        <span className="block h-full rounded-full bg-acento" style={{ width: `${valor}%` }} />
      </span>
      <span className="cifras shrink-0 text-sm">{valor}%</span>
    </span>
  );
}

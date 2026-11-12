import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Esquemas } from "@/lib/api/cliente";

type Seguimiento = Esquemas["SeguimientoPanel"];

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");

const ESTADOS = [
  { clave: "clubesAdecuados", etiqueta: "Adecuados", color: "bg-exito" },
  { clave: "clubesEnRiesgo", etiqueta: "En riesgo", color: "bg-aviso" },
  { clave: "clubesCriticos", etiqueta: "Críticos", color: "bg-error" },
  { clave: "clubesSinDatos", etiqueta: "Sin datos", color: "bg-tenue" },
] as const satisfies readonly { clave: keyof Seguimiento; etiqueta: string; color: string }[];

const BASE = "rounded-pieza bg-superficie p-5 sm:p-6";

export function SemaforoClubes({ seguimiento }: { seguimiento?: Seguimiento }) {
  if (!seguimiento) {
    return (
      <div className={BASE}>
        <p className="max-w-[60ch] text-tenue">
          No hay un período académico activo, así que todavía no se calcula el seguimiento de los
          clubes.
        </p>
      </div>
    );
  }

  const total = seguimiento.totalClubes ?? 0;
  const filas = ESTADOS.map((estado) => ({ ...estado, cantidad: seguimiento[estado.clave] ?? 0 }));
  const descripcion = filas
    .map((fila) => `${fila.cantidad} ${fila.etiqueta.toLowerCase()}`)
    .join(", ");

  return (
    <div className={BASE}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-[0.9375rem] text-tenue">
          <span className="cifras text-2xl font-medium tracking-tight text-tinta">
            {FORMATO_NUMERO.format(total)}
          </span>{" "}
          {total === 1 ? "club evaluado" : "clubes evaluados"} en el período
        </p>
        <Link
          href="/portal/seguimiento"
          className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-acento"
        >
          Ver el seguimiento
          <ArrowUpRight
            aria-hidden="true"
            size={16}
            className="transition-transform duration-150 ease-salida group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
          />
        </Link>
      </div>

      {total > 0 ? (
        <div
          role="img"
          aria-label={`Distribución de los clubes: ${descripcion}.`}
          className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        >
          {filas
            .filter((fila) => fila.cantidad > 0)
            .map((fila) => (
              <span key={fila.clave} className={fila.color} style={{ flexGrow: fila.cantidad }} />
            ))}
        </div>
      ) : (
        <div aria-hidden="true" className="mt-5 h-2.5 rounded-full bg-superficie-alta" />
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {filas.map((fila) => (
          <div key={fila.clave}>
            <dt className="flex items-center gap-2 text-sm text-tenue">
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${fila.color}`} />
              {fila.etiqueta}
            </dt>
            <dd className="cifras mt-1 text-xl font-medium">{FORMATO_NUMERO.format(fila.cantidad)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function EsqueletoSemaforo() {
  return (
    <div aria-hidden="true" className={`${BASE} motion-safe:animate-pulse`}>
      <div className="flex h-8 items-center">
        <div className="h-5 w-56 max-w-full rounded-full bg-superficie-alta" />
      </div>
      <div className="mt-5 h-2.5 rounded-full bg-superficie-alta" />
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((columna) => (
          <div key={columna} className="h-[3.25rem] rounded-[8px] bg-superficie-alta" />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useBusqueda } from "@/components/portal/Busqueda";
import type { ConteosPorEstado } from "@/lib/api/cursos";
import {
  ESTADOS_DE_CURSO,
  NOMBRES_DE_ESTADO_DE_CURSO,
  PUNTOS_DE_ESTADO_DE_CURSO,
  rutaDeCursos,
  type EstadoCurso,
  type FiltrosCursos,
} from "@/lib/portal/filtros-cursos";

type Props = {
  filtros: FiltrosCursos;
  conteos: ConteosPorEstado;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const SIN_DATO = "—";

const REJILLA = "mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4";
const FICHA = "flex h-[4.75rem] flex-col justify-between rounded-pieza border p-4 text-left";

export function ResumenPorEstado({ filtros, conteos }: Props) {
  const { navegar } = useBusqueda();

  function alternar(estado: EstadoCurso) {
    const siguiente = filtros.estado === estado ? null : estado;
    navegar(rutaDeCursos({ ...filtros, estado: siguiente, pagina: 1 }), {
      conservarPosicion: true,
    });
  }

  return (
    <div role="group" aria-label="Cursos por estado" className={REJILLA}>
      {ESTADOS_DE_CURSO.map((estado) => {
        const elegido = filtros.estado === estado;
        const cantidad = conteos[estado];
        return (
          <button
            key={estado}
            type="button"
            aria-pressed={elegido}
            onClick={() => alternar(estado)}
            className={`${FICHA} select-none transition-[transform,background-color,border-color] duration-150 ease-salida active:scale-[0.98] ${
              elegido
                ? "border-acento bg-superficie-alta"
                : "border-transparent bg-superficie hover:bg-superficie-alta"
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-tenue">
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${PUNTOS_DE_ESTADO_DE_CURSO[estado]}`}
              />
              {NOMBRES_DE_ESTADO_DE_CURSO[estado]}
            </span>
            <span className="cifras text-2xl font-medium leading-none tracking-tight">
              {typeof cantidad === "number" ? FORMATO_NUMERO.format(cantidad) : SIN_DATO}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EsqueletoResumenPorEstado() {
  return (
    <div aria-hidden="true" className={`${REJILLA} motion-safe:animate-pulse`}>
      {ESTADOS_DE_CURSO.map((estado) => (
        <div key={estado} className={`${FICHA} border-transparent bg-superficie`}>
          <span className="h-3 w-20 rounded-full bg-superficie-alta" />
          <span className="h-5 w-10 rounded-[6px] bg-superficie-alta" />
        </div>
      ))}
    </div>
  );
}

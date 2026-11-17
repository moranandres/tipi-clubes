"use client";

import { useBusqueda } from "./Busqueda";

export type FichaDeEstado = {
  valor: string;
  nombre: string;
  punto: string;
  cantidad: number | null;
  ruta: string;
};

type Props = {
  etiqueta: string;
  fichas: FichaDeEstado[];
  elegido: string | null;
  columnas?: string;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const SIN_DATO = "—";

const REJILLA = "mt-6 grid grid-cols-2 gap-3";
const FICHA = "flex h-[4.75rem] flex-col justify-between rounded-pieza border p-4 text-left";

export const COLUMNAS_DE_CUATRO_FICHAS = "lg:grid-cols-4";
export const COLUMNAS_DE_CINCO_FICHAS = "sm:grid-cols-3 xl:grid-cols-5";

export function FichasPorEstado({
  etiqueta,
  fichas,
  elegido,
  columnas = COLUMNAS_DE_CUATRO_FICHAS,
}: Props) {
  const { navegar } = useBusqueda();

  return (
    <div role="group" aria-label={etiqueta} className={`${REJILLA} ${columnas}`}>
      {fichas.map((ficha) => {
        const marcada = ficha.valor === elegido;
        return (
          <button
            key={ficha.valor}
            type="button"
            aria-pressed={marcada}
            onClick={() => navegar(ficha.ruta, { conservarPosicion: true })}
            className={`${FICHA} select-none transition-[transform,background-color,border-color] duration-150 ease-salida active:scale-[0.98] ${
              marcada
                ? "border-acento bg-superficie-alta"
                : "border-transparent bg-superficie hover:bg-superficie-alta"
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-tenue">
              <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${ficha.punto}`} />
              {ficha.nombre}
            </span>
            <span className="cifras text-2xl font-medium leading-none tracking-tight">
              {typeof ficha.cantidad === "number"
                ? FORMATO_NUMERO.format(ficha.cantidad)
                : SIN_DATO}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EsqueletoFichasPorEstado({
  cantidad,
  columnas = COLUMNAS_DE_CUATRO_FICHAS,
}: {
  cantidad: number;
  columnas?: string;
}) {
  return (
    <div aria-hidden="true" className={`${REJILLA} ${columnas} motion-safe:animate-pulse`}>
      {Array.from({ length: cantidad }, (_, indice) => (
        <div key={indice} className={`${FICHA} border-transparent bg-superficie`}>
          <span className="h-3 w-20 rounded-full bg-superficie-alta" />
          <span className="h-5 w-10 rounded-[6px] bg-superficie-alta" />
        </div>
      ))}
    </div>
  );
}

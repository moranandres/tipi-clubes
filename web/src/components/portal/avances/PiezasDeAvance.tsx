import Link from "next/link";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import type { Avance } from "@/lib/api/avances";
import {
  NOMBRES_DE_ALCANCE,
  NOMBRES_DE_NIVEL_DE_LOGRO,
  PUNTOS_DE_ALCANCE,
  PUNTOS_DE_NIVEL_DE_LOGRO,
  rutaDeAvance,
  type AlcanceAvance,
  type NivelLogro,
} from "@/lib/portal/filtros-avances";
import { identidadDe } from "@/lib/portal/identidad";
import { fechaCorta } from "@/lib/portal/tiempo";

export function AlcanceDeAvance({ alcance }: { alcance?: AlcanceAvance }) {
  if (!alcance) {
    return null;
  }
  return <PuntoDeEstado punto={PUNTOS_DE_ALCANCE[alcance]}>{NOMBRES_DE_ALCANCE[alcance]}</PuntoDeEstado>;
}

export function NivelDeLogro({ nivel }: { nivel?: NivelLogro }) {
  if (!nivel) {
    return null;
  }
  return <PuntoDeEstado punto={PUNTOS_DE_NIVEL_DE_LOGRO[nivel]}>{NOMBRES_DE_NIVEL_DE_LOGRO[nivel]}</PuntoDeEstado>;
}

export function sujetoDe(avance: Avance, minima: boolean): string {
  if (avance.alcance === "ESTUDIANTE" && avance.estudiante) {
    return identidadDe(
      {
        nombres: avance.estudiante.estudianteNombres,
        apellidos: avance.estudiante.estudianteApellidos,
        codigo: avance.estudiante.estudianteCodigo,
      },
      minima,
    ).principal;
  }
  if (avance.alcance === "PROYECTO") {
    return avance.proyectoTitulo ?? "Proyecto";
  }
  return avance.clubNombre ?? "Club";
}

export function ListaDeAvances({ avances, minima }: { avances: Avance[]; minima: boolean }) {
  return (
    <ol className="flex flex-col gap-2">
      {avances.map((avance) => (
        <li key={avance.id} className="rounded-control bg-superficie p-3.5 text-[0.9375rem]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <Link href={rutaDeAvance(avance.id ?? 0)} className="cifras font-medium text-acento">
              {fechaCorta(avance.fecha)}
            </Link>
            <span className="text-sm text-tenue">
              {avance.estado === "ANULADO"
                ? "Anulado"
                : typeof avance.porcentajeAvance === "number"
                  ? `${avance.porcentajeAvance}%`
                  : sujetoDe(avance, minima)}
            </span>
          </div>
          {avance.contenidoReservado ? (
            <p className="mt-1 text-sm text-tenue">Contenido reservado para tu rol.</p>
          ) : (
            <p className="mt-1 line-clamp-2 break-words text-tenue">{avance.resultados}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

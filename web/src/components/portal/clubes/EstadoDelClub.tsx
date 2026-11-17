"use client";

import {
  CambioDeEstado,
  type OpcionDeCambio,
} from "@/components/portal/formularios/CambioDeEstado";
import { cambiarEstadoDeClub } from "@/lib/acciones/clubes";
import {
  NOMBRES_DE_ESTADO,
  PUNTOS_DE_ESTADO_DE_CLUB,
  type EstadoClub,
} from "@/lib/portal/filtros-clubes";
import { TRANSICIONES_DE_CLUB, exigeMotivoDeClub } from "@/lib/portal/reglas-clubes";

type Props = {
  clubId: number;
  estado: EstadoClub;
  puedeReabrir: boolean;
  bloqueosDeCierre: string[];
  avisosDeCierre: string[];
};

const ACCIONES: Record<EstadoClub, string> = {
  PLANIFICADO: "Planificar",
  ACTIVO: "Activar",
  SUSPENDIDO: "Suspender",
  CERRADO: "Cerrar",
};

const DESCRIPCIONES: Record<EstadoClub, string> = {
  PLANIFICADO: "El club vuelve a estar en preparación.",
  ACTIVO: "El club funciona con normalidad y sus cursos pueden iniciar.",
  SUSPENDIDO: "El club se detiene de forma temporal y deja de admitir inscripciones.",
  CERRADO: "El club termina su actividad. Solo un administrador puede reabrirlo.",
};

const ESTADO_CERRADO: EstadoClub = "CERRADO";
const ESTADO_ACTIVO: EstadoClub = "ACTIVO";

export function EstadoDelClub({
  clubId,
  estado,
  puedeReabrir,
  bloqueosDeCierre,
  avisosDeCierre,
}: Props) {
  const estaCerrado = estado === ESTADO_CERRADO;
  const destinos = estaCerrado && !puedeReabrir ? [] : TRANSICIONES_DE_CLUB[estado];

  const opciones: OpcionDeCambio[] = destinos.map((destino) => ({
    estado: destino,
    accion: estaCerrado && destino === ESTADO_ACTIVO ? "Reabrir" : ACCIONES[destino],
    descripcion:
      estaCerrado && destino === ESTADO_ACTIVO
        ? "El club vuelve a estar activo. Los integrantes deben inscribirse de nuevo."
        : DESCRIPCIONES[destino],
    exigeMotivo: exigeMotivoDeClub(estado, destino),
    bloqueos: destino === ESTADO_CERRADO ? bloqueosDeCierre : [],
    avisos: destino === ESTADO_CERRADO ? avisosDeCierre : [],
  }));

  return (
    <CambioDeEstado
      titulo="Estado del club"
      estadoActual={NOMBRES_DE_ESTADO[estado]}
      puntoActual={PUNTOS_DE_ESTADO_DE_CLUB[estado]}
      opciones={opciones}
      sinOpciones="El club está cerrado. Solo un administrador puede reabrirlo."
      cambiar={(destino, motivo) => cambiarEstadoDeClub(clubId, destino, motivo)}
    />
  );
}

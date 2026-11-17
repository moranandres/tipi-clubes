"use client";

import {
  CambioDeEstado,
  type OpcionDeCambio,
} from "@/components/portal/formularios/CambioDeEstado";
import { cambiarEstadoDeEstudiante } from "@/lib/acciones/estudiantes";
import {
  NOMBRES_DE_ESTADO_DE_ESTUDIANTE,
  PUNTOS_DE_ESTADO_DE_ESTUDIANTE,
  type EstadoEstudiante,
} from "@/lib/portal/filtros-estudiantes";
import { TRANSICIONES_DE_ESTUDIANTE } from "@/lib/portal/reglas-estudiantes";

type Props = {
  estudianteId: number;
  estado: EstadoEstudiante;
  clubesActivos: number;
};

const ESTADO_ACTIVO: EstadoEstudiante = "ACTIVO";

const ACCIONES: Record<EstadoEstudiante, string> = {
  ACTIVO: "Reactivar",
  RETIRADO: "Marcar como retirado",
  EGRESADO: "Marcar como egresado",
};

const DESCRIPCIONES: Record<EstadoEstudiante, string> = {
  ACTIVO: "Vuelve a aparecer al registrar solicitudes de inscripción.",
  RETIRADO: "Dejó la institución. Su historial se conserva y ya no se le puede inscribir.",
  EGRESADO: "Terminó sus estudios. Su historial se conserva y ya no se le puede inscribir.",
};

function bloqueoPorClubes(clubesActivos: number): string {
  return clubesActivos === 1
    ? "Sigue activo en 1 club. Tramita primero su retiro del club."
    : `Sigue activo en ${clubesActivos} clubes. Tramita primero su retiro de cada club.`;
}

export function EstadoDelEstudiante({ estudianteId, estado, clubesActivos }: Props) {
  const opciones: OpcionDeCambio[] = TRANSICIONES_DE_ESTUDIANTE[estado].map((destino) => ({
    estado: destino,
    accion: ACCIONES[destino],
    descripcion: DESCRIPCIONES[destino],
    exigeMotivo: false,
    bloqueos:
      destino !== ESTADO_ACTIVO && clubesActivos > 0 ? [bloqueoPorClubes(clubesActivos)] : [],
    avisos: [],
  }));

  return (
    <CambioDeEstado
      titulo="Estado del estudiante"
      estadoActual={NOMBRES_DE_ESTADO_DE_ESTUDIANTE[estado]}
      puntoActual={PUNTOS_DE_ESTADO_DE_ESTUDIANTE[estado]}
      opciones={opciones}
      sinOpciones="Este estudiante no admite otros estados."
      conMotivo={false}
      cambiar={(destino) => cambiarEstadoDeEstudiante(estudianteId, destino)}
    />
  );
}

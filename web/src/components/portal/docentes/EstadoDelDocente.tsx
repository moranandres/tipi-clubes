"use client";

import { CambioDeEstado } from "@/components/portal/formularios/CambioDeEstado";
import { cambiarEstadoDeDocente } from "@/lib/acciones/docentes";
import {
  NOMBRES_DE_ESTADO_DE_DOCENTE,
  PUNTOS_DE_ESTADO_DE_DOCENTE,
  type EstadoDocente,
} from "@/lib/portal/filtros-docentes";

type Props = {
  docenteId: number;
  estado: EstadoDocente;
};

const DESTINOS: Record<EstadoDocente, EstadoDocente> = {
  ACTIVO: "INACTIVO",
  INACTIVO: "ACTIVO",
};

const ACCIONES: Record<EstadoDocente, string> = {
  ACTIVO: "Reactivar",
  INACTIVO: "Desactivar",
};

const DESCRIPCIONES: Record<EstadoDocente, string> = {
  ACTIVO: "Vuelve a aparecer al asignar el docente responsable de un club.",
  INACTIVO:
    "Deja de aparecer al asignar clubes. Antes debes reasignar o cerrar los clubes que tiene a cargo.",
};

export function EstadoDelDocente({ docenteId, estado }: Props) {
  const destino = DESTINOS[estado];

  return (
    <CambioDeEstado
      titulo="Estado del docente"
      estadoActual={NOMBRES_DE_ESTADO_DE_DOCENTE[estado]}
      puntoActual={PUNTOS_DE_ESTADO_DE_DOCENTE[estado]}
      opciones={[
        {
          estado: destino,
          accion: ACCIONES[destino],
          descripcion: DESCRIPCIONES[destino],
          exigeMotivo: false,
          bloqueos: [],
          avisos: [],
        },
      ]}
      sinOpciones=""
      conMotivo={false}
      cambiar={(nuevo) => cambiarEstadoDeDocente(docenteId, nuevo)}
    />
  );
}

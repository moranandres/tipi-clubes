"use client";

import { CambioDeEstado } from "@/components/portal/formularios/CambioDeEstado";
import { cambiarEstadoDeContenido } from "@/lib/acciones/contenidos";
import {
  NOMBRE_DE_ESTADO_DE_CONTENIDO,
  PUNTOS_DE_ESTADO_DE_CONTENIDO,
  type EstadoContenido,
} from "@/lib/portal/filtros-contenidos";

type Props = {
  contenidoId: number;
  estado: EstadoContenido;
  actividades: number;
};

const DESTINOS: Record<EstadoContenido, EstadoContenido> = {
  ACTIVO: "INACTIVO",
  INACTIVO: "ACTIVO",
};

const ACCIONES: Record<EstadoContenido, string> = {
  ACTIVO: "Reactivar",
  INACTIVO: "Desactivar",
};

const DESCRIPCIONES: Record<EstadoContenido, string> = {
  ACTIVO: "Vuelve a aparecer al planificar actividades y al registrar avances.",
  INACTIVO: "Deja de ofrecerse en las actividades nuevas. No se borra de las que ya lo usan.",
};

function avisosPara(destino: EstadoContenido, actividades: number): string[] {
  if (destino !== "INACTIVO" || actividades === 0) {
    return [];
  }
  return [
    actividades === 1
      ? "Ya se usa en 1 actividad, que lo conservará."
      : `Ya se usa en ${actividades} actividades, que lo conservarán.`,
  ];
}

export function EstadoDelContenido({ contenidoId, estado, actividades }: Props) {
  const destino = DESTINOS[estado];

  return (
    <CambioDeEstado
      titulo="Estado del contenido"
      estadoActual={NOMBRE_DE_ESTADO_DE_CONTENIDO[estado]}
      puntoActual={PUNTOS_DE_ESTADO_DE_CONTENIDO[estado]}
      opciones={[
        {
          estado: destino,
          accion: ACCIONES[destino],
          descripcion: DESCRIPCIONES[destino],
          exigeMotivo: false,
          bloqueos: [],
          avisos: avisosPara(destino, actividades),
        },
      ]}
      sinOpciones=""
      conMotivo={false}
      cambiar={(nuevo) => cambiarEstadoDeContenido(contenidoId, nuevo)}
    />
  );
}

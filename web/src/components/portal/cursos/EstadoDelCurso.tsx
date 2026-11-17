"use client";

import {
  CambioDeEstado,
  type OpcionDeCambio,
} from "@/components/portal/formularios/CambioDeEstado";
import { cambiarEstadoDeCurso } from "@/lib/acciones/cursos";
import {
  NOMBRES_DE_ESTADO_DE_CURSO,
  PUNTOS_DE_ESTADO_DE_CURSO,
  type EstadoCurso,
} from "@/lib/portal/filtros-cursos";
import { TRANSICIONES_DE_CURSO, exigeMotivoDeCurso } from "@/lib/portal/reglas-cursos";

type Props = {
  cursoId: number;
  estado: EstadoCurso;
  tieneHorarios: boolean;
  clubActivo: boolean | null;
};

const ACCIONES: Record<EstadoCurso, string> = {
  PLANIFICADO: "Planificar",
  EN_CURSO: "Iniciar",
  FINALIZADO: "Finalizar",
  CANCELADO: "Cancelar el curso",
};

const DESCRIPCIONES: Record<EstadoCurso, string> = {
  PLANIFICADO: "El curso vuelve a estar en preparación.",
  EN_CURSO: "El curso empieza a dictarse con sus horarios actuales.",
  FINALIZADO:
    "El curso termina. Las inscripciones activas pasan a finalizadas y las actividades futuras se cancelan.",
  CANCELADO:
    "El curso no continúa. Las inscripciones activas se retiran y las actividades futuras se cancelan.",
};

const SIN_RETORNO = "Este cambio es definitivo: el curso ya no se podrá modificar.";
const ESTADO_EN_CURSO: EstadoCurso = "EN_CURSO";

export function EstadoDelCurso({ cursoId, estado, tieneHorarios, clubActivo }: Props) {
  const bloqueosDeInicio = [
    tieneHorarios ? null : "Agrega al menos un horario para poder iniciar el curso.",
    clubActivo === false ? "El club debe estar activo para iniciar el curso." : null,
  ].filter((bloqueo): bloqueo is string => bloqueo !== null);

  const opciones: OpcionDeCambio[] = TRANSICIONES_DE_CURSO[estado].map((destino) => ({
    estado: destino,
    accion: ACCIONES[destino],
    descripcion: DESCRIPCIONES[destino],
    exigeMotivo: exigeMotivoDeCurso(destino),
    bloqueos: destino === ESTADO_EN_CURSO ? bloqueosDeInicio : [],
    avisos: destino === ESTADO_EN_CURSO ? [] : [SIN_RETORNO],
  }));

  return (
    <CambioDeEstado
      titulo="Estado del curso"
      estadoActual={NOMBRES_DE_ESTADO_DE_CURSO[estado]}
      puntoActual={PUNTOS_DE_ESTADO_DE_CURSO[estado]}
      opciones={opciones}
      sinOpciones="Un curso finalizado o cancelado ya no cambia de estado."
      cambiar={(destino, motivo) => cambiarEstadoDeCurso(cursoId, destino, motivo)}
    />
  );
}

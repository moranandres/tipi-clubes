import {
  NOMBRES_DE_TIPO_DE_CERTIFICADO,
  TIPOS_DE_COMPETENCIA,
  TIPOS_DE_CURSO,
  type TipoCertificado,
} from "./filtros-certificados";

export const RESULTADOS_DE_CURSO = ["APROBADO", "NO_APROBADO"] as const;

export type ResultadoCurso = (typeof RESULTADOS_DE_CURSO)[number];

export const NOMBRES_DE_RESULTADO_DE_CURSO: Record<ResultadoCurso, string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
};

export const PUNTOS_DE_RESULTADO_DE_CURSO: Record<ResultadoCurso, string> = {
  APROBADO: "bg-exito",
  NO_APROBADO: "bg-aviso",
};

export const OPCIONES_DE_RESULTADO_DE_CURSO = RESULTADOS_DE_CURSO.map((resultado) => ({
  valor: resultado,
  texto: NOMBRES_DE_RESULTADO_DE_CURSO[resultado],
}));

export const NOMBRES_DE_ESTADO_EN_CURSO: Record<string, string> = {
  ACTIVA: "Cursando",
  RETIRADA: "Retirado",
  FINALIZADA: "Terminó el curso",
};

export const DESCRIPCIONES_DE_TIPO_DE_CERTIFICADO: Record<TipoCertificado, string> = {
  PARTICIPACION_CURSO: "Acredita que el estudiante cursó y terminó el curso.",
  APROBACION_CURSO: "Acredita que aprobó el curso. Exige el resultado Aprobado.",
  PARTICIPACION_COMPETENCIA: "Acredita que representó al club en la competencia.",
  RECONOCIMIENTO_COMPETENCIA: "Acredita el puesto o el reconocimiento obtenido.",
};

export const LIMITES_DE_ANULACION = {
  motivoMinimo: 10,
  motivoMaximo: 500,
} as const;

export type ParticipanteParaCertificar = {
  estado?: string;
  resultado?: string;
};

export type ParticipacionParaCertificar = {
  inicioDeEdicion: string | null;
  edicionNombre: string;
  puesto?: number;
  reconocimiento?: string;
};

export type CertificadoExistente = {
  id?: number;
  tipo?: string;
  codigoVerificacion?: string;
};

const FINALIZADA = "FINALIZADA";
const APROBADO: ResultadoCurso = "APROBADO";

export function esResultadoDeCurso(valor: unknown): valor is ResultadoCurso {
  return RESULTADOS_DE_CURSO.includes(valor as ResultadoCurso);
}

function fechaConBarras(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function bloqueoDeCurso(
  tipo: TipoCertificado,
  participante: ParticipanteParaCertificar,
  curso: string,
): string | null {
  if (participante.estado !== FINALIZADA) {
    return `Solo se certifican cursos finalizados; la inscripción del estudiante en el curso «${curso}» está en estado ${participante.estado ?? "desconocido"}.`;
  }
  if (tipo === "APROBACION_CURSO" && participante.resultado !== APROBADO) {
    return `El certificado de aprobación exige que el estudiante haya aprobado el curso «${curso}»; su resultado es ${participante.resultado ?? "sin registrar"}.`;
  }
  return null;
}

export function bloqueoDeCompetencia(
  tipo: TipoCertificado,
  participacion: ParticipacionParaCertificar,
  hoy: string,
): string | null {
  const { inicioDeEdicion, edicionNombre } = participacion;
  if (!inicioDeEdicion) {
    return `Solo se certifica la participación en una edición que ya empezó; «${edicionNombre}» no tiene fecha de inicio registrada.`;
  }
  if (inicioDeEdicion > hoy) {
    return `Solo se certifica la participación en una edición que ya empezó; «${edicionNombre}» empieza el ${fechaConBarras(inicioDeEdicion)}.`;
  }
  if (
    tipo === "RECONOCIMIENTO_COMPETENCIA" &&
    typeof participacion.puesto !== "number" &&
    !participacion.reconocimiento
  ) {
    return "El certificado de reconocimiento exige que la participación tenga un puesto o un reconocimiento registrado.";
  }
  return null;
}

export function mensajeDeVigente(codigo: string): string {
  return `El estudiante ya tiene un certificado vigente de este tipo (${codigo}). Anúlelo si necesita emitir uno nuevo.`;
}

export function vigenteDe(
  tipo: TipoCertificado,
  existentes: readonly CertificadoExistente[],
): CertificadoExistente | null {
  return existentes.find((certificado) => certificado.tipo === tipo) ?? null;
}

export function bloqueoDeResultado(
  participante: ParticipanteParaCertificar & { certificadosVigentes?: readonly CertificadoExistente[] },
  nuevo: string,
  curso: string,
): string | null {
  if (participante.estado !== FINALIZADA) {
    return `Solo se registra el resultado de quienes terminaron el curso; la inscripción en «${curso}» está en estado ${participante.estado ?? "desconocido"}.`;
  }
  const conAprobacion = (participante.certificadosVigentes ?? []).some(
    (certificado) => certificado.tipo === "APROBACION_CURSO",
  );
  if (participante.resultado === APROBADO && nuevo !== APROBADO && conAprobacion) {
    return "El estudiante tiene un certificado de aprobación vigente de este curso; anúlelo antes de cambiar el resultado.";
  }
  return null;
}

export function tamanoDeArchivo(bytes?: number): string | null {
  if (typeof bytes !== "number" || bytes <= 0) {
    return null;
  }
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type OpcionDeEmision = {
  tipo: TipoCertificado;
  nombre: string;
  descripcion: string;
  bloqueo: string | null;
  vigente: { id: number; codigo: string } | null;
};

function opcionDe(
  tipo: TipoCertificado,
  bloqueo: string | null,
  existentes: readonly CertificadoExistente[],
): OpcionDeEmision {
  const vigente = vigenteDe(tipo, existentes);
  return {
    tipo,
    nombre: NOMBRES_DE_TIPO_DE_CERTIFICADO[tipo],
    descripcion: DESCRIPCIONES_DE_TIPO_DE_CERTIFICADO[tipo],
    bloqueo,
    vigente:
      vigente && typeof vigente.id === "number"
        ? { id: vigente.id, codigo: vigente.codigoVerificacion ?? "Certificado" }
        : null,
  };
}

export function opcionesDeEmisionDeCurso(
  participante: ParticipanteParaCertificar & { certificadosVigentes?: readonly CertificadoExistente[] },
  curso: string,
): OpcionDeEmision[] {
  return TIPOS_DE_CURSO.map((tipo) =>
    opcionDe(tipo, bloqueoDeCurso(tipo, participante, curso), participante.certificadosVigentes ?? []),
  );
}

export function opcionesDeEmisionDeCompetencia(
  participacion: ParticipacionParaCertificar,
  hoy: string,
  vigentes: readonly CertificadoExistente[],
): OpcionDeEmision[] {
  return TIPOS_DE_COMPETENCIA.map((tipo) =>
    opcionDe(tipo, bloqueoDeCompetencia(tipo, participacion, hoy), vigentes),
  );
}

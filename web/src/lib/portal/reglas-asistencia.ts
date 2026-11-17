import { ESTADOS_DE_ASISTENCIA, type EstadoAsistencia } from "./filtros-asistencia";

export type RegistroEnPlanilla = {
  estudianteId: number;
  estado: EstadoAsistencia | null;
  observacion: string;
};

export type ResultadoDeValidacion = {
  porEstudiante: Record<number, string>;
  motivo?: string;
  general?: string;
};

export type Conteo = Record<EstadoAsistencia, number> & { pendientes: number };

export const LIMITES_DE_ASISTENCIA = {
  observacion: 500,
  motivo: 500,
  registros: 200,
} as const;

export const CAMPO_DE_MOTIVO = "motivoCorreccion";

const ESTADO_JUSTIFICADO: EstadoAsistencia = "JUSTIFICADO";

export function esEstadoDeAsistencia(valor: unknown): valor is EstadoAsistencia {
  return ESTADOS_DE_ASISTENCIA.includes(valor as EstadoAsistencia);
}

export function esCorreccion(registro: RegistroEnPlanilla, original: RegistroEnPlanilla | undefined): boolean {
  if (!original?.estado || !registro.estado) {
    return false;
  }
  return (
    registro.estado !== original.estado ||
    registro.observacion.trim() !== original.observacion.trim()
  );
}

export function contarCorrecciones(
  registros: readonly RegistroEnPlanilla[],
  originales: ReadonlyMap<number, RegistroEnPlanilla>,
): number {
  return registros.filter((registro) => esCorreccion(registro, originales.get(registro.estudianteId)))
    .length;
}

export function contarEstados(registros: readonly RegistroEnPlanilla[]): Conteo {
  const conteo: Conteo = { PRESENTE: 0, ATRASADO: 0, AUSENTE: 0, JUSTIFICADO: 0, pendientes: 0 };
  for (const registro of registros) {
    if (registro.estado) {
      conteo[registro.estado] += 1;
    } else {
      conteo.pendientes += 1;
    }
  }
  return conteo;
}

export function errorDeRegistro(registro: RegistroEnPlanilla): string | undefined {
  const observacion = registro.observacion.trim();
  if (observacion.length > LIMITES_DE_ASISTENCIA.observacion) {
    return `La observación admite hasta ${LIMITES_DE_ASISTENCIA.observacion} caracteres.`;
  }
  if (registro.estado === ESTADO_JUSTIFICADO && !observacion) {
    return "Escribe la justificación en la observación.";
  }
  return undefined;
}

export function validarPlanilla(
  registros: readonly RegistroEnPlanilla[],
  originales: ReadonlyMap<number, RegistroEnPlanilla>,
  motivo: string,
): ResultadoDeValidacion {
  const resultado: ResultadoDeValidacion = { porEstudiante: {} };
  const marcados = registros.filter((registro) => registro.estado);

  if (marcados.length === 0) {
    resultado.general = "Marca la asistencia de al menos un estudiante.";
    return resultado;
  }
  if (marcados.length > LIMITES_DE_ASISTENCIA.registros) {
    resultado.general = `Se registran como máximo ${LIMITES_DE_ASISTENCIA.registros} estudiantes a la vez.`;
  }

  for (const registro of marcados) {
    const error = errorDeRegistro(registro);
    if (error) {
      resultado.porEstudiante[registro.estudianteId] = error;
    }
  }

  const texto = motivo.trim();
  const correcciones = contarCorrecciones(marcados, originales);
  if (correcciones > 0 && !texto) {
    resultado.motivo =
      correcciones === 1
        ? "Cambiaste la asistencia ya registrada de 1 estudiante: escribe el motivo de la corrección."
        : `Cambiaste la asistencia ya registrada de ${correcciones} estudiantes: escribe el motivo de la corrección.`;
  } else if (texto.length > LIMITES_DE_ASISTENCIA.motivo) {
    resultado.motivo = `El motivo admite hasta ${LIMITES_DE_ASISTENCIA.motivo} caracteres.`;
  }

  return resultado;
}

export function hayProblemas(resultado: ResultadoDeValidacion): boolean {
  return Boolean(
    resultado.general || resultado.motivo || Object.keys(resultado.porEstudiante).length > 0,
  );
}

export function registrosDe(valor: unknown): RegistroEnPlanilla[] {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor
    .slice(0, LIMITES_DE_ASISTENCIA.registros + 1)
    .map((elemento) => {
      const origen = (typeof elemento === "object" && elemento !== null ? elemento : {}) as Record<
        string,
        unknown
      >;
      const id = Number(origen.estudianteId);
      return {
        estudianteId: Number.isSafeInteger(id) && id > 0 ? id : 0,
        estado: esEstadoDeAsistencia(origen.estado) ? origen.estado : null,
        observacion:
          typeof origen.observacion === "string"
            ? origen.observacion.slice(0, LIMITES_DE_ASISTENCIA.observacion + 1)
            : "",
      };
    })
    .filter((registro) => registro.estudianteId > 0);
}

export function porcentajeLegible(valor?: number | null): string {
  return typeof valor === "number" ? `${valor.toLocaleString("es-EC", { maximumFractionDigits: 1 })} %` : "—";
}

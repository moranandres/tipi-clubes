import { NIVELES_DE_CURSO, type NivelCurso } from "./filtros-cursos";
import { enteroDe } from "./validacion";

export type DatosDeSolicitud = {
  clubId: string;
  estudianteId: string;
  cursoId: string;
  nivel: string;
  conocimientos: string;
  experienciaPrevia: string;
  motivacion: string;
};

export type CampoDeSolicitud = keyof DatosDeSolicitud;
export type ErroresDeSolicitud = Partial<Record<CampoDeSolicitud, string>>;

export const CAMPOS_DE_SOLICITUD: readonly CampoDeSolicitud[] = [
  "clubId",
  "estudianteId",
  "cursoId",
  "nivel",
  "conocimientos",
  "experienciaPrevia",
  "motivacion",
];

export type DatosDeAprobacion = {
  nivelAsignado: string;
  cursoId: string;
  observacion: string;
  autorizarSobrecupo: string;
};

export type CampoDeAprobacion = keyof DatosDeAprobacion;
export type ErroresDeAprobacion = Partial<Record<CampoDeAprobacion, string>>;

export const CAMPOS_DE_APROBACION: readonly CampoDeAprobacion[] = [
  "nivelAsignado",
  "cursoId",
  "observacion",
  "autorizarSobrecupo",
];

export const LIMITES_DE_SOLICITUD = {
  texto: 2000,
  motivacionMinima: 10,
  observacion: 500,
  motivoMinimo: 5,
  motivoMaximo: 500,
} as const;

export const SOBRECUPO_AUTORIZADO = "si";

const NIVEL_PRINCIPIANTE: NivelCurso = "PRINCIPIANTE";
const NIVEL_AVANZADO: NivelCurso = "AVANZADO";

export function esNivel(valor: string): valor is NivelCurso {
  return NIVELES_DE_CURSO.includes(valor as NivelCurso);
}

export function pideConocimientos(nivel: string): boolean {
  return esNivel(nivel) && nivel !== NIVEL_PRINCIPIANTE;
}

export function pideExperiencia(nivel: string): boolean {
  return nivel === NIVEL_AVANZADO;
}

export function validarSolicitud(datos: DatosDeSolicitud): ErroresDeSolicitud {
  const errores: ErroresDeSolicitud = {};

  if (!enteroDe(datos.clubId)) {
    errores.clubId = "Elige el club al que se inscribe.";
  }
  if (!enteroDe(datos.estudianteId)) {
    errores.estudianteId = "Elige el estudiante.";
  }
  if (datos.cursoId !== "" && !enteroDe(datos.cursoId)) {
    errores.cursoId = "Elige un curso válido o deja la solicitud solo para el club.";
  }
  if (!esNivel(datos.nivel)) {
    errores.nivel = "Elige el nivel de conocimiento del estudiante.";
  }

  const conocimientos = datos.conocimientos.trim();
  if (pideConocimientos(datos.nivel) && !conocimientos) {
    errores.conocimientos = "Describe lo que el estudiante ya sabe; es obligatorio para este nivel.";
  } else if (conocimientos.length > LIMITES_DE_SOLICITUD.texto) {
    errores.conocimientos = `Admite hasta ${LIMITES_DE_SOLICITUD.texto} caracteres.`;
  }

  const experiencia = datos.experienciaPrevia.trim();
  if (pideExperiencia(datos.nivel) && !experiencia) {
    errores.experienciaPrevia =
      "Describe la experiencia previa; es obligatoria para el nivel avanzado.";
  } else if (experiencia.length > LIMITES_DE_SOLICITUD.texto) {
    errores.experienciaPrevia = `Admite hasta ${LIMITES_DE_SOLICITUD.texto} caracteres.`;
  }

  const motivacion = datos.motivacion.trim();
  if (!motivacion) {
    errores.motivacion = "Escribe por qué el estudiante quiere entrar al club.";
  } else if (
    motivacion.length < LIMITES_DE_SOLICITUD.motivacionMinima ||
    motivacion.length > LIMITES_DE_SOLICITUD.texto
  ) {
    errores.motivacion = `La motivación debe tener entre ${LIMITES_DE_SOLICITUD.motivacionMinima} y ${LIMITES_DE_SOLICITUD.texto} caracteres.`;
  }

  return errores;
}

export function validarAprobacion(datos: DatosDeAprobacion): ErroresDeAprobacion {
  const errores: ErroresDeAprobacion = {};

  if (!esNivel(datos.nivelAsignado)) {
    errores.nivelAsignado = "Elige el nivel que se asigna al estudiante.";
  }
  if (datos.cursoId !== "" && !enteroDe(datos.cursoId)) {
    errores.cursoId = "Elige un curso válido o aprueba solo el ingreso al club.";
  }

  const observacion = datos.observacion.trim();
  if (datos.autorizarSobrecupo === SOBRECUPO_AUTORIZADO && !observacion) {
    errores.observacion = "Justifica aquí por qué autorizas el sobrecupo.";
  } else if (observacion.length > LIMITES_DE_SOLICITUD.observacion) {
    errores.observacion = `Admite hasta ${LIMITES_DE_SOLICITUD.observacion} caracteres.`;
  }

  return errores;
}

export function errorDeMotivo(
  motivo: string,
  minimo: number = LIMITES_DE_SOLICITUD.motivoMinimo,
  maximo: number = LIMITES_DE_SOLICITUD.motivoMaximo,
): string | undefined {
  const texto = motivo.trim();
  if (!texto) {
    return "Escribe el motivo.";
  }
  if (texto.length < minimo || texto.length > maximo) {
    return `El motivo debe tener entre ${minimo} y ${maximo} caracteres.`;
  }
  return undefined;
}

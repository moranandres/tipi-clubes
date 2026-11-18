import { NIVELES_DE_CATEGORIA, type NivelCategoria } from "./filtros-competencias";
import { esFechaValida, fechaCorta } from "./tiempo";
import { enteroDe, errorDeLongitud, errorDeObligatorio } from "./validacion";

export type DatosDeResultado = {
  equipoNombre: string;
  puesto: string;
  reconocimiento: string;
  observaciones: string;
};

export type DatosDeParticipacion = DatosDeResultado & {
  clubId: string;
  inscripcionId: string;
  competenciaId: string;
  edicionId: string;
  categoriaId: string;
};

export type CampoDeParticipacion = keyof DatosDeParticipacion;
export type ErroresDeParticipacion = Partial<Record<CampoDeParticipacion, string>>;

export type ContextoDeResultado = {
  inicioDeEdicion: string | null;
  hoy: string | null;
  anterior: { puesto: string; reconocimiento: string } | null;
};

export type DatosDeCompetencia = {
  nombre: string;
  organizador: string;
  sitioWeb: string;
};

export type CampoDeCompetencia = keyof DatosDeCompetencia;
export type ErroresDeCompetencia = Partial<Record<CampoDeCompetencia, string>>;

export type DatosDeEdicion = {
  nombre: string;
  anio: string;
  fechaInicio: string;
  fechaFin: string;
  sede: string;
};

export type CampoDeEdicion = keyof DatosDeEdicion;
export type ErroresDeEdicion = Partial<Record<CampoDeEdicion, string>>;

export type DatosDeCategoria = {
  nivel: string;
  nombre: string;
  descripcion: string;
};

export type CampoDeCategoria = keyof DatosDeCategoria;
export type ErroresDeCategoria = Partial<Record<CampoDeCategoria, string>>;

export const CAMPOS_DE_RESULTADO: readonly (keyof DatosDeResultado)[] = [
  "equipoNombre",
  "puesto",
  "reconocimiento",
  "observaciones",
];

export const CAMPOS_DE_PARTICIPACION: readonly CampoDeParticipacion[] = [
  "clubId",
  "inscripcionId",
  "competenciaId",
  "edicionId",
  "categoriaId",
  ...CAMPOS_DE_RESULTADO,
];

export const CAMPOS_DE_COMPETENCIA: readonly CampoDeCompetencia[] = ["nombre", "organizador", "sitioWeb"];

export const CAMPOS_DE_EDICION: readonly CampoDeEdicion[] = [
  "nombre",
  "anio",
  "fechaInicio",
  "fechaFin",
  "sede",
];

export const CAMPOS_DE_CATEGORIA: readonly CampoDeCategoria[] = ["nivel", "nombre", "descripcion"];

export const LIMITES_DE_PARTICIPACION = {
  equipo: 150,
  puestoMinimo: 1,
  puestoMaximo: 999,
  reconocimiento: 100,
  observaciones: 1000,
} as const;

export const LIMITES_DE_CATALOGO = {
  nombreDeCompetencia: 100,
  organizador: 200,
  sitioWeb: 200,
  nombreDeEdicion: 100,
  anioMinimo: 2000,
  anioMaximo: 2100,
  sede: 150,
  nombreDeCategoria: 150,
  descripcionDeCategoria: 500,
} as const;

export const RESULTADOS_VACIOS: DatosDeResultado = {
  equipoNombre: "",
  puesto: "",
  reconocimiento: "",
  observaciones: "",
};

const SITIO_WEB = /^\s*$|^https?:\/\/\S+$/;

export function esNivelDeCategoria(valor: string): valor is NivelCategoria {
  return NIVELES_DE_CATEGORIA.includes(valor as NivelCategoria);
}

export function puestoDe(valor: string): number | null {
  return enteroDe(valor);
}

export function hayResultado(datos: Pick<DatosDeResultado, "puesto" | "reconocimiento">): boolean {
  return Boolean(datos.puesto.trim() || datos.reconocimiento.trim());
}

export function mensajeDeResultadoAnticipado(inicio: string): string {
  const [anio, mes, dia] = inicio.split("-");
  return `Los resultados (puesto o reconocimiento) solo se registran desde la fecha de inicio de la edición, el ${dia}/${mes}/${anio}.`;
}

export function resultadoAnticipado(
  datos: Pick<DatosDeResultado, "puesto" | "reconocimiento">,
  contexto: ContextoDeResultado,
): boolean {
  const { inicioDeEdicion, hoy, anterior } = contexto;
  if (!inicioDeEdicion || !hoy || inicioDeEdicion <= hoy || !hayResultado(datos)) {
    return false;
  }
  if (!anterior) {
    return true;
  }
  return (
    datos.puesto.trim() !== anterior.puesto.trim() ||
    datos.reconocimiento.trim() !== anterior.reconocimiento.trim()
  );
}

export function validarResultado(
  datos: DatosDeResultado,
  contexto: ContextoDeResultado,
): Partial<Record<keyof DatosDeResultado, string>> {
  const errores: Partial<Record<keyof DatosDeResultado, string>> = {};

  if (datos.equipoNombre.trim().length > LIMITES_DE_PARTICIPACION.equipo) {
    errores.equipoNombre = `El nombre del equipo admite máximo ${LIMITES_DE_PARTICIPACION.equipo} caracteres`;
  }

  const puestoEscrito = datos.puesto.trim();
  if (puestoEscrito) {
    const puesto = puestoDe(puestoEscrito);
    if (
      puesto === null ||
      puesto < LIMITES_DE_PARTICIPACION.puestoMinimo ||
      puesto > LIMITES_DE_PARTICIPACION.puestoMaximo
    ) {
      errores.puesto = `El puesto debe estar entre ${LIMITES_DE_PARTICIPACION.puestoMinimo} y ${LIMITES_DE_PARTICIPACION.puestoMaximo}`;
    }
  }

  if (datos.reconocimiento.trim().length > LIMITES_DE_PARTICIPACION.reconocimiento) {
    errores.reconocimiento = `El reconocimiento admite máximo ${LIMITES_DE_PARTICIPACION.reconocimiento} caracteres`;
  }

  if (datos.observaciones.trim().length > LIMITES_DE_PARTICIPACION.observaciones) {
    errores.observaciones = `Las observaciones admiten máximo ${LIMITES_DE_PARTICIPACION.observaciones} caracteres`;
  }

  if (!errores.puesto && !errores.reconocimiento && resultadoAnticipado(datos, contexto)) {
    const campo = puestoEscrito ? "puesto" : "reconocimiento";
    errores[campo] = mensajeDeResultadoAnticipado(contexto.inicioDeEdicion ?? "");
  }

  return errores;
}

export function validarParticipacion(
  datos: DatosDeParticipacion,
  contexto: ContextoDeResultado & { autorizado: boolean | null },
): ErroresDeParticipacion {
  const errores: ErroresDeParticipacion = {
    clubId: datos.clubId ? undefined : "Elige el club del estudiante.",
    inscripcionId: datos.inscripcionId ? undefined : "La inscripción es obligatoria",
    competenciaId: datos.competenciaId ? undefined : "Elige la competencia.",
    edicionId: datos.edicionId ? undefined : "La edición es obligatoria",
    categoriaId: datos.categoriaId ? undefined : "La categoría es obligatoria",
    ...validarResultado(datos, contexto),
  };

  if (!errores.inscripcionId && contexto.autorizado === false) {
    errores.inscripcionId =
      "El estudiante no tiene la autorización de participación otorgada; regístrela antes de inscribirlo en una competencia.";
  }

  return errores;
}

export function validarCompetencia(datos: DatosDeCompetencia): ErroresDeCompetencia {
  return {
    nombre: errorDeObligatorio(
      datos.nombre,
      "El nombre de la competencia es obligatorio",
      LIMITES_DE_CATALOGO.nombreDeCompetencia,
    ),
    organizador: errorDeLongitud(datos.organizador, LIMITES_DE_CATALOGO.organizador),
    sitioWeb:
      errorDeLongitud(datos.sitioWeb, LIMITES_DE_CATALOGO.sitioWeb) ??
      (SITIO_WEB.test(datos.sitioWeb) ? undefined : "El sitio web debe empezar con http:// o https://"),
  };
}

export function validarEdicion(datos: DatosDeEdicion): ErroresDeEdicion {
  const errores: ErroresDeEdicion = {
    nombre: errorDeObligatorio(
      datos.nombre,
      "El nombre de la edición es obligatorio",
      LIMITES_DE_CATALOGO.nombreDeEdicion,
    ),
    sede: errorDeLongitud(datos.sede, LIMITES_DE_CATALOGO.sede),
  };

  const anio = enteroDe(datos.anio);
  if (!datos.anio.trim()) {
    errores.anio = "El año es obligatorio";
  } else if (anio === null || anio < LIMITES_DE_CATALOGO.anioMinimo || anio > LIMITES_DE_CATALOGO.anioMaximo) {
    errores.anio = `El año debe estar entre ${LIMITES_DE_CATALOGO.anioMinimo} y ${LIMITES_DE_CATALOGO.anioMaximo}`;
  }

  if (datos.fechaInicio && !esFechaValida(datos.fechaInicio)) {
    errores.fechaInicio = "Escribe una fecha válida.";
  }
  if (datos.fechaFin && !esFechaValida(datos.fechaFin)) {
    errores.fechaFin = "Escribe una fecha válida.";
  }
  if (errores.fechaInicio || errores.fechaFin) {
    return errores;
  }

  if (datos.fechaFin && !datos.fechaInicio) {
    errores.fechaInicio = "Si indica la fecha de fin, indique también la fecha de inicio.";
  } else if (datos.fechaInicio && !errores.anio && Number(datos.fechaInicio.slice(0, 4)) !== anio) {
    errores.fechaInicio = `La fecha de inicio debe corresponder al año de la edición (${anio}).`;
  } else if (datos.fechaInicio && datos.fechaFin && datos.fechaFin < datos.fechaInicio) {
    errores.fechaFin = "La fecha de fin no puede ser anterior a la fecha de inicio.";
  }

  return errores;
}

export function validarCategoria(datos: DatosDeCategoria): ErroresDeCategoria {
  return {
    nivel: esNivelDeCategoria(datos.nivel) ? undefined : "El nivel es obligatorio",
    nombre: errorDeObligatorio(
      datos.nombre,
      "El nombre de la categoría es obligatorio",
      LIMITES_DE_CATALOGO.nombreDeCategoria,
    ),
    descripcion: errorDeLongitud(datos.descripcion, LIMITES_DE_CATALOGO.descripcionDeCategoria),
  };
}

export function fechasDeEdicion(edicion: { fechaInicio?: string; fechaFin?: string }): string {
  if (!edicion.fechaInicio) {
    return "fecha por definir";
  }
  return edicion.fechaFin && edicion.fechaFin !== edicion.fechaInicio
    ? `${fechaCorta(edicion.fechaInicio)} al ${fechaCorta(edicion.fechaFin)}`
    : fechaCorta(edicion.fechaInicio);
}

export function textoDeEdicion(edicion: {
  nombre?: string;
  anio?: number;
  fechaInicio?: string;
  fechaFin?: string;
}): string {
  return `${edicion.nombre ?? "Edición"} · ${fechasDeEdicion(edicion)}`;
}

export function textoDePuesto(puesto?: number): string | null {
  return typeof puesto === "number" ? `${puesto}.º lugar` : null;
}

import { ESTADOS_DE_ADHESION, type EstadoAdhesion } from "./filtros-instituciones";
import { esFechaValida } from "./tiempo";
import { errorDeCorreo, errorDeLongitud, errorDeObligatorio } from "./validacion";

export type DatosDeContacto = {
  direccion: string;
  telefono: string;
  correoContacto: string;
  autoridadNombre: string;
  autoridadCargo: string;
};

export type DatosDeInstitucion = DatosDeContacto & {
  codigoAmie: string;
  nombre: string;
  zona: string;
  circuito: string;
  provincia: string;
  canton: string;
  estadoAdhesion: string;
  fechaAdhesion: string;
};

export type CampoDeContacto = keyof DatosDeContacto;
export type CampoDeInstitucion = keyof DatosDeInstitucion;
export type ErroresDeInstitucion = Partial<Record<CampoDeInstitucion, string>>;

export const CAMPOS_DE_CONTACTO: readonly CampoDeContacto[] = [
  "direccion",
  "telefono",
  "correoContacto",
  "autoridadNombre",
  "autoridadCargo",
];

export const CAMPOS_DE_INSTITUCION: readonly CampoDeInstitucion[] = [
  "codigoAmie",
  "nombre",
  "zona",
  "circuito",
  "provincia",
  "canton",
  ...CAMPOS_DE_CONTACTO,
  "estadoAdhesion",
  "fechaAdhesion",
];

export const LIMITES_DE_INSTITUCION = {
  codigoAmie: 8,
  nombre: 200,
  zona: 30,
  circuito: 80,
  provincia: 80,
  canton: 80,
  direccion: 255,
  telefono: 30,
  correoContacto: 150,
  autoridadNombre: 150,
  autoridadCargo: 80,
} as const;

export const ESTADO_ADHERIDA: EstadoAdhesion = "ADHERIDA";

const FORMATO_AMIE = /^[0-9]{2}[A-Za-z][0-9]{5}$/;

export function normalizarAmie(valor: string): string {
  return valor.trim().toUpperCase();
}

export function esEstadoDeAdhesion(valor: string): valor is EstadoAdhesion {
  return ESTADOS_DE_ADHESION.includes(valor as EstadoAdhesion);
}

export function validarContacto(datos: DatosDeContacto): ErroresDeInstitucion {
  return {
    direccion: errorDeLongitud(datos.direccion, LIMITES_DE_INSTITUCION.direccion),
    telefono: errorDeLongitud(datos.telefono, LIMITES_DE_INSTITUCION.telefono),
    correoContacto: errorDeCorreo(datos.correoContacto, LIMITES_DE_INSTITUCION.correoContacto),
    autoridadNombre: errorDeLongitud(datos.autoridadNombre, LIMITES_DE_INSTITUCION.autoridadNombre),
    autoridadCargo: errorDeLongitud(datos.autoridadCargo, LIMITES_DE_INSTITUCION.autoridadCargo),
  };
}

export function validarInstitucion(datos: DatosDeInstitucion, hoy: string): ErroresDeInstitucion {
  const errores: ErroresDeInstitucion = {
    ...validarContacto(datos),
    nombre: errorDeObligatorio(datos.nombre, "El nombre es obligatorio", LIMITES_DE_INSTITUCION.nombre),
    zona: errorDeLongitud(datos.zona, LIMITES_DE_INSTITUCION.zona),
    circuito: errorDeLongitud(datos.circuito, LIMITES_DE_INSTITUCION.circuito),
    provincia: errorDeObligatorio(
      datos.provincia,
      "La provincia es obligatoria",
      LIMITES_DE_INSTITUCION.provincia,
    ),
    canton: errorDeObligatorio(datos.canton, "El cantón es obligatorio", LIMITES_DE_INSTITUCION.canton),
  };

  const amie = datos.codigoAmie.trim();
  if (!amie) {
    errores.codigoAmie = "El código AMIE es obligatorio";
  } else if (!FORMATO_AMIE.test(amie)) {
    errores.codigoAmie = "Formato de AMIE inválido (ejemplo: 09H00001)";
  }

  if (!esEstadoDeAdhesion(datos.estadoAdhesion)) {
    errores.estadoAdhesion = "Elige el estado de adhesión al proyecto.";
  }

  if (datos.fechaAdhesion) {
    if (!esFechaValida(datos.fechaAdhesion)) {
      errores.fechaAdhesion = "Escribe la fecha con el formato día/mes/año.";
    } else if (datos.fechaAdhesion > hoy) {
      errores.fechaAdhesion = "La fecha de adhesión no puede ser futura";
    }
  } else if (datos.estadoAdhesion === ESTADO_ADHERIDA) {
    errores.fechaAdhesion = "La fecha de adhesión es obligatoria cuando el estado es ADHERIDA.";
  }

  return errores;
}

import { TIPOS_DE_CONTENIDO, type TipoContenido } from "./filtros-actividades";
import { errorDeLongitud, errorDeObligatorio } from "./validacion";

export type DatosDeContenido = {
  tipo: string;
  nombre: string;
  descripcion: string;
};

export type CampoDeContenido = keyof DatosDeContenido;
export type ErroresDeContenido = Partial<Record<CampoDeContenido, string>>;

export const CAMPOS_DE_CONTENIDO: readonly CampoDeContenido[] = ["tipo", "nombre", "descripcion"];

export const LIMITES_DE_CONTENIDO = {
  nombre: 100,
  descripcion: 255,
} as const;

export function esTipoDeContenido(valor: string): valor is TipoContenido {
  return TIPOS_DE_CONTENIDO.includes(valor as TipoContenido);
}

export function nombreNormalizado(valor: string): string {
  return valor.trim().replace(/\s+/g, " ");
}

export function validarContenido(datos: DatosDeContenido): ErroresDeContenido {
  return {
    tipo: esTipoDeContenido(datos.tipo) ? undefined : "El tipo es obligatorio",
    nombre: errorDeObligatorio(datos.nombre, "El nombre es obligatorio", LIMITES_DE_CONTENIDO.nombre),
    descripcion: errorDeLongitud(datos.descripcion, LIMITES_DE_CONTENIDO.descripcion),
  };
}

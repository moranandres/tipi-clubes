import { enteroDe, errorDeCorreo, errorDeLongitud, errorDeObligatorio } from "./validacion";

export type DatosDeDocente = {
  institucionId: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  usuarioId: string;
};

export type CampoDeDocente = keyof DatosDeDocente;
export type ErroresDeDocente = Partial<Record<CampoDeDocente, string>>;

export const CAMPOS_DE_DOCENTE: readonly CampoDeDocente[] = [
  "institucionId",
  "nombres",
  "apellidos",
  "correo",
  "telefono",
  "usuarioId",
];

export const LIMITES_DE_DOCENTE = {
  nombres: 100,
  apellidos: 100,
  correo: 150,
  telefono: 30,
} as const;

export function validarDocente(datos: DatosDeDocente, esNuevo: boolean): ErroresDeDocente {
  const errores: ErroresDeDocente = {
    nombres: errorDeObligatorio(datos.nombres, "Los nombres son obligatorios", LIMITES_DE_DOCENTE.nombres),
    apellidos: errorDeObligatorio(
      datos.apellidos,
      "Los apellidos son obligatorios",
      LIMITES_DE_DOCENTE.apellidos,
    ),
    correo: errorDeCorreo(datos.correo, LIMITES_DE_DOCENTE.correo),
    telefono: errorDeLongitud(datos.telefono, LIMITES_DE_DOCENTE.telefono),
  };

  if (esNuevo && !enteroDe(datos.institucionId)) {
    errores.institucionId = "La institución es obligatoria";
  }

  if (datos.usuarioId && !enteroDe(datos.usuarioId)) {
    errores.usuarioId = "Elige una cuenta de la lista o deja el docente sin cuenta.";
  }

  return errores;
}

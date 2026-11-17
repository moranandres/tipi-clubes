export type ErroresDeCampos = Record<string, string>;

export type AccionCorrecta<D = undefined> = {
  ok: true;
  mensaje: string;
  avisos: string[];
  destino?: string;
  datos?: D;
};

export type AccionFallida = {
  ok: false;
  mensaje: string;
  errores: ErroresDeCampos;
};

export type ResultadoDeAccion<D = undefined> = AccionCorrecta<D> | AccionFallida;

export const MENSAJE_REVISAR_CAMPOS = "Revisa los campos marcados y vuelve a intentarlo.";
export const MENSAJE_SIN_CONEXION =
  "No hay conexión con el portal. Tus datos siguen en el formulario; vuelve a intentarlo.";

export function accionCorrecta(
  mensaje: string,
  avisos: string[] = [],
  destino?: string,
): AccionCorrecta {
  return { ok: true, mensaje, avisos, destino };
}

export function accionFallida(mensaje: string, errores: ErroresDeCampos = {}): AccionFallida {
  return { ok: false, mensaje, errores };
}

export function camposInvalidos(errores: Record<string, string | undefined>): AccionFallida {
  const presentes = Object.fromEntries(
    Object.entries(errores).filter((entrada): entrada is [string, string] => Boolean(entrada[1])),
  );
  return accionFallida(MENSAJE_REVISAR_CAMPOS, presentes);
}

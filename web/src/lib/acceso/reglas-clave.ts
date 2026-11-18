export const LONGITUD_MAXIMA_DE_CLAVE = 128;
export const LONGITUD_MAXIMA_DE_IDENTIFICADOR = 150;

const CLAVE_VALIDA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/;
const ENLACE_VALIDO = /^[A-Za-z0-9_-]{43}$/;

export const AYUDA_DE_CLAVE = "Entre 10 y 128 caracteres, con mayúscula, minúscula y número.";
export const MENSAJE_ENLACE_INVALIDO =
  "El enlace no es válido o ya expiró. Solicita uno nuevo desde la página de recuperación.";

export type CamposDeClaveNueva = {
  nueva: string;
  confirmacion: string;
};

export type ErroresDeClaveNueva = Partial<Record<keyof CamposDeClaveNueva, string>>;

export function erroresDeClaveNueva(campos: CamposDeClaveNueva): ErroresDeClaveNueva {
  const errores: ErroresDeClaveNueva = {};
  if (!campos.nueva) {
    errores.nueva = "Escribe la contraseña nueva.";
  } else if (!CLAVE_VALIDA.test(campos.nueva)) {
    errores.nueva = `La contraseña no cumple el formato. ${AYUDA_DE_CLAVE}`;
  }
  if (!campos.confirmacion) {
    errores.confirmacion = "Repite la contraseña nueva.";
  } else if (campos.nueva !== campos.confirmacion) {
    errores.confirmacion = "Las dos contraseñas no coinciden.";
  }
  return errores;
}

export function errorDeIdentificador(valor: string): string | undefined {
  const texto = valor.trim();
  if (!texto) {
    return "Escribe tu usuario o tu correo.";
  }
  return texto.length > LONGITUD_MAXIMA_DE_IDENTIFICADOR
    ? `Máximo ${LONGITUD_MAXIMA_DE_IDENTIFICADOR} caracteres.`
    : undefined;
}

export function esEnlaceValido(token: string): boolean {
  return ENLACE_VALIDO.test(token);
}

export function tokenDelFragmento(fragmento: string): string {
  const valor = new URLSearchParams(fragmento.replace(/^#/, "")).get("token") ?? "";
  return esEnlaceValido(valor) ? valor : "";
}

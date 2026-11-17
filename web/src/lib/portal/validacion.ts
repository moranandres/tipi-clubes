const ENTERO = /^\d+$/;

export function enteroDe(texto: string): number | null {
  const limpio = texto.trim();
  if (!ENTERO.test(limpio)) {
    return null;
  }
  const numero = Number(limpio);
  return Number.isSafeInteger(numero) ? numero : null;
}

export function idDe(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : enteroDe(String(valor ?? ""));
  return numero !== null && Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

export function textoDe(valor: unknown, longitudMaxima: number): string {
  return typeof valor === "string" ? valor.slice(0, longitudMaxima) : "";
}

export function leerCampos<C extends string>(
  entrada: unknown,
  campos: readonly C[],
  longitudMaxima: number,
): Record<C, string> {
  const origen = typeof entrada === "object" && entrada !== null ? entrada : {};
  return Object.fromEntries(
    campos.map((campo) => [
      campo,
      textoDe((origen as Record<string, unknown>)[campo], longitudMaxima),
    ]),
  ) as Record<C, string>;
}

export function hayErrores(errores: Record<string, string | undefined>): boolean {
  return Object.values(errores).some(Boolean);
}

const CORREO = /^[^\s@]+@[^\s@]+$/;

export function errorDeLongitud(valor: string, maximo: number): string | undefined {
  return valor.trim().length > maximo ? `Máximo ${maximo} caracteres` : undefined;
}

export function errorDeObligatorio(
  valor: string,
  vacio: string,
  maximo: number,
): string | undefined {
  return valor.trim() ? errorDeLongitud(valor, maximo) : vacio;
}

export function errorDeCorreo(valor: string, maximo: number): string | undefined {
  const texto = valor.trim();
  if (!texto) {
    return undefined;
  }
  return CORREO.test(texto) ? errorDeLongitud(texto, maximo) : "Correo electrónico inválido";
}

export function textoOpcional(valor: string): string | undefined {
  return valor.trim() || undefined;
}

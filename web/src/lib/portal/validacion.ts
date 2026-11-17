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

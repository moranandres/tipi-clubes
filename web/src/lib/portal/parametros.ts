export type ParametrosDeBusqueda = Record<string, string | string[] | undefined>;

type ValorDeConsulta = string | number | null | undefined;

const LONGITUD_MAXIMA_DE_BUSQUEDA = 80;

export function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export function textoDeBusqueda(valor: string | string[] | undefined): string {
  return primerValor(valor).trim().slice(0, LONGITUD_MAXIMA_DE_BUSQUEDA);
}

export function enteroPositivo(texto: string): number | null {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

export function opcionValida<T extends string>(opciones: readonly T[], valor: string): T | null {
  return opciones.includes(valor as T) ? (valor as T) : null;
}

export function rutaConConsulta(base: string, entradas: Record<string, ValorDeConsulta>): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(entradas)) {
    if (valor !== null && valor !== undefined && valor !== "") {
      parametros.set(clave, String(valor));
    }
  }
  const consulta = parametros.toString();
  return consulta ? `${base}?${consulta}` : base;
}

export function paginaEnRuta(pagina: number): number | null {
  return pagina > 1 ? pagina : null;
}

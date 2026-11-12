export const ESTADOS_DE_CLUB = ["PLANIFICADO", "ACTIVO", "SUSPENDIDO", "CERRADO"] as const;

export type EstadoClub = (typeof ESTADOS_DE_CLUB)[number];

export const NOMBRES_DE_ESTADO: Record<EstadoClub, string> = {
  PLANIFICADO: "Planificado",
  ACTIVO: "Activo",
  SUSPENDIDO: "Suspendido",
  CERRADO: "Cerrado",
};

export type FiltrosClubes = {
  q: string;
  estado: EstadoClub | null;
  institucion: number | null;
  pagina: number;
};

export type ParametrosDeBusqueda = Record<string, string | string[] | undefined>;

export const RUTA_CLUBES = "/portal/clubes";
export const CLUBES_POR_PAGINA = 10;

const LONGITUD_MAXIMA_BUSQUEDA = 80;

function primero(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

function enteroPositivo(texto: string): number | null {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

export function leerFiltros(parametros: ParametrosDeBusqueda): FiltrosClubes {
  const estado = primero(parametros.estado);
  return {
    q: primero(parametros.q).trim().slice(0, LONGITUD_MAXIMA_BUSQUEDA),
    estado: ESTADOS_DE_CLUB.includes(estado as EstadoClub) ? (estado as EstadoClub) : null,
    institucion: enteroPositivo(primero(parametros.institucion)),
    pagina: enteroPositivo(primero(parametros.pagina)) ?? 1,
  };
}

export function rutaConFiltros(filtros: FiltrosClubes): string {
  const parametros = new URLSearchParams();
  if (filtros.q) {
    parametros.set("q", filtros.q);
  }
  if (filtros.estado) {
    parametros.set("estado", filtros.estado);
  }
  if (filtros.institucion) {
    parametros.set("institucion", String(filtros.institucion));
  }
  if (filtros.pagina > 1) {
    parametros.set("pagina", String(filtros.pagina));
  }
  const consulta = parametros.toString();
  return consulta ? `${RUTA_CLUBES}?${consulta}` : RUTA_CLUBES;
}

export function hayFiltrosActivos(filtros: FiltrosClubes): boolean {
  return Boolean(filtros.q || filtros.estado || filtros.institucion);
}

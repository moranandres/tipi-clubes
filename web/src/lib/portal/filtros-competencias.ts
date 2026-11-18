import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const NIVELES_DE_CATEGORIA = ["BASICA", "AVANZADA"] as const;

export type NivelCategoria = (typeof NIVELES_DE_CATEGORIA)[number];

export const NOMBRES_DE_NIVEL_DE_CATEGORIA: Record<NivelCategoria, string> = {
  BASICA: "Básica",
  AVANZADA: "Avanzada",
};

export const PLURALES_DE_NIVEL_DE_CATEGORIA: Record<NivelCategoria, string> = {
  BASICA: "Categorías básicas",
  AVANZADA: "Categorías avanzadas",
};

export const PUNTOS_DE_NIVEL_DE_CATEGORIA: Record<NivelCategoria, string> = {
  BASICA: "bg-acento",
  AVANZADA: "bg-exito",
};

export const OPCIONES_DE_NIVEL = NIVELES_DE_CATEGORIA.map((nivel) => ({
  valor: nivel,
  texto: NOMBRES_DE_NIVEL_DE_CATEGORIA[nivel],
}));

export type FiltrosParticipaciones = {
  q: string;
  nivel: NivelCategoria | null;
  institucion: number | null;
  club: number | null;
  competencia: number | null;
  edicion: number | null;
  pagina: number;
};

export const RUTA_COMPETENCIAS = "/portal/competencias";
export const RUTA_NUEVA_PARTICIPACION = "/portal/competencias/nueva";
export const RUTA_CATALOGO_DE_COMPETENCIAS = "/portal/competencias/catalogo";
export const PARTICIPACIONES_POR_PAGINA = 10;

export const FILTROS_DE_PARTICIPACIONES_VACIOS: FiltrosParticipaciones = {
  q: "",
  nivel: null,
  institucion: null,
  club: null,
  competencia: null,
  edicion: null,
  pagina: 1,
};

export function leerFiltrosDeParticipaciones(parametros: ParametrosDeBusqueda): FiltrosParticipaciones {
  const competencia = enteroPositivo(primerValor(parametros.competencia));
  return {
    q: textoDeBusqueda(parametros.q),
    nivel: opcionValida(NIVELES_DE_CATEGORIA, primerValor(parametros.nivel)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    club: enteroPositivo(primerValor(parametros.club)),
    competencia,
    edicion: competencia ? enteroPositivo(primerValor(parametros.edicion)) : null,
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeParticipaciones(filtros: FiltrosParticipaciones): string {
  return rutaConConsulta(RUTA_COMPETENCIAS, {
    q: filtros.q,
    nivel: filtros.nivel,
    institucion: filtros.institucion,
    club: filtros.club,
    competencia: filtros.competencia,
    edicion: filtros.competencia ? filtros.edicion : null,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeParticipaciones(filtros: FiltrosParticipaciones): boolean {
  return Boolean(
    filtros.q ||
      filtros.nivel ||
      filtros.institucion ||
      filtros.club ||
      filtros.competencia ||
      filtros.edicion,
  );
}

export function rutaDeParticipacion(id: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_COMPETENCIAS}/${id}`, { aviso });
}

export function rutaDeCompetenciaDelCatalogo(id: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_CATALOGO_DE_COMPETENCIAS}/${id}`, { aviso });
}

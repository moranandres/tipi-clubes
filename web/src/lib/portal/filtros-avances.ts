import { fechaDeFiltro, rangoOrdenado } from "./filtros-actividades";
import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ALCANCES_DE_AVANCE = ["ESTUDIANTE", "PROYECTO", "CLUB"] as const;
export const ESTADOS_DE_AVANCE = ["ACTIVO", "ANULADO"] as const;
export const NIVELES_DE_LOGRO = ["INICIAL", "EN_PROCESO", "LOGRADO", "DESTACADO"] as const;

export type AlcanceAvance = (typeof ALCANCES_DE_AVANCE)[number];
export type EstadoAvance = (typeof ESTADOS_DE_AVANCE)[number];
export type NivelLogro = (typeof NIVELES_DE_LOGRO)[number];

export const NOMBRES_DE_ALCANCE: Record<AlcanceAvance, string> = {
  ESTUDIANTE: "De un estudiante",
  PROYECTO: "De un proyecto",
  CLUB: "Del club",
};

export const PLURALES_DE_ALCANCE: Record<AlcanceAvance, string> = {
  ESTUDIANTE: "De estudiantes",
  PROYECTO: "De proyectos",
  CLUB: "Del club",
};

export const DESCRIPCIONES_DE_ALCANCE: Record<AlcanceAvance, string> = {
  ESTUDIANTE: "Progreso individual con evaluación de competencias.",
  PROYECTO: "Avance del equipo con el porcentaje logrado.",
  CLUB: "Balance general de lo trabajado por el club.",
};

export const PUNTOS_DE_ALCANCE: Record<AlcanceAvance, string> = {
  ESTUDIANTE: "bg-acento",
  PROYECTO: "bg-exito",
  CLUB: "bg-aviso",
};

export const NOMBRES_DE_NIVEL_DE_LOGRO: Record<NivelLogro, string> = {
  INICIAL: "Inicial",
  EN_PROCESO: "En proceso",
  LOGRADO: "Logrado",
  DESTACADO: "Destacado",
};

export const PUNTOS_DE_NIVEL_DE_LOGRO: Record<NivelLogro, string> = {
  INICIAL: "bg-tenue",
  EN_PROCESO: "bg-aviso",
  LOGRADO: "bg-exito",
  DESTACADO: "bg-acento",
};

export const OPCIONES_DE_NIVEL_DE_LOGRO = NIVELES_DE_LOGRO.map((nivel) => ({
  valor: nivel,
  texto: NOMBRES_DE_NIVEL_DE_LOGRO[nivel],
}));

export type FiltrosAvances = {
  q: string;
  alcance: AlcanceAvance | null;
  estado: EstadoAvance | null;
  institucion: number | null;
  club: number | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
};

export const RUTA_AVANCES = "/portal/avances";
export const RUTA_NUEVO_AVANCE = "/portal/avances/nuevo";
export const RUTA_RESULTADOS = "/portal/avances/resultados";
export const AVANCES_POR_PAGINA = 10;

export const FILTROS_DE_AVANCES_VACIOS: FiltrosAvances = {
  q: "",
  alcance: null,
  estado: null,
  institucion: null,
  club: null,
  desde: null,
  hasta: null,
  pagina: 1,
};

export function leerFiltrosDeAvances(parametros: ParametrosDeBusqueda): FiltrosAvances {
  return {
    q: "",
    alcance: opcionValida(ALCANCES_DE_AVANCE, primerValor(parametros.alcance)),
    estado: opcionValida(ESTADOS_DE_AVANCE, primerValor(parametros.estado)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    club: enteroPositivo(primerValor(parametros.club)),
    ...rangoOrdenado(fechaDeFiltro(parametros.desde), fechaDeFiltro(parametros.hasta)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeAvances(filtros: FiltrosAvances): string {
  return rutaConConsulta(RUTA_AVANCES, {
    alcance: filtros.alcance,
    estado: filtros.estado,
    institucion: filtros.institucion,
    club: filtros.club,
    desde: filtros.desde,
    hasta: filtros.hasta,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeAvances(filtros: FiltrosAvances): boolean {
  return Boolean(
    filtros.alcance || filtros.estado || filtros.institucion || filtros.club || filtros.desde || filtros.hasta,
  );
}

export function rutaDeAvance(id: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_AVANCES}/${id}`, { aviso });
}

export function rutaDeNuevoAvance(alcance: AlcanceAvance, club?: number, sujeto?: number): string {
  return rutaConConsulta(RUTA_NUEVO_AVANCE, {
    alcance,
    club,
    proyecto: alcance === "PROYECTO" ? sujeto : null,
    estudiante: alcance === "ESTUDIANTE" ? sujeto : null,
  });
}

export function rutaDeResultados(periodo: number | null, institucion: number | null): string {
  return rutaConConsulta(RUTA_RESULTADOS, { periodo, institucion });
}

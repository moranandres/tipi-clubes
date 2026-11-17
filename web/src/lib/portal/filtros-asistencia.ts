import { fechaDeFiltro, rangoOrdenado } from "./filtros-actividades";
import {
  enteroPositivo,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_ASISTENCIA = ["PRESENTE", "ATRASADO", "AUSENTE", "JUSTIFICADO"] as const;

export type EstadoAsistencia = (typeof ESTADOS_DE_ASISTENCIA)[number];

export const NOMBRES_DE_ESTADO_DE_ASISTENCIA: Record<EstadoAsistencia, string> = {
  PRESENTE: "Presente",
  ATRASADO: "Atrasado",
  AUSENTE: "Ausente",
  JUSTIFICADO: "Justificado",
};

export const PLURALES_DE_ESTADO_DE_ASISTENCIA: Record<EstadoAsistencia, string> = {
  PRESENTE: "Presentes",
  ATRASADO: "Atrasados",
  AUSENTE: "Ausentes",
  JUSTIFICADO: "Justificados",
};

export const PUNTOS_DE_ESTADO_DE_ASISTENCIA: Record<EstadoAsistencia, string> = {
  PRESENTE: "bg-exito",
  ATRASADO: "bg-aviso",
  AUSENTE: "bg-error",
  JUSTIFICADO: "bg-acento",
};

export type FiltrosSesiones = {
  q: string;
  club: number | null;
  institucion: number | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
};

export const RUTA_ASISTENCIA = "/portal/asistencia";
export const SESIONES_POR_PAGINA = 10;

export const FILTROS_DE_SESIONES_VACIOS: FiltrosSesiones = {
  q: "",
  club: null,
  institucion: null,
  desde: null,
  hasta: null,
  pagina: 1,
};

export function leerFiltrosDeSesiones(parametros: ParametrosDeBusqueda): FiltrosSesiones {
  return {
    q: "",
    club: enteroPositivo(primerValor(parametros.club)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    ...rangoOrdenado(fechaDeFiltro(parametros.desde), fechaDeFiltro(parametros.hasta)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeSesiones(base: string, filtros: FiltrosSesiones): string {
  return rutaConConsulta(base, {
    institucion: filtros.institucion,
    club: filtros.club,
    desde: filtros.desde,
    hasta: filtros.hasta,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeSesiones(filtros: FiltrosSesiones): boolean {
  return Boolean(filtros.club || filtros.institucion || filtros.desde || filtros.hasta);
}

export function rutaDePlanilla(actividadId: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_ASISTENCIA}/${actividadId}`, { aviso });
}

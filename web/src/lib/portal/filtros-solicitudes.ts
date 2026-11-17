import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_SOLICITUD = [
  "PENDIENTE",
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
  "CANCELADA",
] as const;

export type EstadoSolicitud = (typeof ESTADOS_DE_SOLICITUD)[number];

export const NOMBRES_DE_ESTADO_DE_SOLICITUD: Record<EstadoSolicitud, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

export const PUNTOS_DE_ESTADO_DE_SOLICITUD: Record<EstadoSolicitud, string> = {
  PENDIENTE: "bg-aviso",
  EN_REVISION: "bg-acento",
  APROBADA: "bg-exito",
  RECHAZADA: "bg-error",
  CANCELADA: "bg-tenue",
};

export type FiltrosSolicitudes = {
  q: string;
  estado: EstadoSolicitud | null;
  institucion: number | null;
  pagina: number;
};

export const RUTA_SOLICITUDES = "/portal/solicitudes";
export const SOLICITUDES_POR_PAGINA = 10;

export const FILTROS_DE_SOLICITUDES_VACIOS: FiltrosSolicitudes = {
  q: "",
  estado: null,
  institucion: null,
  pagina: 1,
};

export function leerFiltrosDeSolicitudes(parametros: ParametrosDeBusqueda): FiltrosSolicitudes {
  return {
    q: textoDeBusqueda(parametros.q),
    estado: opcionValida(ESTADOS_DE_SOLICITUD, primerValor(parametros.estado)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeSolicitudes(filtros: FiltrosSolicitudes): string {
  return rutaConConsulta(RUTA_SOLICITUDES, {
    q: filtros.q,
    estado: filtros.estado,
    institucion: filtros.institucion,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeSolicitudes(filtros: FiltrosSolicitudes): boolean {
  return Boolean(filtros.q || filtros.estado || filtros.institucion);
}

import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_RETIRO = ["PENDIENTE", "APROBADA", "RECHAZADA", "CANCELADA"] as const;

export type EstadoRetiro = (typeof ESTADOS_DE_RETIRO)[number];

export const NOMBRES_DE_ESTADO_DE_RETIRO: Record<EstadoRetiro, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

export const PUNTOS_DE_ESTADO_DE_RETIRO: Record<EstadoRetiro, string> = {
  PENDIENTE: "bg-aviso",
  APROBADA: "bg-exito",
  RECHAZADA: "bg-error",
  CANCELADA: "bg-tenue",
};

export type FiltrosRetiros = {
  q: string;
  estado: EstadoRetiro | null;
  institucion: number | null;
  pagina: number;
};

export const RUTA_RETIROS = "/portal/retiros";
export const RETIROS_POR_PAGINA = 10;

export const FILTROS_DE_RETIROS_VACIOS: FiltrosRetiros = {
  q: "",
  estado: null,
  institucion: null,
  pagina: 1,
};

export function leerFiltrosDeRetiros(parametros: ParametrosDeBusqueda): FiltrosRetiros {
  return {
    q: textoDeBusqueda(parametros.q),
    estado: opcionValida(ESTADOS_DE_RETIRO, primerValor(parametros.estado)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeRetiros(filtros: FiltrosRetiros): string {
  return rutaConConsulta(RUTA_RETIROS, {
    q: filtros.q,
    estado: filtros.estado,
    institucion: filtros.institucion,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeRetiros(filtros: FiltrosRetiros): boolean {
  return Boolean(filtros.q || filtros.estado || filtros.institucion);
}

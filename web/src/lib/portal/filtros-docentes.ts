import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_DOCENTE = ["ACTIVO", "INACTIVO"] as const;

export type EstadoDocente = (typeof ESTADOS_DE_DOCENTE)[number];

export const NOMBRES_DE_ESTADO_DE_DOCENTE: Record<EstadoDocente, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
};

export const PUNTOS_DE_ESTADO_DE_DOCENTE: Record<EstadoDocente, string> = {
  ACTIVO: "bg-exito",
  INACTIVO: "bg-tenue",
};

export type FiltrosDocentes = {
  q: string;
  estado: EstadoDocente | null;
  institucion: number | null;
  pagina: number;
};

export const RUTA_DOCENTES = "/portal/docentes";
export const DOCENTES_POR_PAGINA = 10;

export const FILTROS_DE_DOCENTES_VACIOS: FiltrosDocentes = {
  q: "",
  estado: null,
  institucion: null,
  pagina: 1,
};

export function estadoDeDocente(activo?: boolean): EstadoDocente {
  return activo === false ? "INACTIVO" : "ACTIVO";
}

export function activoSegun(estado: EstadoDocente | null): boolean | undefined {
  return estado ? estado === "ACTIVO" : undefined;
}

export function leerFiltrosDeDocentes(parametros: ParametrosDeBusqueda): FiltrosDocentes {
  return {
    q: textoDeBusqueda(parametros.q),
    estado: opcionValida(ESTADOS_DE_DOCENTE, primerValor(parametros.estado)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeDocentes(filtros: FiltrosDocentes): string {
  return rutaConConsulta(RUTA_DOCENTES, {
    q: filtros.q,
    estado: filtros.estado,
    institucion: filtros.institucion,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeDocentes(filtros: FiltrosDocentes): boolean {
  return Boolean(filtros.q || filtros.estado || filtros.institucion);
}

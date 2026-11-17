import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";
import { esFechaValida } from "./tiempo";

export const ESTADOS_DE_ACTIVIDAD = ["PLANIFICADA", "EJECUTADA", "CANCELADA"] as const;
export const FICHAS_DE_ACTIVIDAD = ["PLANIFICADA", "POR_REGISTRAR", "EJECUTADA", "CANCELADA"] as const;

export type EstadoActividad = (typeof ESTADOS_DE_ACTIVIDAD)[number];
export type FichaDeActividad = (typeof FICHAS_DE_ACTIVIDAD)[number];

export const NOMBRES_DE_ESTADO_DE_ACTIVIDAD: Record<EstadoActividad, string> = {
  PLANIFICADA: "Planificada",
  EJECUTADA: "Ejecutada",
  CANCELADA: "Cancelada",
};

export const PUNTOS_DE_ESTADO_DE_ACTIVIDAD: Record<EstadoActividad, string> = {
  PLANIFICADA: "bg-acento",
  EJECUTADA: "bg-exito",
  CANCELADA: "bg-error",
};

export const NOMBRES_DE_FICHA_DE_ACTIVIDAD: Record<FichaDeActividad, string> = {
  PLANIFICADA: "Planificadas",
  POR_REGISTRAR: "Por registrar",
  EJECUTADA: "Ejecutadas",
  CANCELADA: "Canceladas",
};

export const PUNTOS_DE_FICHA_DE_ACTIVIDAD: Record<FichaDeActividad, string> = {
  PLANIFICADA: "bg-acento",
  POR_REGISTRAR: "bg-aviso",
  EJECUTADA: "bg-exito",
  CANCELADA: "bg-error",
};

export const TIPOS_DE_CONTENIDO = ["HERRAMIENTA", "LENGUAJE", "COMPONENTE", "COMPETENCIA"] as const;

export type TipoContenido = (typeof TIPOS_DE_CONTENIDO)[number];

export const NOMBRES_DE_TIPO_DE_CONTENIDO: Record<TipoContenido, string> = {
  HERRAMIENTA: "Herramientas",
  LENGUAJE: "Lenguajes",
  COMPONENTE: "Componentes",
  COMPETENCIA: "Competencias",
};

export type FiltrosActividades = {
  q: string;
  estado: FichaDeActividad | null;
  club: number | null;
  curso: number | null;
  institucion: number | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
};

export const RUTA_ACTIVIDADES = "/portal/actividades";
export const ACTIVIDADES_POR_PAGINA = 10;

export const FILTROS_DE_ACTIVIDADES_VACIOS: FiltrosActividades = {
  q: "",
  estado: null,
  club: null,
  curso: null,
  institucion: null,
  desde: null,
  hasta: null,
  pagina: 1,
};

export function fechaDeFiltro(valor: string | string[] | undefined): string | null {
  const texto = primerValor(valor);
  return esFechaValida(texto) ? texto : null;
}

export function rangoOrdenado(
  desde: string | null,
  hasta: string | null,
): { desde: string | null; hasta: string | null } {
  return desde && hasta && hasta < desde ? { desde: hasta, hasta: desde } : { desde, hasta };
}

export function leerFiltrosDeActividades(parametros: ParametrosDeBusqueda): FiltrosActividades {
  const club = enteroPositivo(primerValor(parametros.club));
  return {
    q: textoDeBusqueda(parametros.q),
    estado: opcionValida(FICHAS_DE_ACTIVIDAD, primerValor(parametros.estado)),
    club,
    curso: club ? enteroPositivo(primerValor(parametros.curso)) : null,
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    ...rangoOrdenado(fechaDeFiltro(parametros.desde), fechaDeFiltro(parametros.hasta)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeActividades(filtros: FiltrosActividades): string {
  return rutaConConsulta(RUTA_ACTIVIDADES, {
    q: filtros.q,
    estado: filtros.estado,
    institucion: filtros.institucion,
    club: filtros.club,
    curso: filtros.club ? filtros.curso : null,
    desde: filtros.desde,
    hasta: filtros.hasta,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeActividades(filtros: FiltrosActividades): boolean {
  return Boolean(
    filtros.q ||
      filtros.estado ||
      filtros.club ||
      filtros.institucion ||
      filtros.desde ||
      filtros.hasta,
  );
}

export function rutaDeActividad(id: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_ACTIVIDADES}/${id}`, { aviso });
}

export function rutaDeNuevaActividad(club?: number | null): string {
  return rutaConConsulta(`${RUTA_ACTIVIDADES}/nueva`, { club });
}

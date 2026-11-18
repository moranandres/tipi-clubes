import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_PROYECTO = ["EN_DESARROLLO", "FINALIZADO", "CANCELADO"] as const;
export const TIPOS_DE_PROYECTO = ["PROTOTIPO", "SOFTWARE", "OTRO"] as const;

export type EstadoProyecto = (typeof ESTADOS_DE_PROYECTO)[number];
export type TipoProyecto = (typeof TIPOS_DE_PROYECTO)[number];

export const NOMBRES_DE_ESTADO_DE_PROYECTO: Record<EstadoProyecto, string> = {
  EN_DESARROLLO: "En desarrollo",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const PLURALES_DE_ESTADO_DE_PROYECTO: Record<EstadoProyecto, string> = {
  EN_DESARROLLO: "En desarrollo",
  FINALIZADO: "Finalizados",
  CANCELADO: "Cancelados",
};

export const PUNTOS_DE_ESTADO_DE_PROYECTO: Record<EstadoProyecto, string> = {
  EN_DESARROLLO: "bg-acento",
  FINALIZADO: "bg-exito",
  CANCELADO: "bg-error",
};

export const NOMBRES_DE_TIPO_DE_PROYECTO: Record<TipoProyecto, string> = {
  PROTOTIPO: "Prototipo",
  SOFTWARE: "Software",
  OTRO: "Otro",
};

export const OPCIONES_DE_TIPO_DE_PROYECTO = TIPOS_DE_PROYECTO.map((tipo) => ({
  valor: tipo,
  texto: NOMBRES_DE_TIPO_DE_PROYECTO[tipo],
}));

export type FiltrosProyectos = {
  q: string;
  estado: EstadoProyecto | null;
  tipo: TipoProyecto | null;
  institucion: number | null;
  club: number | null;
  periodo: number | null;
  pagina: number;
};

export const RUTA_PROYECTOS = "/portal/proyectos";
export const RUTA_NUEVO_PROYECTO = "/portal/proyectos/nuevo";
export const PROYECTOS_POR_PAGINA = 10;

export const FILTROS_DE_PROYECTOS_VACIOS: FiltrosProyectos = {
  q: "",
  estado: null,
  tipo: null,
  institucion: null,
  club: null,
  periodo: null,
  pagina: 1,
};

export function leerFiltrosDeProyectos(parametros: ParametrosDeBusqueda): FiltrosProyectos {
  return {
    q: "",
    estado: opcionValida(ESTADOS_DE_PROYECTO, primerValor(parametros.estado)),
    tipo: opcionValida(TIPOS_DE_PROYECTO, primerValor(parametros.tipo)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    club: enteroPositivo(primerValor(parametros.club)),
    periodo: enteroPositivo(primerValor(parametros.periodo)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeProyectos(filtros: FiltrosProyectos): string {
  return rutaConConsulta(RUTA_PROYECTOS, {
    estado: filtros.estado,
    tipo: filtros.tipo,
    institucion: filtros.institucion,
    club: filtros.club,
    periodo: filtros.periodo,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeProyectos(filtros: FiltrosProyectos): boolean {
  return Boolean(filtros.estado || filtros.tipo || filtros.institucion || filtros.club || filtros.periodo);
}

export function rutaDeProyecto(id: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_PROYECTOS}/${id}`, { aviso });
}

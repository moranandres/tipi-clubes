import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_ADHESION = ["PENDIENTE", "ADHERIDA", "SUSPENDIDA", "RETIRADA"] as const;

export type EstadoAdhesion = (typeof ESTADOS_DE_ADHESION)[number];

export const NOMBRES_DE_ADHESION: Record<EstadoAdhesion, string> = {
  PENDIENTE: "Pendiente",
  ADHERIDA: "Adherida",
  SUSPENDIDA: "Suspendida",
  RETIRADA: "Retirada",
};

export const PUNTOS_DE_ADHESION: Record<EstadoAdhesion, string> = {
  PENDIENTE: "bg-aviso",
  ADHERIDA: "bg-exito",
  SUSPENDIDA: "bg-error",
  RETIRADA: "bg-tenue",
};

export const OPCIONES_DE_ADHESION = ESTADOS_DE_ADHESION.map((estado) => ({
  valor: estado,
  texto: NOMBRES_DE_ADHESION[estado],
}));

export type FiltrosInstituciones = {
  q: string;
  estado: EstadoAdhesion | null;
  pagina: number;
};

export const RUTA_INSTITUCIONES = "/portal/instituciones";
export const INSTITUCIONES_POR_PAGINA = 10;

export const FILTROS_DE_INSTITUCIONES_VACIOS: FiltrosInstituciones = {
  q: "",
  estado: null,
  pagina: 1,
};

export function leerFiltrosDeInstituciones(parametros: ParametrosDeBusqueda): FiltrosInstituciones {
  return {
    q: textoDeBusqueda(parametros.q),
    estado: opcionValida(ESTADOS_DE_ADHESION, primerValor(parametros.estado)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeInstituciones(filtros: FiltrosInstituciones): string {
  return rutaConConsulta(RUTA_INSTITUCIONES, {
    q: filtros.q,
    estado: filtros.estado,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeInstituciones(filtros: FiltrosInstituciones): boolean {
  return Boolean(filtros.q || filtros.estado);
}

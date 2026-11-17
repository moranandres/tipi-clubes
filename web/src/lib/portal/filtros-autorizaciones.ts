import {
  ESTADOS_DE_AUTORIZACION,
  type EstadoAutorizacion,
} from "./filtros-estudiantes";
import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  type ParametrosDeBusqueda,
} from "./parametros";

export const TIPOS_DE_AUTORIZACION = ["PARTICIPACION", "USO_IMAGEN"] as const;

export type TipoAutorizacion = (typeof TIPOS_DE_AUTORIZACION)[number];

export const NOMBRES_DE_TIPO_DE_AUTORIZACION: Record<TipoAutorizacion, string> = {
  PARTICIPACION: "Participación",
  USO_IMAGEN: "Uso de imagen",
};

export const DESCRIPCIONES_DE_TIPO_DE_AUTORIZACION: Record<TipoAutorizacion, string> = {
  PARTICIPACION:
    "Permite que el estudiante participe en los clubes. Es obligatoria para aprobar su inscripción.",
  USO_IMAGEN:
    "Permite publicar fotografías y videos en los que aparece el estudiante como evidencia del club.",
};

const SEGMENTOS_DE_TIPO: Record<TipoAutorizacion, string> = {
  PARTICIPACION: "participacion",
  USO_IMAGEN: "uso-de-imagen",
};

export const PARENTESCOS = [
  "MADRE",
  "PADRE",
  "TUTOR_LEGAL",
  "ABUELO",
  "TIO",
  "HERMANO",
  "OTRO",
] as const;

export type Parentesco = (typeof PARENTESCOS)[number];

export const NOMBRES_DE_PARENTESCO: Record<Parentesco, string> = {
  MADRE: "Madre",
  PADRE: "Padre",
  TUTOR_LEGAL: "Tutor legal",
  ABUELO: "Abuelo o abuela",
  TIO: "Tío o tía",
  HERMANO: "Hermano o hermana mayor de edad",
  OTRO: "Otro representante",
};

export const OPCIONES_DE_PARENTESCO = PARENTESCOS.map((parentesco) => ({
  valor: parentesco,
  texto: NOMBRES_DE_PARENTESCO[parentesco],
}));

export const OPCIONES_DE_TIPO_DE_AUTORIZACION = TIPOS_DE_AUTORIZACION.map((tipo) => ({
  valor: tipo,
  texto: NOMBRES_DE_TIPO_DE_AUTORIZACION[tipo],
}));

export type FiltrosAutorizaciones = {
  q: string;
  estado: EstadoAutorizacion | null;
  tipo: TipoAutorizacion | null;
  institucion: number | null;
  estudiante: number | null;
  pagina: number;
};

export type OrigenDeGestion = { desde: "lista" } | { desde: "ficha" } | { desde: "solicitud"; id: number };

export const RUTA_AUTORIZACIONES = "/portal/autorizaciones";
export const AUTORIZACIONES_POR_PAGINA = 10;

const ORIGEN_LISTA = "lista";

export const FILTROS_DE_AUTORIZACIONES_VACIOS: FiltrosAutorizaciones = {
  q: "",
  estado: null,
  tipo: null,
  institucion: null,
  estudiante: null,
  pagina: 1,
};

export function leerFiltrosDeAutorizaciones(parametros: ParametrosDeBusqueda): FiltrosAutorizaciones {
  return {
    q: "",
    estado: opcionValida(ESTADOS_DE_AUTORIZACION, primerValor(parametros.estado)),
    tipo: opcionValida(TIPOS_DE_AUTORIZACION, primerValor(parametros.tipo)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    estudiante: enteroPositivo(primerValor(parametros.estudiante)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeAutorizaciones(filtros: FiltrosAutorizaciones): string {
  return rutaConConsulta(RUTA_AUTORIZACIONES, {
    estado: filtros.estado,
    tipo: filtros.tipo,
    institucion: filtros.institucion,
    estudiante: filtros.estudiante,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeAutorizaciones(filtros: FiltrosAutorizaciones): boolean {
  return Boolean(filtros.estado || filtros.tipo || filtros.institucion || filtros.estudiante);
}

export function segmentoDeTipo(tipo: TipoAutorizacion): string {
  return SEGMENTOS_DE_TIPO[tipo];
}

export function tipoDeSegmento(segmento: string): TipoAutorizacion | null {
  return TIPOS_DE_AUTORIZACION.find((tipo) => SEGMENTOS_DE_TIPO[tipo] === segmento) ?? null;
}

export function leerOrigenDeGestion(parametros: ParametrosDeBusqueda): OrigenDeGestion {
  const solicitud = enteroPositivo(primerValor(parametros.solicitud));
  if (solicitud) {
    return { desde: "solicitud", id: solicitud };
  }
  return primerValor(parametros.desde) === ORIGEN_LISTA ? { desde: "lista" } : { desde: "ficha" };
}

export function rutaDeGestion(
  estudianteId: number,
  tipo: TipoAutorizacion,
  origen: OrigenDeGestion = { desde: "ficha" },
  aviso?: string,
): string {
  return rutaConConsulta(`${RUTA_AUTORIZACIONES}/${estudianteId}/${segmentoDeTipo(tipo)}`, {
    desde: origen.desde === "lista" ? ORIGEN_LISTA : null,
    solicitud: origen.desde === "solicitud" ? origen.id : null,
    aviso,
  });
}

export function rutaDeDocumento(
  estudianteId: number,
  tipo: TipoAutorizacion,
  descargar: boolean,
): string {
  return rutaConConsulta(
    `${RUTA_AUTORIZACIONES}/${estudianteId}/${segmentoDeTipo(tipo)}/documento`,
    { descargar: descargar ? 1 : null },
  );
}

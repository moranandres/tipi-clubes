import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ESTADOS_DE_ESTUDIANTE = ["ACTIVO", "RETIRADO", "EGRESADO"] as const;

export const CODIGOS_DE_CURSO_EDUCATIVO = [
  "INICIAL_1",
  "INICIAL_2",
  "EGB_1",
  "EGB_2",
  "EGB_3",
  "EGB_4",
  "EGB_5",
  "EGB_6",
  "EGB_7",
  "EGB_8",
  "EGB_9",
  "EGB_10",
  "BGU_1",
  "BGU_2",
  "BGU_3",
] as const;

export type EstadoEstudiante = (typeof ESTADOS_DE_ESTUDIANTE)[number];
export type CursoEducativo = (typeof CODIGOS_DE_CURSO_EDUCATIVO)[number];

export const NOMBRES_DE_ESTADO_DE_ESTUDIANTE: Record<EstadoEstudiante, string> = {
  ACTIVO: "Activo",
  RETIRADO: "Retirado",
  EGRESADO: "Egresado",
};

export const PUNTOS_DE_ESTADO_DE_ESTUDIANTE: Record<EstadoEstudiante, string> = {
  ACTIVO: "bg-exito",
  RETIRADO: "bg-aviso",
  EGRESADO: "bg-tenue",
};

export const ETIQUETAS_DE_CURSO_EDUCATIVO: Record<CursoEducativo, string> = {
  INICIAL_1: "Inicial 1",
  INICIAL_2: "Inicial 2",
  EGB_1: "1.º EGB",
  EGB_2: "2.º EGB",
  EGB_3: "3.º EGB",
  EGB_4: "4.º EGB",
  EGB_5: "5.º EGB",
  EGB_6: "6.º EGB",
  EGB_7: "7.º EGB",
  EGB_8: "8.º EGB",
  EGB_9: "9.º EGB",
  EGB_10: "10.º EGB",
  BGU_1: "1.º BGU",
  BGU_2: "2.º BGU",
  BGU_3: "3.º BGU",
};

export const OPCIONES_DE_CURSO_EDUCATIVO = CODIGOS_DE_CURSO_EDUCATIVO.map((codigo) => ({
  valor: codigo,
  texto: ETIQUETAS_DE_CURSO_EDUCATIVO[codigo],
}));

export const OPCIONES_DE_ESTADO_DE_ESTUDIANTE = ESTADOS_DE_ESTUDIANTE.map((estado) => ({
  valor: estado,
  texto: NOMBRES_DE_ESTADO_DE_ESTUDIANTE[estado],
}));

export const ESTADOS_DE_AUTORIZACION = ["PENDIENTE", "OTORGADA", "NO_OTORGADA", "REVOCADA"] as const;

export type EstadoAutorizacion = (typeof ESTADOS_DE_AUTORIZACION)[number];

export const NOMBRES_DE_AUTORIZACION: Record<EstadoAutorizacion, string> = {
  PENDIENTE: "Pendiente",
  OTORGADA: "Otorgada",
  NO_OTORGADA: "No otorgada",
  REVOCADA: "Revocada",
};

export const PUNTOS_DE_AUTORIZACION: Record<EstadoAutorizacion, string> = {
  PENDIENTE: "bg-aviso",
  OTORGADA: "bg-exito",
  NO_OTORGADA: "bg-error",
  REVOCADA: "bg-error",
};

export const AUTORIZACION_OTORGADA: EstadoAutorizacion = "OTORGADA";

export type FiltrosEstudiantes = {
  q: string;
  curso: CursoEducativo | null;
  estado: EstadoEstudiante | null;
  institucion: number | null;
  pagina: number;
};

export const RUTA_ESTUDIANTES = "/portal/estudiantes";
export const RUTA_HISTORIAL = "/portal/historial";
export const ESTUDIANTES_POR_PAGINA = 10;

export const FILTROS_DE_ESTUDIANTES_VACIOS: FiltrosEstudiantes = {
  q: "",
  curso: null,
  estado: null,
  institucion: null,
  pagina: 1,
};

export function leerFiltrosDeEstudiantes(parametros: ParametrosDeBusqueda): FiltrosEstudiantes {
  return {
    q: textoDeBusqueda(parametros.q),
    curso: opcionValida(CODIGOS_DE_CURSO_EDUCATIVO, primerValor(parametros.curso)),
    estado: opcionValida(ESTADOS_DE_ESTUDIANTE, primerValor(parametros.estado)),
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

function rutaDeListaDeEstudiantes(base: string, filtros: FiltrosEstudiantes): string {
  return rutaConConsulta(base, {
    q: filtros.q,
    curso: filtros.curso,
    estado: filtros.estado,
    institucion: filtros.institucion,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function rutaDeEstudiantes(filtros: FiltrosEstudiantes): string {
  return rutaDeListaDeEstudiantes(RUTA_ESTUDIANTES, filtros);
}

export function rutaDeHistorial(filtros: FiltrosEstudiantes): string {
  return rutaDeListaDeEstudiantes(RUTA_HISTORIAL, filtros);
}

export function hayFiltrosDeEstudiantes(filtros: FiltrosEstudiantes): boolean {
  return Boolean(filtros.q || filtros.curso || filtros.estado || filtros.institucion);
}

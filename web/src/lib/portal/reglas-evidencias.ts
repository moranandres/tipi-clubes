import { TIPOS_DE_EVIDENCIA, type TipoEvidencia } from "./filtros-evidencias";
import {
  LONGITUD_DE_FIRMA,
  TAMANO_MAXIMO_DE_DOCUMENTO,
  formatoPorFirma,
  tamanoLegible,
  type DescripcionDeArchivo,
  type FormatoDeDocumento,
} from "./reglas-autorizaciones";
import { esFechaValida, fechaCorta } from "./tiempo";

export type DatosDeEvidencia = {
  tipo: string;
  forma: string;
  titulo: string;
  descripcion: string;
  fechaEvidencia: string;
  url: string;
  sinEstudiantes: string;
};

export type CampoDeEvidencia = keyof DatosDeEvidencia | "archivo" | "estudianteIds";
export type ErroresDeEvidencia = Partial<Record<CampoDeEvidencia, string>>;

export type ContextoDeEvidencia = {
  esNueva: boolean;
  fechaActividad: string | null;
  hoy: string | null;
  autorizados: ReadonlySet<number> | null;
};

export type FormaDeProducto = "ARCHIVO" | "ENLACE";

export const CAMPOS_DE_EVIDENCIA: readonly (keyof DatosDeEvidencia)[] = [
  "tipo",
  "forma",
  "titulo",
  "descripcion",
  "fechaEvidencia",
  "url",
  "sinEstudiantes",
];

export const CAMPOS_CON_ERROR_DE_EVIDENCIA: readonly CampoDeEvidencia[] = [
  ...CAMPOS_DE_EVIDENCIA,
  "archivo",
  "estudianteIds",
];

export const LIMITES_DE_EVIDENCIA = {
  titulo: 150,
  descripcion: 1000,
  url: 500,
  motivo: 500,
  estudiantes: 60,
} as const;

export const MARCA_AFIRMATIVA = "si";
export const FORMA_ARCHIVO: FormaDeProducto = "ARCHIVO";
export const FORMA_ENLACE: FormaDeProducto = "ENLACE";

const FORMATOS_POR_TIPO: Record<TipoEvidencia, readonly FormatoDeDocumento[]> = {
  FOTOGRAFIA: ["JPG", "PNG"],
  DOCUMENTO: ["PDF"],
  ENLACE: [],
  PRODUCTO: ["PDF"],
};

const ACEPTA_POR_TIPO: Record<TipoEvidencia, string> = {
  FOTOGRAFIA: ".jpg,.jpeg,.png,image/jpeg,image/png",
  DOCUMENTO: ".pdf,application/pdf",
  ENLACE: "",
  PRODUCTO: ".pdf,application/pdf",
};

const TEXTO_POR_TIPO: Record<TipoEvidencia, string> = {
  FOTOGRAFIA: "JPG o PNG de hasta 5 MB",
  DOCUMENTO: "PDF de hasta 5 MB",
  ENLACE: "",
  PRODUCTO: "PDF de hasta 5 MB",
};

const EXTENSIONES: Record<FormatoDeDocumento, readonly string[]> = {
  PDF: [".pdf"],
  JPG: [".jpg", ".jpeg"],
  PNG: [".png"],
};

const TIPOS_MIME: Record<FormatoDeDocumento, string> = {
  PDF: "application/pdf",
  JPG: "image/jpeg",
  PNG: "image/png",
};

const ESQUEMA_WEB = /^https?:\/\//i;
const CON_ESPACIOS = /\s/;
const CON_CREDENCIALES = /^https?:\/\/[^/?#]*@/i;
const CON_ANFITRION = /^https?:\/\/[^/?#\s:@]+\.[^/?#\s:@]+/i;

export { LONGITUD_DE_FIRMA, tamanoLegible };

export function esTipoDeEvidencia(valor: string): valor is TipoEvidencia {
  return TIPOS_DE_EVIDENCIA.includes(valor as TipoEvidencia);
}

export function usaArchivo(tipo: string, forma: string): boolean {
  return tipo === "FOTOGRAFIA" || tipo === "DOCUMENTO" || (tipo === "PRODUCTO" && forma !== FORMA_ENLACE);
}

export function usaEnlace(tipo: string, forma: string): boolean {
  return tipo === "ENLACE" || (tipo === "PRODUCTO" && forma === FORMA_ENLACE);
}

export function relacionaEstudiantes(tipo: string): boolean {
  return tipo === "FOTOGRAFIA" || tipo === "PRODUCTO";
}

export function aceptaDe(tipo: TipoEvidencia): string {
  return ACEPTA_POR_TIPO[tipo];
}

export function textoDeFormatosDe(tipo: TipoEvidencia): string {
  return TEXTO_POR_TIPO[tipo];
}

export function errorDeArchivoDeEvidencia(
  tipo: TipoEvidencia,
  archivo: DescripcionDeArchivo,
): string | undefined {
  if (archivo.tamano === 0) {
    return "El archivo está vacío. Elige otro.";
  }
  if (archivo.tamano > TAMANO_MAXIMO_DE_DOCUMENTO) {
    return `El archivo pesa ${tamanoLegible(archivo.tamano)} y el máximo es 5 MB. Redúcelo e intenta de nuevo.`;
  }
  const formatos = FORMATOS_POR_TIPO[tipo];
  const nombre = archivo.nombre.toLowerCase();
  const extensionValida = formatos.some((formato) =>
    EXTENSIONES[formato].some((extension) => nombre.endsWith(extension)),
  );
  const tipoValido = !archivo.tipo || formatos.some((formato) => TIPOS_MIME[formato] === archivo.tipo);
  return extensionValida && tipoValido ? undefined : `Formato no permitido. Adjunta un ${TEXTO_POR_TIPO[tipo]}.`;
}

export function errorDeFirma(tipo: TipoEvidencia, firma: Uint8Array): string | undefined {
  const formato = formatoPorFirma(firma);
  return formato && FORMATOS_POR_TIPO[tipo].includes(formato)
    ? undefined
    : `El contenido del archivo no corresponde a un ${TEXTO_POR_TIPO[tipo].split(" de hasta")[0]}. Vuelve a exportarlo.`;
}

export function errorDeEnlace(valor: string): string | undefined {
  const url = valor.trim();
  if (!url) {
    return "Escribe el enlace de la evidencia.";
  }
  if (url.length > LIMITES_DE_EVIDENCIA.url) {
    return `El enlace admite hasta ${LIMITES_DE_EVIDENCIA.url} caracteres.`;
  }
  if (!ESQUEMA_WEB.test(url)) {
    return "El enlace debe empezar con http:// o https://.";
  }
  if (CON_ESPACIOS.test(url)) {
    return "El enlace no es una dirección web válida. Revisa que no tenga espacios.";
  }
  if (CON_CREDENCIALES.test(url)) {
    return "El enlace no debe incluir usuario ni contraseña.";
  }
  return CON_ANFITRION.test(url) ? undefined : "El enlace no es una dirección web válida.";
}

function errorDeTexto(valor: string, maximo: number, vacio: string): string | undefined {
  const texto = valor.trim();
  if (!texto) {
    return vacio;
  }
  return texto.length > maximo ? `Admite hasta ${maximo} caracteres.` : undefined;
}

function errorDeFecha(fecha: string, contexto: ContextoDeEvidencia): string | undefined {
  if (!fecha) {
    return contexto.esNueva ? undefined : "Indica la fecha de la evidencia.";
  }
  if (!esFechaValida(fecha)) {
    return "Escribe una fecha válida.";
  }
  if (contexto.fechaActividad && contexto.hoy && (fecha < contexto.fechaActividad || fecha > contexto.hoy)) {
    return `La fecha debe estar entre la fecha de la sesión (${fechaCorta(contexto.fechaActividad)}) y hoy.`;
  }
  return undefined;
}

function errorDeEstudiantes(
  tipo: string,
  estudiantes: readonly number[],
  sinEstudiantes: boolean,
  autorizados: ReadonlySet<number> | null,
): string | undefined {
  if (estudiantes.length > LIMITES_DE_EVIDENCIA.estudiantes) {
    return `Relaciona como máximo ${LIMITES_DE_EVIDENCIA.estudiantes} estudiantes por evidencia.`;
  }
  if (tipo !== "FOTOGRAFIA") {
    return undefined;
  }
  if (sinEstudiantes && estudiantes.length > 0) {
    return "Indica quiénes aparecen o márcala sin estudiantes identificables, pero no ambas cosas.";
  }
  if (!sinEstudiantes && estudiantes.length === 0) {
    return "Indica qué estudiantes aparecen en la fotografía o márcala sin estudiantes identificables.";
  }
  if (autorizados && estudiantes.some((id) => !autorizados.has(id))) {
    return "Solo pueden aparecer en una fotografía los estudiantes con autorización de uso de imagen otorgada.";
  }
  return undefined;
}

export function validarEvidencia(
  datos: DatosDeEvidencia,
  estudiantes: readonly number[],
  archivo: DescripcionDeArchivo | null,
  contexto: ContextoDeEvidencia,
): ErroresDeEvidencia {
  const errores: ErroresDeEvidencia = {};
  const tipo = datos.tipo;

  if (!esTipoDeEvidencia(tipo)) {
    errores.tipo = "Elige el tipo de evidencia.";
    return errores;
  }

  errores.titulo = errorDeTexto(datos.titulo, LIMITES_DE_EVIDENCIA.titulo, "Escribe el título de la evidencia.");
  errores.descripcion = errorDeTexto(
    datos.descripcion,
    LIMITES_DE_EVIDENCIA.descripcion,
    "Describe la evidencia.",
  );
  errores.fechaEvidencia = errorDeFecha(datos.fechaEvidencia, contexto);

  if (contexto.esNueva) {
    if (usaArchivo(tipo, datos.forma)) {
      errores.archivo = archivo
        ? errorDeArchivoDeEvidencia(tipo, archivo)
        : "Adjunta el archivo de la evidencia.";
    }
    if (usaEnlace(tipo, datos.forma)) {
      errores.url = errorDeEnlace(datos.url);
    }
  }

  errores.estudianteIds = errorDeEstudiantes(
    tipo,
    relacionaEstudiantes(tipo) ? estudiantes : [],
    tipo === "FOTOGRAFIA" && datos.sinEstudiantes === MARCA_AFIRMATIVA,
    contexto.autorizados,
  );

  return errores;
}

export function idsDeEstudiantes(valor: unknown): number[] {
  const lista = Array.isArray(valor) ? valor : [];
  const ids = lista
    .map((elemento) => (typeof elemento === "number" ? elemento : Number(elemento)))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  return [...new Set(ids)].slice(0, LIMITES_DE_EVIDENCIA.estudiantes + 1);
}

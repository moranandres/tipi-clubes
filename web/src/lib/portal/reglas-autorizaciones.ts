import { PARENTESCOS, type Parentesco } from "./filtros-autorizaciones";
import { ESTADOS_DE_AUTORIZACION, type EstadoAutorizacion } from "./filtros-estudiantes";
import { errorDeNombre } from "./reglas-estudiantes";
import { esFechaValida } from "./tiempo";

export type DatosDeAutorizacion = {
  estado: string;
  fechaRegistro: string;
  observacion: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  parentesco: string;
  telefono: string;
  correo: string;
};

export type CampoDeAutorizacion = keyof DatosDeAutorizacion | "archivo";
export type ErroresDeAutorizacion = Partial<Record<CampoDeAutorizacion, string>>;

export type ContextoDeAutorizacion = {
  estadoActual: EstadoAutorizacion;
  tieneDocumento: boolean;
  documentoTrasRevocacion: boolean;
  archivoNuevo: boolean;
};

export type DescripcionDeArchivo = {
  nombre: string;
  tipo: string;
  tamano: number;
};

export type FormatoDeDocumento = "PDF" | "JPG" | "PNG";

export const CAMPOS_DE_AUTORIZACION: readonly (keyof DatosDeAutorizacion)[] = [
  "estado",
  "fechaRegistro",
  "observacion",
  "nombres",
  "apellidos",
  "cedula",
  "parentesco",
  "telefono",
  "correo",
];

export const CAMPOS_CON_ERROR: readonly CampoDeAutorizacion[] = [...CAMPOS_DE_AUTORIZACION, "archivo"];

export const CAMPOS_DEL_REPRESENTANTE: readonly (keyof DatosDeAutorizacion)[] = [
  "nombres",
  "apellidos",
  "cedula",
  "parentesco",
  "telefono",
  "correo",
];

export const LONGITUD_MAXIMA_DE_OBSERVACION = 255;
export const LONGITUD_MAXIMA_DE_CORREO = 150;
export const LONGITUD_DE_CEDULA = 10;
export const LONGITUD_MAXIMA_DE_TELEFONO = 10;
export const TAMANO_MAXIMO_DE_DOCUMENTO = 5 * 1024 * 1024;
export const ACEPTA_DOCUMENTO = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
export const TEXTO_DE_FORMATOS = "PDF, JPG o PNG de hasta 5 MB";

const ESTADO_OTORGADA: EstadoAutorizacion = "OTORGADA";
const ESTADO_REVOCADA: EstadoAutorizacion = "REVOCADA";
const ESTADOS_QUE_NO_SIGUEN_A_OTORGADA: readonly EstadoAutorizacion[] = ["PENDIENTE", "NO_OTORGADA"];
const ESTADOS_QUE_SE_REVOCAN: readonly EstadoAutorizacion[] = ["OTORGADA", "REVOCADA"];

const TIPOS_DE_ARCHIVO = ["application/pdf", "image/jpeg", "image/png"];
const EXTENSIONES_DE_ARCHIVO = [".pdf", ".jpg", ".jpeg", ".png"];

const CEDULA = /^\d{10}$/;
const TELEFONO = /^0[2-9]\d{7,8}$/;
const CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const SEPARADORES_DE_NUMERO = /[\s().-]/g;

const ULTIMA_PROVINCIA = 24;
const PROVINCIA_EXTERIOR = 30;
const TERCER_DIGITO_MAXIMO = 5;

const FIRMAS: readonly { formato: FormatoDeDocumento; bytes: readonly number[] }[] = [
  { formato: "PDF", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { formato: "JPG", bytes: [0xff, 0xd8, 0xff] },
  { formato: "PNG", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

const FORMATO_DE_HOY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Guayaquil",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const FORMATO_DE_TAMANO = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

export const LONGITUD_DE_FIRMA = Math.max(...FIRMAS.map((firma) => firma.bytes.length));

export function hoyEnGuayaquil(): string {
  return FORMATO_DE_HOY.format(new Date());
}

export function limpiarNumero(valor: string): string {
  return valor.replace(SEPARADORES_DE_NUMERO, "");
}

export function esCedulaEcuatoriana(cedula: string): boolean {
  if (!CEDULA.test(cedula)) {
    return false;
  }
  const digitos = [...cedula].map(Number);
  const provincia = digitos[0] * 10 + digitos[1];
  if ((provincia < 1 || provincia > ULTIMA_PROVINCIA) && provincia !== PROVINCIA_EXTERIOR) {
    return false;
  }
  if (digitos[2] > TERCER_DIGITO_MAXIMO) {
    return false;
  }
  const suma = digitos.slice(0, 9).reduce((total, digito, indice) => {
    const valor = digito * (indice % 2 === 0 ? 2 : 1);
    return total + (valor > 9 ? valor - 9 : valor);
  }, 0);
  return (10 - (suma % 10)) % 10 === digitos[9];
}

export function esParentesco(valor: string): valor is Parentesco {
  return PARENTESCOS.includes(valor as Parentesco);
}

export function esEstadoDeAutorizacion(valor: string): valor is EstadoAutorizacion {
  return ESTADOS_DE_AUTORIZACION.includes(valor as EstadoAutorizacion);
}

export function bloqueoDeTransicion(
  actual: EstadoAutorizacion,
  nuevo: EstadoAutorizacion,
): string | null {
  if (actual === ESTADO_OTORGADA && ESTADOS_QUE_NO_SIGUEN_A_OTORGADA.includes(nuevo)) {
    return "Una autorización otorgada no vuelve a pendiente ni a no otorgada. Si el representante la retira, regístrala como revocada.";
  }
  if (nuevo === ESTADO_REVOCADA && !ESTADOS_QUE_SE_REVOCAN.includes(actual)) {
    return "Solo se puede revocar una autorización que estuvo otorgada.";
  }
  return null;
}

function errorDeCedula(valor: string): string | undefined {
  const cedula = limpiarNumero(valor);
  if (!cedula) {
    return "Escribe la cédula del representante.";
  }
  if (!CEDULA.test(cedula)) {
    return "La cédula tiene 10 dígitos, sin letras.";
  }
  return esCedulaEcuatoriana(cedula)
    ? undefined
    : "La cédula no es válida: revisa el código de provincia y el dígito verificador.";
}

function errorDeTelefono(valor: string): string | undefined {
  const telefono = limpiarNumero(valor);
  if (!telefono) {
    return "Escribe el teléfono del representante.";
  }
  return TELEFONO.test(telefono)
    ? undefined
    : "Escribe un celular de 10 dígitos (09…) o un fijo de 9 dígitos con el código de provincia (02…).";
}

function errorDeCorreo(valor: string): string | undefined {
  const correo = valor.trim();
  if (!correo) {
    return undefined;
  }
  if (correo.length > LONGITUD_MAXIMA_DE_CORREO) {
    return `Admite hasta ${LONGITUD_MAXIMA_DE_CORREO} caracteres.`;
  }
  return CORREO.test(correo) ? undefined : "Escribe un correo válido, por ejemplo nombre@dominio.com.";
}

function errorDeFecha(fecha: string, estado: string): string | undefined {
  if (!fecha) {
    return estado === ESTADO_OTORGADA
      ? "Indica la fecha en que el representante firmó la autorización."
      : undefined;
  }
  if (!esFechaValida(fecha)) {
    return "Escribe una fecha válida.";
  }
  return fecha > hoyEnGuayaquil() ? "La fecha de firma no puede ser posterior a hoy." : undefined;
}

function errorDeObservacion(observacion: string, estado: string): string | undefined {
  const texto = observacion.trim();
  if (texto.length > LONGITUD_MAXIMA_DE_OBSERVACION) {
    return `Admite hasta ${LONGITUD_MAXIMA_DE_OBSERVACION} caracteres.`;
  }
  return estado === ESTADO_REVOCADA && !texto
    ? "Escribe el motivo de la revocación: queda en la auditoría."
    : undefined;
}

function errorDeDocumentoParaOtorgar(contexto: ContextoDeAutorizacion): string | undefined {
  if (contexto.archivoNuevo) {
    return undefined;
  }
  if (!contexto.tieneDocumento) {
    return "Adjunta el documento firmado por el representante para otorgar la autorización.";
  }
  if (contexto.estadoActual === ESTADO_REVOCADA && !contexto.documentoTrasRevocacion) {
    return "Para otorgarla de nuevo después de la revocación, adjunta un documento firmado nuevo.";
  }
  return undefined;
}

export function validarAutorizacion(
  datos: DatosDeAutorizacion,
  contexto: ContextoDeAutorizacion | null,
): ErroresDeAutorizacion {
  const errores: ErroresDeAutorizacion = {};

  if (!esEstadoDeAutorizacion(datos.estado)) {
    errores.estado = "Elige el estado de la autorización.";
  } else if (contexto) {
    errores.estado = bloqueoDeTransicion(contexto.estadoActual, datos.estado) ?? undefined;
    if (datos.estado === ESTADO_OTORGADA) {
      errores.archivo = errorDeDocumentoParaOtorgar(contexto);
    }
  }

  errores.fechaRegistro = errorDeFecha(datos.fechaRegistro, datos.estado);
  errores.observacion = errorDeObservacion(datos.observacion, datos.estado);
  errores.nombres = errorDeNombre(datos.nombres, "Escribe los nombres del representante.");
  errores.apellidos = errorDeNombre(datos.apellidos, "Escribe los apellidos del representante.");
  errores.cedula = errorDeCedula(datos.cedula);
  errores.parentesco = esParentesco(datos.parentesco)
    ? undefined
    : "Elige el parentesco del representante con el estudiante.";
  errores.telefono = errorDeTelefono(datos.telefono);
  errores.correo = errorDeCorreo(datos.correo);

  return errores;
}

export function tamanoLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${FORMATO_DE_TAMANO.format(bytes / (1024 * 1024))} MB`;
  }
  return `${FORMATO_DE_TAMANO.format(Math.max(bytes / 1024, 0.1))} KB`;
}

export function errorDeArchivo(archivo: DescripcionDeArchivo): string | undefined {
  if (archivo.tamano === 0) {
    return "El archivo está vacío. Elige el documento escaneado o fotografiado.";
  }
  if (archivo.tamano > TAMANO_MAXIMO_DE_DOCUMENTO) {
    return `El archivo pesa ${tamanoLegible(archivo.tamano)} y el máximo es 5 MB. Reduce su resolución o escanéalo en PDF.`;
  }
  const nombre = archivo.nombre.toLowerCase();
  const extensionValida = EXTENSIONES_DE_ARCHIVO.some((extension) => nombre.endsWith(extension));
  const tipoValido = !archivo.tipo || TIPOS_DE_ARCHIVO.includes(archivo.tipo);
  return extensionValida && tipoValido
    ? undefined
    : "Formato no permitido. Adjunta un PDF, JPG o PNG.";
}

export function formatoPorFirma(bytes: Uint8Array): FormatoDeDocumento | null {
  const coincidencia = FIRMAS.find(
    (firma) =>
      bytes.length >= firma.bytes.length &&
      firma.bytes.every((byte, indice) => bytes[indice] === byte),
  );
  return coincidencia?.formato ?? null;
}

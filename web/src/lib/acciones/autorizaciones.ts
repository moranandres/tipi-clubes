"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion, type Resultado } from "@/lib/api/con-sesion";
import {
  TIPOS_DE_AUTORIZACION,
  type Parentesco,
  type TipoAutorizacion,
} from "@/lib/portal/filtros-autorizaciones";
import type { EstadoAutorizacion } from "@/lib/portal/filtros-estudiantes";
import {
  CAMPOS_DE_AUTORIZACION,
  LONGITUD_DE_FIRMA,
  errorDeArchivo,
  formatoPorFirma,
  limpiarNumero,
  validarAutorizacion,
  type DatosDeAutorizacion,
  type ErroresDeAutorizacion,
} from "@/lib/portal/reglas-autorizaciones";
import { normalizarNombre } from "@/lib/portal/reglas-estudiantes";
import { hayErrores, idDe, textoDe } from "@/lib/portal/validacion";
import {
  falloConDatosAlDia,
  falloDeApi,
  fueCorrecta,
  revalidarPortal,
  type PistaDeCampo,
} from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type AccionFallida,
  type ResultadoDeAccion,
} from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 400;
const CAMPO_DE_ARCHIVO = "archivo";
const PREFIJO_DEL_REPRESENTANTE = "representante.";
const MENSAJE_SIN_REGISTRO = "No se reconoce la autorización que intentas registrar.";
const MENSAJE_FIRMA_INVALIDA =
  "El contenido del archivo no corresponde a un PDF, JPG o PNG. Vuelve a exportarlo o escanearlo.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /documento|archivo|formato|tamaño/i, campo: CAMPO_DE_ARCHIVO },
  { patron: /observación/i, campo: "observacion" },
  { patron: /fecha/i, campo: "fechaRegistro" },
  { patron: /otorgada|revocar/i, campo: "estado" },
];

const MENSAJES_POR_ESTADO: Record<EstadoAutorizacion, string> = {
  PENDIENTE: "Los datos del representante se guardaron. La autorización sigue pendiente.",
  OTORGADA: "La autorización quedó otorgada con su documento firmado como respaldo.",
  NO_OTORGADA: "Se registró que el representante no otorgó la autorización.",
  REVOCADA: "La autorización quedó revocada y el motivo se registró en la auditoría.",
};

function tipoDe(valor: unknown): TipoAutorizacion | null {
  return TIPOS_DE_AUTORIZACION.find((tipo) => tipo === valor) ?? null;
}

function leerDatos(formulario: FormData): DatosDeAutorizacion {
  return Object.fromEntries(
    CAMPOS_DE_AUTORIZACION.map((campo) => [
      campo,
      textoDe(formulario.get(campo), LONGITUD_MAXIMA_DE_ENTRADA),
    ]),
  ) as DatosDeAutorizacion;
}

function archivoDe(formulario: FormData): File | null {
  const valor = formulario.get(CAMPO_DE_ARCHIVO);
  return valor instanceof File ? valor : null;
}

async function errorDelArchivo(archivo: File): Promise<string | undefined> {
  const error = errorDeArchivo({ nombre: archivo.name, tipo: archivo.type, tamano: archivo.size });
  if (error) {
    return error;
  }
  const firma = new Uint8Array(await archivo.slice(0, LONGITUD_DE_FIRMA).arrayBuffer());
  return formatoPorFirma(firma) ? undefined : MENSAJE_FIRMA_INVALIDA;
}

function conCamposPropios(respuesta: Resultado<unknown>): Resultado<unknown> {
  if (!respuesta.errores) {
    return respuesta;
  }
  const errores = Object.fromEntries(
    Object.entries(respuesta.errores).map(([campo, mensaje]) => [
      campo.startsWith(PREFIJO_DEL_REPRESENTANTE)
        ? campo.slice(PREFIJO_DEL_REPRESENTANTE.length)
        : campo,
      mensaje,
    ]),
  );
  return { ...respuesta, errores };
}

function trasCargarDocumento(fallo: AccionFallida): AccionFallida {
  return {
    ...fallo,
    mensaje: `El documento se cargó, pero la autorización no se actualizó. ${fallo.mensaje}`,
  };
}

async function cargarDocumento(
  token: string,
  estudianteId: number,
  tipo: TipoAutorizacion,
  archivo: File,
): Promise<Resultado<unknown>> {
  const cuerpo = new FormData();
  cuerpo.append(CAMPO_DE_ARCHIVO, archivo, archivo.name);

  return intentar(
    api.POST("/api/estudiantes/{estudianteId}/autorizaciones/{tipo}/documento", {
      ...conSesion(token),
      params: { path: { estudianteId, tipo } },
      body: { archivo: archivo.name },
      bodySerializer: () => cuerpo,
    }),
  );
}

export async function guardarAutorizacion(
  identificador: unknown,
  tipoElegido: unknown,
  formulario: unknown,
): Promise<ResultadoDeAccion> {
  const estudianteId = idDe(identificador);
  const tipo = tipoDe(tipoElegido);
  if (!estudianteId || !tipo || !(formulario instanceof FormData)) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerDatos(formulario);
  const archivo = archivoDe(formulario);
  const errores: ErroresDeAutorizacion = validarAutorizacion(datos, null);
  if (archivo) {
    errores.archivo = await errorDelArchivo(archivo);
  }
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();

  if (archivo) {
    const carga = await cargarDocumento(token, estudianteId, tipo, archivo);
    if (!fueCorrecta(carga)) {
      return falloDeApi(conCamposPropios(carga), PISTAS);
    }
  }

  const estado = datos.estado as EstadoAutorizacion;
  const respuesta = await intentar(
    api.PUT("/api/estudiantes/{estudianteId}/autorizaciones/{tipo}", {
      ...conSesion(token),
      params: { path: { estudianteId, tipo } },
      body: {
        estado,
        fechaRegistro: datos.fechaRegistro || undefined,
        observacion: datos.observacion.trim() || undefined,
        representante: {
          nombres: normalizarNombre(datos.nombres),
          apellidos: normalizarNombre(datos.apellidos),
          cedula: limpiarNumero(datos.cedula),
          parentesco: datos.parentesco as Parentesco,
          telefono: limpiarNumero(datos.telefono),
          correo: datos.correo.trim() || undefined,
        },
      },
    }),
  );

  if (!respuesta.datos) {
    if (archivo) {
      revalidarPortal();
      return trasCargarDocumento(falloDeApi(conCamposPropios(respuesta), PISTAS));
    }
    return falloConDatosAlDia(conCamposPropios(respuesta), PISTAS);
  }

  revalidarPortal();
  const avisos = respuesta.datos.advertencia ? [respuesta.datos.advertencia] : [];
  const mensaje =
    archivo && estado !== "OTORGADA"
      ? `${MENSAJES_POR_ESTADO[estado]} El documento quedó cargado.`
      : MENSAJES_POR_ESTADO[estado];
  return accionCorrecta(mensaje, avisos);
}

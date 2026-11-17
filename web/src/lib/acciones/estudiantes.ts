"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  ESTADOS_DE_ESTUDIANTE,
  RUTA_ESTUDIANTES,
  type CursoEducativo,
  type EstadoEstudiante,
} from "@/lib/portal/filtros-estudiantes";
import {
  CAMPOS_DE_ESTUDIANTE,
  CAMPO_DE_HOMONIMO,
  normalizarNombre,
  validarEstudiante,
  type DatosDeEstudiante,
} from "@/lib/portal/reglas-estudiantes";
import { hayErrores, idDe, leerCampos } from "@/lib/portal/validacion";
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
  type ResultadoDeAccion,
} from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 400;
const MENSAJE_SIN_REGISTRO = "No se reconoce el estudiante que intentas modificar.";
const AVISO_DE_ELIMINACION = "estudiante-eliminado";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /mismos nombres y apellidos/i, campo: CAMPO_DE_HOMONIMO },
  { patron: /institución/i, campo: "institucionId" },
];

function datosComunes(datos: DatosDeEstudiante, confirmar: unknown) {
  return {
    nombres: normalizarNombre(datos.nombres),
    apellidos: normalizarNombre(datos.apellidos),
    curso: datos.curso as CursoEducativo,
    confirmarHomonimo: confirmar === true ? true : undefined,
  };
}

export async function crearEstudiante(
  entrada: unknown,
  confirmarHomonimo: unknown,
): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_ESTUDIANTE, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarEstudiante(datos, true);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/estudiantes", {
      ...conSesion(token),
      body: {
        ...datosComunes(datos, confirmarHomonimo),
        institucionId: Number(datos.institucionId),
      },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta(
    "El estudiante se registró.",
    [],
    `${RUTA_ESTUDIANTES}/${respuesta.datos.id}?aviso=creado`,
  );
}

export async function actualizarEstudiante(
  identificador: unknown,
  entrada: unknown,
  confirmarHomonimo: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_ESTUDIANTE, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarEstudiante(datos, false);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/estudiantes/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: datosComunes(datos, confirmarHomonimo),
    }),
  );

  if (!respuesta.datos) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los datos del estudiante se guardaron.");
}

export async function cambiarEstadoDeEstudiante(
  identificador: unknown,
  estadoNuevo: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }
  if (!ESTADOS_DE_ESTUDIANTE.includes(estadoNuevo as EstadoEstudiante)) {
    return accionFallida("Elige el nuevo estado del estudiante.");
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/estudiantes/{id}/estado", {
      ...conSesion(token),
      params: { path: { id } },
      body: { estado: estadoNuevo as EstadoEstudiante },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta("El estado del estudiante se actualizó.");
}

export async function eliminarEstudiante(identificador: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.DELETE("/api/estudiantes/{id}", { ...conSesion(token), params: { path: { id } } }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloDeApi(respuesta);
  }

  revalidarPortal();
  return accionCorrecta(
    "El estudiante se eliminó.",
    [],
    `${RUTA_ESTUDIANTES}?aviso=${AVISO_DE_ELIMINACION}`,
  );
}

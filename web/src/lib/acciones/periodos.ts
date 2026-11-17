"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  CAMPOS_DE_PERIODO,
  RUTA_PERIODOS,
  validarPeriodo,
  type DatosDePeriodo,
} from "@/lib/portal/reglas-periodos";
import { hayErrores, idDe, leerCampos } from "@/lib/portal/validacion";
import { falloConDatosAlDia, falloDeApi, fueCorrecta, revalidarPortal, type PistaDeCampo } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 200;
const MENSAJE_SIN_REGISTRO = "No se reconoce el período que intentas modificar.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /con ese nombre/i, campo: "nombre" },
  { patron: /fecha de fin/i, campo: "fechaFin" },
];

function cuerpoDe(datos: DatosDePeriodo) {
  return {
    nombre: datos.nombre.trim(),
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
  };
}

function leerPeriodo(entrada: unknown): DatosDePeriodo {
  return leerCampos(entrada, CAMPOS_DE_PERIODO, LONGITUD_MAXIMA_DE_ENTRADA);
}

export async function crearPeriodo(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerPeriodo(entrada);
  const errores = validarPeriodo(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/periodos", { ...conSesion(token), body: cuerpoDe(datos) }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta(
    "El período se registró.",
    [],
    `${RUTA_PERIODOS}/${respuesta.datos.id}?aviso=creado`,
  );
}

export async function actualizarPeriodo(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerPeriodo(entrada);
  const errores = validarPeriodo(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/periodos/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: cuerpoDe(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los cambios del período se guardaron.");
}

export async function activarPeriodo(identificador: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/periodos/{id}/activar", { ...conSesion(token), params: { path: { id } } }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta("El período ahora es el vigente.");
}

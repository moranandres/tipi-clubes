"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  ESTADOS_DE_CONTENIDO,
  rutaDeContenido,
  type EstadoContenido,
} from "@/lib/portal/filtros-contenidos";
import {
  CAMPOS_DE_CONTENIDO,
  esTipoDeContenido,
  nombreNormalizado,
  validarContenido,
  type DatosDeContenido,
} from "@/lib/portal/reglas-contenidos";
import { hayErrores, idDe, leerCampos, textoOpcional } from "@/lib/portal/validacion";
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
const MENSAJE_SIN_REGISTRO = "No se reconoce el contenido que intentas modificar.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /con ese nombre/i, campo: "nombre" },
  { patron: /tipo/i, campo: "tipo" },
];

function leerContenido(entrada: unknown): DatosDeContenido {
  return leerCampos(entrada, CAMPOS_DE_CONTENIDO, LONGITUD_MAXIMA_DE_ENTRADA);
}

function cuerpoDe(datos: DatosDeContenido) {
  if (!esTipoDeContenido(datos.tipo)) {
    return null;
  }
  return {
    tipo: datos.tipo,
    nombre: nombreNormalizado(datos.nombre),
    descripcion: textoOpcional(datos.descripcion),
  };
}

export async function crearContenido(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerContenido(entrada);
  const errores = validarContenido(datos);
  const cuerpo = cuerpoDe(datos);
  if (hayErrores(errores) || !cuerpo) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/contenidos", { ...conSesion(token), body: cuerpo }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("El contenido se agregó.", [], rutaDeContenido(respuesta.datos.id, "creado"));
}

export async function actualizarContenido(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerContenido(entrada);
  const errores = validarContenido(datos);
  const cuerpo = cuerpoDe(datos);
  if (hayErrores(errores) || !cuerpo) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/contenidos/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: cuerpo,
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los cambios del contenido se guardaron.");
}

export async function cambiarEstadoDeContenido(
  identificador: unknown,
  estadoNuevo: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }
  if (!ESTADOS_DE_CONTENIDO.includes(estadoNuevo as EstadoContenido)) {
    return accionFallida("Elige el nuevo estado del contenido.");
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/contenidos/{id}/estado", {
      ...conSesion(token),
      params: { path: { id } },
      body: { activo: estadoNuevo === "ACTIVO" },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta(
    estadoNuevo === "ACTIVO"
      ? "El contenido quedó activo y vuelve a ofrecerse al planificar actividades."
      : "El contenido quedó inactivo. Las actividades que ya lo usan lo conservan.",
  );
}

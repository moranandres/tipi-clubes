"use server";

import { cookies, headers } from "next/headers";
import { api } from "@/lib/api/cliente";
import { intentar, type Resultado } from "@/lib/api/con-sesion";
import {
  LONGITUD_MAXIMA_DE_CLAVE,
  MENSAJE_ENLACE_INVALIDO,
  errorDeIdentificador,
  erroresDeClaveNueva,
  esEnlaceValido,
} from "@/lib/acceso/reglas-clave";
import { COOKIE_SESION, RUTA_PORTAL, opcionesCookieSesion } from "@/lib/sesion/cookie";
import { leerToken } from "@/lib/sesion/usuario";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

const ESPERA_MAXIMA_MS = 8000;
const DATOS_INVALIDOS = 400;
const NO_AUTENTICADO = 401;
const DEMASIADAS_SOLICITUDES = 429;

const MENSAJE_SIN_SERVICIO =
  "El servidor de TIPI 3.0 no responde. Vuelve a intentarlo en unos minutos.";
const MENSAJE_SESION_TERMINADA = "Tu sesión terminó. Entra de nuevo para cambiar tu contraseña.";
const MENSAJE_SOLICITUD_ENVIADA =
  "Si la cuenta existe y está activa, enviamos un enlace al correo registrado. Revisa también la carpeta de correo no deseado.";

type DatosDeCambio = {
  actual: string;
  nueva: string;
  confirmacion: string;
};

type DatosDeRestablecimiento = {
  token: string;
  nueva: string;
  confirmacion: string;
};

function texto(entrada: unknown, campo: string, maximo: number): string {
  if (typeof entrada !== "object" || entrada === null) {
    return "";
  }
  const valor = (entrada as Record<string, unknown>)[campo];
  return typeof valor === "string" ? valor.slice(0, maximo) : "";
}

async function opcionesDePeticion(token?: string) {
  const ip = (await headers()).get("x-forwarded-for");
  const cabeceras: Record<string, string> = {};
  if (ip) {
    cabeceras["X-Forwarded-For"] = ip;
  }
  if (token) {
    cabeceras.Authorization = `Bearer ${token}`;
  }
  return {
    headers: cabeceras,
    cache: "no-store" as const,
    signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
  };
}

function errorDeClaveDelServidor<T>(resultado: Resultado<T>): string | undefined {
  return resultado.errores?.passwordNueva ?? undefined;
}

function falloGeneral<T>(resultado: Resultado<T>): ResultadoDeAccion {
  if (resultado.estado === DEMASIADAS_SOLICITUDES && resultado.detalle) {
    return accionFallida(resultado.detalle);
  }
  if (resultado.estado === DATOS_INVALIDOS && resultado.detalle) {
    return accionFallida(resultado.detalle);
  }
  return accionFallida(MENSAJE_SIN_SERVICIO);
}

export async function cambiarClavePropia(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos: DatosDeCambio = {
    actual: texto(entrada, "actual", LONGITUD_MAXIMA_DE_CLAVE),
    nueva: texto(entrada, "nueva", LONGITUD_MAXIMA_DE_CLAVE),
    confirmacion: texto(entrada, "confirmacion", LONGITUD_MAXIMA_DE_CLAVE),
  };
  const errores = {
    actual: datos.actual ? undefined : "Escribe tu contraseña actual.",
    ...erroresDeClaveNueva(datos),
  };
  if (errores.actual || errores.nueva || errores.confirmacion) {
    return camposInvalidos(errores);
  }
  if (datos.actual === datos.nueva) {
    return camposInvalidos({ nueva: "La contraseña nueva debe ser distinta de la actual." });
  }

  const token = await leerToken();
  if (!token) {
    return accionFallida(MENSAJE_SESION_TERMINADA);
  }

  const resultado = await intentar(
    api.POST("/api/auth/cambiar-password", {
      body: { passwordActual: datos.actual, passwordNueva: datos.nueva },
      ...(await opcionesDePeticion(token)),
    }),
  );

  if (resultado.datos?.accessToken) {
    (await cookies()).set(
      COOKIE_SESION,
      resultado.datos.accessToken,
      opcionesCookieSesion(resultado.datos.expiresInSeconds),
    );
    return accionCorrecta("Tu contraseña quedó actualizada. Entrando al portal…", [], RUTA_PORTAL);
  }
  if (resultado.estado === NO_AUTENTICADO) {
    return accionFallida(MENSAJE_SESION_TERMINADA);
  }
  if (resultado.estado === DATOS_INVALIDOS) {
    const detalle = resultado.detalle ?? "";
    if (/actual es incorrecta/i.test(detalle)) {
      return camposInvalidos({ actual: detalle });
    }
    const deClave = errorDeClaveDelServidor(resultado) ?? (/distinta/i.test(detalle) ? detalle : undefined);
    if (deClave) {
      return camposInvalidos({ nueva: deClave });
    }
  }
  return falloGeneral(resultado);
}

export async function solicitarRecuperacion(entrada: unknown): Promise<ResultadoDeAccion> {
  const identificador = texto(entrada, "identificador", 200).trim();
  const error = errorDeIdentificador(identificador);
  if (error) {
    return camposInvalidos({ identificador: error });
  }

  const resultado = await intentar(
    api.POST("/api/auth/recuperar", {
      body: { identificador },
      ...(await opcionesDePeticion()),
    }),
  );

  if (resultado.estado === 202) {
    return accionCorrecta(MENSAJE_SOLICITUD_ENVIADA);
  }
  return falloGeneral(resultado);
}

export async function validarEnlaceDeRecuperacion(token: string): Promise<ResultadoDeAccion> {
  if (typeof token !== "string" || !esEnlaceValido(token)) {
    return accionFallida(MENSAJE_ENLACE_INVALIDO);
  }
  const resultado = await intentar(
    api.POST("/api/auth/restablecer/validar", {
      body: { token },
      ...(await opcionesDePeticion()),
    }),
  );
  if (resultado.estado === 204) {
    return accionCorrecta("Enlace vigente.");
  }
  if (resultado.estado === DATOS_INVALIDOS) {
    return accionFallida(MENSAJE_ENLACE_INVALIDO);
  }
  return falloGeneral(resultado);
}

export async function restablecerClave(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos: DatosDeRestablecimiento = {
    token: texto(entrada, "token", 64),
    nueva: texto(entrada, "nueva", LONGITUD_MAXIMA_DE_CLAVE),
    confirmacion: texto(entrada, "confirmacion", LONGITUD_MAXIMA_DE_CLAVE),
  };
  if (!esEnlaceValido(datos.token)) {
    return accionFallida(MENSAJE_ENLACE_INVALIDO);
  }
  const errores = erroresDeClaveNueva(datos);
  if (errores.nueva || errores.confirmacion) {
    return camposInvalidos(errores);
  }

  const resultado = await intentar(
    api.POST("/api/auth/restablecer", {
      body: { token: datos.token, passwordNueva: datos.nueva },
      ...(await opcionesDePeticion()),
    }),
  );

  if (resultado.estado === 204) {
    (await cookies()).delete(COOKIE_SESION);
    return accionCorrecta("Tu contraseña quedó restablecida. Ya puedes entrar al portal con ella.");
  }
  if (resultado.estado === DATOS_INVALIDOS) {
    const detalle = resultado.detalle ?? "";
    const deClave = errorDeClaveDelServidor(resultado) ?? (/distinta/i.test(detalle) ? detalle : undefined);
    if (deClave) {
      return camposInvalidos({ nueva: deClave });
    }
    if (resultado.errores?.token || /enlace/i.test(detalle)) {
      return accionFallida(MENSAJE_ENLACE_INVALIDO);
    }
  }
  return falloGeneral(resultado);
}

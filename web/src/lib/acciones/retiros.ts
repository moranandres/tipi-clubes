"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import { listarInscripcionesActivas } from "@/lib/api/retiros";
import { RUTA_RETIROS } from "@/lib/portal/filtros-retiros";
import { opcionesDeIntegrantes, type OpcionDeFormulario } from "@/lib/portal/opciones";
import { CAMPOS_DE_RETIRO, errorDeObservacion, validarRetiro } from "@/lib/portal/reglas-retiros";
import { errorDeMotivo } from "@/lib/portal/reglas-solicitudes";
import { hayErrores, idDe, leerCampos, textoDe } from "@/lib/portal/validacion";
import { falloConDatosAlDia, fueCorrecta, revalidarPortal, type PistaDeCampo } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

export type IntegrantesDeClub =
  | { ok: true; integrantes: OpcionDeFormulario[] }
  | { ok: false; mensaje: string };

const LONGITUD_MAXIMA_DE_ENTRADA = 2000;
const MENSAJE_SIN_REGISTRO = "No se reconoce la solicitud de retiro que intentas modificar.";
const MENSAJE_SIN_INTEGRANTES =
  "No pudimos cargar los integrantes del club. Vuelve a elegirlo para reintentar.";

const PISTAS_DE_REGISTRO: readonly PistaDeCampo[] = [
  { patron: /inscripción|integrante activo|retiro pendiente|clubes que coordina/i, campo: "inscripcionId" },
  { patron: /motivo/i, campo: "motivo" },
];

const PISTAS_DE_MOTIVO: readonly PistaDeCampo[] = [{ patron: /motivo/i, campo: "motivo" }];

export async function crearRetiro(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_RETIRO, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarRetiro(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/solicitudes-retiro", {
      ...conSesion(token),
      body: { inscripcionId: Number(datos.inscripcionId), motivo: datos.motivo.trim() },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_REGISTRO);
  }

  revalidarPortal();
  return accionCorrecta(
    "La solicitud de retiro se registró y queda pendiente de resolución.",
    respuesta.datos.avisos ?? [],
    `${RUTA_RETIROS}/${respuesta.datos.id}`,
  );
}

export async function aprobarRetiro(
  identificador: unknown,
  observacionEscrita: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const observacion = textoDe(observacionEscrita, LONGITUD_MAXIMA_DE_ENTRADA).trim();
  const error = errorDeObservacion(observacion);
  if (error) {
    return camposInvalidos({ observacion: error });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/solicitudes-retiro/{id}/aprobacion", {
      ...conSesion(token),
      params: { path: { id } },
      body: { observacion: observacion || undefined },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta("El retiro se aprobó y el estudiante salió del club.", respuesta.datos.avisos ?? []);
}

async function resolverConMotivo(
  ruta: "/api/solicitudes-retiro/{id}/rechazo" | "/api/solicitudes-retiro/{id}/cancelacion",
  identificador: unknown,
  motivoEscrito: unknown,
  mensaje: string,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const motivo = textoDe(motivoEscrito, LONGITUD_MAXIMA_DE_ENTRADA).trim();
  const error = errorDeMotivo(motivo);
  if (error) {
    return camposInvalidos({ motivo: error });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH(ruta, { ...conSesion(token), params: { path: { id } }, body: { motivo } }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_MOTIVO);
  }

  revalidarPortal();
  return accionCorrecta(mensaje);
}

export async function rechazarRetiro(
  identificador: unknown,
  motivo: unknown,
): Promise<ResultadoDeAccion> {
  return resolverConMotivo(
    "/api/solicitudes-retiro/{id}/rechazo",
    identificador,
    motivo,
    "La solicitud de retiro se rechazó. El estudiante sigue en el club.",
  );
}

export async function cancelarRetiro(
  identificador: unknown,
  motivo: unknown,
): Promise<ResultadoDeAccion> {
  return resolverConMotivo(
    "/api/solicitudes-retiro/{id}/cancelacion",
    identificador,
    motivo,
    "La solicitud de retiro se canceló. El estudiante sigue en el club.",
  );
}

export async function consultarIntegrantesDeClub(identificador: unknown): Promise<IntegrantesDeClub> {
  const clubId = idDe(identificador);
  if (!clubId) {
    return { ok: true, integrantes: [] };
  }

  const inscripciones = await listarInscripcionesActivas({ clubId });
  return inscripciones
    ? { ok: true, integrantes: opcionesDeIntegrantes(inscripciones) }
    : { ok: false, mensaje: MENSAJE_SIN_INTEGRANTES };
}

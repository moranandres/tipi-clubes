"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import { RUTA_INSTITUCIONES, type EstadoAdhesion } from "@/lib/portal/filtros-instituciones";
import {
  CAMPOS_DE_CONTACTO,
  CAMPOS_DE_INSTITUCION,
  normalizarAmie,
  validarContacto,
  validarInstitucion,
  type DatosDeContacto,
  type DatosDeInstitucion,
} from "@/lib/portal/reglas-instituciones";
import { hoyEnGuayaquil } from "@/lib/portal/tiempo";
import { hayErrores, idDe, leerCampos, textoOpcional } from "@/lib/portal/validacion";
import { falloConDatosAlDia, falloDeApi, revalidarPortal, type PistaDeCampo } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 400;
const MENSAJE_SIN_REGISTRO = "No se reconoce la institución que intentas modificar.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /AMIE/i, campo: "codigoAmie" },
  { patron: /fecha de adhesión/i, campo: "fechaAdhesion" },
];

function contactoDe(datos: DatosDeContacto) {
  return {
    direccion: textoOpcional(datos.direccion),
    telefono: textoOpcional(datos.telefono),
    correoContacto: textoOpcional(datos.correoContacto),
    autoridadNombre: textoOpcional(datos.autoridadNombre),
    autoridadCargo: textoOpcional(datos.autoridadCargo),
  };
}

function cuerpoDe(datos: DatosDeInstitucion) {
  return {
    ...contactoDe(datos),
    codigoAmie: normalizarAmie(datos.codigoAmie),
    nombre: datos.nombre.trim(),
    zona: textoOpcional(datos.zona),
    circuito: textoOpcional(datos.circuito),
    provincia: datos.provincia.trim(),
    canton: datos.canton.trim(),
    estadoAdhesion: datos.estadoAdhesion as EstadoAdhesion,
    fechaAdhesion: datos.fechaAdhesion || undefined,
  };
}

function leerInstitucion(entrada: unknown): DatosDeInstitucion {
  return leerCampos(entrada, CAMPOS_DE_INSTITUCION, LONGITUD_MAXIMA_DE_ENTRADA);
}

export async function crearInstitucion(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerInstitucion(entrada);
  const errores = validarInstitucion(datos, hoyEnGuayaquil());
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/instituciones", { ...conSesion(token), body: cuerpoDe(datos) }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta(
    "La institución se registró.",
    [],
    `${RUTA_INSTITUCIONES}/${respuesta.datos.id}?aviso=creada`,
  );
}

export async function actualizarInstitucion(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerInstitucion(entrada);
  const errores = validarInstitucion(datos, hoyEnGuayaquil());
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/instituciones/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: cuerpoDe(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los datos de la institución se guardaron.");
}

export async function actualizarContactoDeInstitucion(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_CONTACTO, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarContacto(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/instituciones/{id}/contacto", {
      ...conSesion(token),
      params: { path: { id } },
      body: contactoDe(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloDeApi(respuesta);
  }

  revalidarPortal();
  return accionCorrecta("Los datos de contacto se guardaron.");
}

export async function asignarResponsableDeInstitucion(
  identificador: unknown,
  usuario: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const usuarioId = idDe(usuario);
  if (!usuarioId) {
    return camposInvalidos({ usuarioId: "El usuario es obligatorio" });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/instituciones/{id}/responsable", {
      ...conSesion(token),
      params: { path: { id } },
      body: { usuarioId },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, [{ patron: /usuario/i, campo: "usuarioId" }]);
  }

  revalidarPortal();
  return accionCorrecta("El responsable institucional quedó asignado.");
}

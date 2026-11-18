"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  ESTADOS_DE_USUARIO,
  rolRequiereInstitucion,
  rutaDeUsuario,
  type EstadoUsuario,
} from "@/lib/portal/filtros-usuarios";
import {
  CAMPOS_DE_USUARIO,
  errorDeClaveTemporal,
  validarUsuario,
  type DatosDeUsuario,
} from "@/lib/portal/reglas-usuarios";
import { hayErrores, idDe, leerCampos, textoDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";
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

const LONGITUD_MAXIMA_DE_ENTRADA = 300;
const LONGITUD_MAXIMA_DE_CLAVE = 200;
const MENSAJE_SIN_REGISTRO = "No se reconoce el usuario que intentas modificar.";
const MENSAJE_PROPIO_ROL = "No puedes cambiar el rol de tu propia cuenta.";
const MENSAJE_PROPIA_DESACTIVACION =
  "No puedes desactivar tu propia cuenta. Pide a otro administrador que lo haga.";
const MENSAJE_PROPIA_CLAVE =
  "No puedes asignar una contraseña temporal a tu propia cuenta: cerraría tu sesión actual.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /nombre de usuario/i, campo: "username" },
  { patron: /correo/i, campo: "email" },
  { patron: /institución/i, campo: "institucionId" },
  { patron: /rol|administrador activo/i, campo: "rolCodigo" },
];

const PISTAS_DE_CLAVE: readonly PistaDeCampo[] = [
  { patron: /contraseña/i, campo: "passwordTemporal" },
];

function leerUsuario(entrada: unknown): DatosDeUsuario {
  return leerCampos(entrada, CAMPOS_DE_USUARIO, LONGITUD_MAXIMA_DE_ENTRADA);
}

function institucionDe(datos: DatosDeUsuario): number | undefined {
  return rolRequiereInstitucion(datos.rolCodigo) ? (idDe(datos.institucionId) ?? undefined) : undefined;
}

function datosComunes(datos: DatosDeUsuario) {
  return {
    email: datos.email.trim(),
    nombres: datos.nombres.trim(),
    apellidos: datos.apellidos.trim(),
    rolCodigo: datos.rolCodigo,
    institucionId: institucionDe(datos),
  };
}

export async function crearUsuario(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerUsuario(entrada);
  const errores = validarUsuario(datos, true);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/usuarios", {
      ...conSesion(token),
      body: {
        ...datosComunes(datos),
        username: datos.username.trim(),
        passwordTemporal: datos.passwordTemporal,
      },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("La cuenta se creó.", [], rutaDeUsuario(respuesta.datos.id, "creado"));
}

export async function actualizarUsuario(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerUsuario(entrada);
  const errores = validarUsuario(datos, false);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const sesion = await exigirSesion();
  if (sesion?.id === id && sesion.rol !== datos.rolCodigo) {
    return camposInvalidos({ rolCodigo: MENSAJE_PROPIO_ROL });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/usuarios/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: datosComunes(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los datos de la cuenta se guardaron.");
}

export async function cambiarEstadoDeUsuario(
  identificador: unknown,
  estadoNuevo: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }
  if (!ESTADOS_DE_USUARIO.includes(estadoNuevo as EstadoUsuario)) {
    return accionFallida("Elige el nuevo estado de la cuenta.");
  }

  const sesion = await exigirSesion();
  if (sesion?.id === id && estadoNuevo === "INACTIVO") {
    return accionFallida(MENSAJE_PROPIA_DESACTIVACION);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/usuarios/{id}/estado", {
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
      ? "La cuenta quedó activa. Ya puede iniciar sesión."
      : "La cuenta quedó inactiva y se cerraron sus sesiones abiertas.",
  );
}

export async function restablecerClaveDeUsuario(
  identificador: unknown,
  clave: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const passwordTemporal = textoDe(clave, LONGITUD_MAXIMA_DE_CLAVE);
  const error = errorDeClaveTemporal(passwordTemporal);
  if (error) {
    return camposInvalidos({ passwordTemporal: error });
  }

  const sesion = await exigirSesion();
  if (sesion?.id === id) {
    return accionFallida(MENSAJE_PROPIA_CLAVE);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/usuarios/{id}/restablecer-password", {
      ...conSesion(token),
      params: { path: { id } },
      body: { passwordTemporal },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_CLAVE);
  }

  revalidarPortal();
  return accionCorrecta(
    "Se asignó la contraseña temporal. La persona deberá cambiarla al entrar y sus sesiones abiertas se cerraron.",
  );
}

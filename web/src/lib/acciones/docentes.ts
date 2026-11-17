"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import { listarCuentasDisponibles } from "@/lib/api/docentes";
import {
  ESTADOS_DE_DOCENTE,
  RUTA_DOCENTES,
  type EstadoDocente,
} from "@/lib/portal/filtros-docentes";
import { opcionesDeCuentas, type OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_DOCENTE,
  validarDocente,
  type DatosDeDocente,
} from "@/lib/portal/reglas-docentes";
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

export type ResultadoDeCuentas =
  | { ok: true; cuentas: OpcionDeFormulario[] }
  | { ok: false; mensaje: string };

const LONGITUD_MAXIMA_DE_ENTRADA = 300;
const MENSAJE_SIN_REGISTRO = "No se reconoce el docente que intentas modificar.";
const MENSAJE_SIN_CUENTAS =
  "No pudimos cargar las cuentas de la institución. Vuelve a elegirla para reintentar.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /usuario/i, campo: "usuarioId" },
  { patron: /institución/i, campo: "institucionId" },
];

function datosComunes(datos: DatosDeDocente) {
  return {
    nombres: datos.nombres.trim(),
    apellidos: datos.apellidos.trim(),
    correo: textoOpcional(datos.correo),
    telefono: textoOpcional(datos.telefono),
    usuarioId: idDe(datos.usuarioId) ?? undefined,
  };
}

function leerDocente(entrada: unknown): DatosDeDocente {
  return leerCampos(entrada, CAMPOS_DE_DOCENTE, LONGITUD_MAXIMA_DE_ENTRADA);
}

export async function crearDocente(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerDocente(entrada);
  const errores = validarDocente(datos, true);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/docentes", {
      ...conSesion(token),
      body: { ...datosComunes(datos), institucionId: Number(datos.institucionId) },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta(
    "El docente se registró.",
    [],
    `${RUTA_DOCENTES}/${respuesta.datos.id}?aviso=creado`,
  );
}

export async function actualizarDocente(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerDocente(entrada);
  const errores = validarDocente(datos, false);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/docentes/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: datosComunes(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los datos del docente se guardaron.");
}

export async function cambiarEstadoDeDocente(
  identificador: unknown,
  estadoNuevo: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }
  if (!ESTADOS_DE_DOCENTE.includes(estadoNuevo as EstadoDocente)) {
    return accionFallida("Elige el nuevo estado del docente.");
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/docentes/{id}/estado", {
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
    estadoNuevo === "ACTIVO" ? "El docente quedó activo." : "El docente quedó inactivo.",
  );
}

export async function consultarCuentasDeInstitucion(
  identificador: unknown,
): Promise<ResultadoDeCuentas> {
  const institucionId = idDe(identificador);
  if (!institucionId) {
    return { ok: true, cuentas: [] };
  }

  const cuentas = await listarCuentasDisponibles(institucionId, null);
  return cuentas
    ? { ok: true, cuentas: opcionesDeCuentas(cuentas) }
    : { ok: false, mensaje: MENSAJE_SIN_CUENTAS };
}

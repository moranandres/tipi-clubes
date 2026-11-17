"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import { RUTA_ACTIVIDADES, rutaDeActividad } from "@/lib/portal/filtros-actividades";
import {
  CAMPOS_DE_ACTIVIDAD,
  CAMPOS_DE_EJECUCION,
  LIMITES_DE_ACTIVIDAD,
  idsDeContenido,
  validarActividad,
  validarEjecucion,
  type DatosDeActividad,
} from "@/lib/portal/reglas-actividades";
import { hayErrores, idDe, leerCampos, textoDe, textoOpcional } from "@/lib/portal/validacion";
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

const LONGITUD_MAXIMA_DE_ENTRADA = 4100;
const MENSAJE_SIN_ACTIVIDAD = "No se reconoce la actividad que intentas modificar.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /reprogramación|motivoReprogramacion/i, campo: "motivoReprogramacion" },
  { patron: /hora de fin|como máximo 8 horas/i, campo: "horaFin" },
  { patron: /responsable/i, campo: "responsableId" },
  { patron: /curso/i, campo: "cursoId" },
  { patron: /contenido/i, campo: "contenidoIds" },
  { patron: /^el club indicado/i, campo: "clubId" },
];

const PISTAS_DE_EJECUCION: readonly PistaDeCampo[] = [
  { patron: /contenido/i, campo: "contenidoIds" },
  { patron: /impartidos/i, campo: "resumen" },
];

function cuerpoDeActividad(datos: DatosDeActividad, contenidoIds: number[]) {
  return {
    cursoId: idDe(datos.cursoId) ?? undefined,
    fecha: datos.fecha,
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
    tema: datos.tema.trim(),
    objetivo: datos.objetivo.trim(),
    descripcion: textoOpcional(datos.descripcion),
    lugar: textoOpcional(datos.lugar),
    contenidoIds,
  };
}

export async function crearActividad(
  entrada: unknown,
  contenidos: unknown,
): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_ACTIVIDAD, LONGITUD_MAXIMA_DE_ENTRADA);
  const contenidoIds = idsDeContenido(contenidos);
  const errores = validarActividad(datos, contenidoIds, null);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/actividades", {
      ...conSesion(token),
      body: { ...cuerpoDeActividad(datos, contenidoIds), clubId: Number(datos.clubId) },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta(
    "La actividad quedó planificada.",
    [],
    rutaDeActividad(respuesta.datos.id, "creada"),
  );
}

export async function actualizarActividad(
  identificador: unknown,
  entrada: unknown,
  contenidos: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_ACTIVIDAD);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_ACTIVIDAD, LONGITUD_MAXIMA_DE_ENTRADA);
  const contenidoIds = idsDeContenido(contenidos);
  const errores = validarActividad(datos, contenidoIds, {
    fecha: datos.fecha,
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
  });
  const motivo = datos.motivoReprogramacion.trim();
  if (motivo.length > LIMITES_DE_ACTIVIDAD.motivo) {
    errores.motivoReprogramacion = `Admite hasta ${LIMITES_DE_ACTIVIDAD.motivo} caracteres.`;
  }
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/actividades/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: {
        ...cuerpoDeActividad(datos, contenidoIds),
        responsableId: idDe(datos.responsableId) ?? undefined,
        motivoReprogramacion: motivo || undefined,
      },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta(
    motivo
      ? "La actividad se reprogramó y el motivo quedó en su historial."
      : "Los cambios de la actividad se guardaron.",
  );
}

export async function registrarEjecucion(
  identificador: unknown,
  entrada: unknown,
  contenidos: unknown,
  esCorreccion: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_ACTIVIDAD);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_EJECUCION, LONGITUD_MAXIMA_DE_ENTRADA);
  const contenidoIds = idsDeContenido(contenidos);
  const errores = validarEjecucion(datos, contenidoIds);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/actividades/{id}/ejecucion", {
      ...conSesion(token),
      params: { path: { id } },
      body: {
        resumen: datos.resumen.trim(),
        observaciones: textoOpcional(datos.observaciones),
        contenidoIds,
      },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_EJECUCION);
  }

  revalidarPortal();
  if (esCorreccion === true) {
    return accionCorrecta("Los datos de la ejecución se corrigieron.");
  }
  return accionCorrecta("La ejecución quedó registrada.", [], rutaDeActividad(id, "ejecutada"));
}

export async function cancelarActividad(
  identificador: unknown,
  motivoEscrito: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_ACTIVIDAD);
  }

  const motivo = textoDe(motivoEscrito, LONGITUD_MAXIMA_DE_ENTRADA).trim();
  if (!motivo) {
    return camposInvalidos({ motivo: "Escribe el motivo de la cancelación." });
  }
  if (motivo.length > LIMITES_DE_ACTIVIDAD.motivo) {
    return camposInvalidos({ motivo: `Admite hasta ${LIMITES_DE_ACTIVIDAD.motivo} caracteres.` });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/actividades/{id}/cancelacion", {
      ...conSesion(token),
      params: { path: { id } },
      body: { motivo },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta, [{ patron: /motivo/i, campo: "motivo" }]);
  }

  revalidarPortal();
  return accionCorrecta("La actividad se canceló.");
}

export async function eliminarActividad(identificador: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_ACTIVIDAD);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.DELETE("/api/actividades/{id}", { ...conSesion(token), params: { path: { id } } }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta(
    "La actividad se eliminó.",
    [],
    `${RUTA_ACTIVIDADES}?aviso=actividad-eliminada`,
  );
}

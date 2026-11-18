"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import { rutaDeProyecto } from "@/lib/portal/filtros-proyectos";
import {
  CAMPOS_DE_PROYECTO,
  LIMITES_DE_PROYECTO,
  errorDeMotivoDeCancelacion,
  esTipoDeProyecto,
  idsValidos,
  validarFinalizacion,
  validarProyecto,
  type DatosDeProyecto,
} from "@/lib/portal/reglas-proyectos";
import { hayErrores, idDe, leerCampos, textoDe, textoOpcional } from "@/lib/portal/validacion";
import { falloConDatosAlDia, falloDeApi, revalidarPortal, type PistaDeCampo } from "./fallo";
import { accionCorrecta, accionFallida, camposInvalidos, type ResultadoDeAccion } from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 4100;
const MENSAJE_SIN_PROYECTO = "No se reconoce el proyecto que intentas modificar.";
const CONTEXTO_DEL_SERVIDOR = { periodo: null, hoy: null };

const PISTAS_DE_PROYECTO: readonly PistaDeCampo[] = [
  { patron: /título/i, campo: "titulo" },
  { patron: /docente tutor/i, campo: "docenteId" },
  { patron: /fecha prevista/i, campo: "fechaFinPrevista" },
  { patron: /fecha de inicio/i, campo: "fechaInicio" },
  { patron: /integrante|estudiante/i, campo: "estudianteIds" },
  { patron: /objetivo/i, campo: "objetivo" },
  { patron: /club/i, campo: "clubId" },
];

const PISTAS_DE_FINALIZACION: readonly PistaDeCampo[] = [
  { patron: /resultado final/i, campo: "resultadoFinal" },
  { patron: /fecha de finalización/i, campo: "fechaFinalizacion" },
];

function cuerpoDe(datos: DatosDeProyecto, estudianteIds: number[]) {
  return {
    tipo: datos.tipo as "PROTOTIPO" | "SOFTWARE" | "OTRO",
    titulo: datos.titulo.trim(),
    objetivo: datos.objetivo.trim(),
    descripcion: textoOpcional(datos.descripcion),
    docenteId: idDe(datos.docenteId) ?? 0,
    fechaInicio: datos.fechaInicio,
    fechaFinPrevista: datos.fechaFinPrevista || undefined,
    estudianteIds,
  };
}

function leer(entrada: unknown, integrantes: unknown) {
  const datos = leerCampos(entrada, CAMPOS_DE_PROYECTO, LONGITUD_MAXIMA_DE_ENTRADA);
  const estudianteIds = idsValidos(integrantes, LIMITES_DE_PROYECTO.integrantes);
  return { datos, estudianteIds, errores: validarProyecto(datos, estudianteIds, CONTEXTO_DEL_SERVIDOR) };
}

export async function registrarProyecto(entrada: unknown, integrantes: unknown): Promise<ResultadoDeAccion> {
  const { datos, estudianteIds, errores } = leer(entrada, integrantes);
  const clubId = idDe(datos.clubId);
  if (hayErrores(errores) || !clubId || !esTipoDeProyecto(datos.tipo)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/proyectos", { ...conSesion(token), body: { clubId, ...cuerpoDe(datos, estudianteIds) } }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS_DE_PROYECTO);
  }

  revalidarPortal();
  return accionCorrecta("El proyecto quedó registrado.", [], rutaDeProyecto(respuesta.datos.id, "registrado"));
}

export async function actualizarProyecto(
  identificador: unknown,
  entrada: unknown,
  integrantes: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_PROYECTO);
  }

  const { datos, estudianteIds, errores } = leer(entrada, integrantes);
  if (hayErrores(errores) || !esTipoDeProyecto(datos.tipo)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/proyectos/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: cuerpoDe(datos, estudianteIds),
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_PROYECTO);
  }

  revalidarPortal();
  return accionCorrecta("Los datos del proyecto se guardaron.");
}

export async function vincularEvidencias(identificador: unknown, elegidas: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_PROYECTO);
  }
  const evidenciaIds = idsValidos(elegidas, LIMITES_DE_PROYECTO.evidencias);
  if (evidenciaIds.length > LIMITES_DE_PROYECTO.evidencias) {
    return camposInvalidos({ evidenciaIds: `Máximo ${LIMITES_DE_PROYECTO.evidencias} evidencias por proyecto` });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/proyectos/{id}/evidencias", {
      ...conSesion(token),
      params: { path: { id } },
      body: { evidenciaIds },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, [{ patron: /evidencia/i, campo: "evidenciaIds" }]);
  }

  revalidarPortal();
  return accionCorrecta(
    evidenciaIds.length === 0
      ? "El proyecto ya no tiene evidencias vinculadas."
      : `El proyecto tiene ${evidenciaIds.length} ${evidenciaIds.length === 1 ? "evidencia vinculada" : "evidencias vinculadas"}.`,
  );
}

export async function finalizarProyecto(identificador: unknown, entrada: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_PROYECTO);
  }

  const datos = leerCampos(entrada, ["resultadoFinal", "fechaFinalizacion"] as const, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarFinalizacion(datos, null, null);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/proyectos/{id}/finalizacion", {
      ...conSesion(token),
      params: { path: { id } },
      body: {
        resultadoFinal: datos.resultadoFinal.trim(),
        fechaFinalizacion: datos.fechaFinalizacion || undefined,
      },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_FINALIZACION);
  }

  revalidarPortal();
  return accionCorrecta("El proyecto quedó finalizado.", [], rutaDeProyecto(id, "finalizado"));
}

export async function cancelarProyecto(identificador: unknown, motivoEscrito: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_PROYECTO);
  }

  const motivo = textoDe(motivoEscrito, LIMITES_DE_PROYECTO.motivo + 1).trim();
  const error = errorDeMotivoDeCancelacion(motivo);
  if (error) {
    return camposInvalidos({ motivo: error });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/proyectos/{id}/cancelacion", {
      ...conSesion(token),
      params: { path: { id } },
      body: { motivo },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, [{ patron: /motivo/i, campo: "motivo" }]);
  }

  revalidarPortal();
  return accionCorrecta("El proyecto quedó cancelado.", [], rutaDeProyecto(id, "cancelado"));
}

"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  RUTA_COMPETENCIAS,
  rutaDeCompetenciaDelCatalogo,
  rutaDeParticipacion,
} from "@/lib/portal/filtros-competencias";
import {
  CAMPOS_DE_CATEGORIA,
  CAMPOS_DE_COMPETENCIA,
  CAMPOS_DE_EDICION,
  CAMPOS_DE_PARTICIPACION,
  CAMPOS_DE_RESULTADO,
  esNivelDeCategoria,
  puestoDe,
  validarCategoria,
  validarCompetencia,
  validarEdicion,
  validarParticipacion,
  validarResultado,
  type DatosDeCategoria,
  type DatosDeCompetencia,
  type DatosDeEdicion,
  type DatosDeResultado,
} from "@/lib/portal/reglas-competencias";
import { enteroDe, hayErrores, idDe, leerCampos, textoOpcional } from "@/lib/portal/validacion";
import { falloConDatosAlDia, falloDeApi, fueCorrecta, revalidarPortal, type PistaDeCampo } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 1100;
const MENSAJE_SIN_PARTICIPACION = "No se reconoce la participación que intentas modificar.";
const MENSAJE_SIN_COMPETENCIA = "No se reconoce la competencia que intentas modificar.";
const MENSAJE_SIN_EDICION = "No se reconoce la edición que intentas modificar.";
const MENSAJE_SIN_CATEGORIA = "No se reconoce la categoría que intentas modificar.";
const CONTEXTO_DEL_SERVIDOR = { inicioDeEdicion: null, hoy: null, anterior: null };

const PISTAS_DE_RESULTADO: readonly PistaDeCampo[] = [
  { patron: /equipo/i, campo: "equipoNombre" },
  { patron: /resultados|puesto/i, campo: "puesto" },
  { patron: /reconocimiento/i, campo: "reconocimiento" },
  { patron: /observaciones/i, campo: "observaciones" },
];

const PISTAS_DE_PARTICIPACION: readonly PistaDeCampo[] = [
  ...PISTAS_DE_RESULTADO,
  { patron: /categoría/i, campo: "categoriaId" },
  { patron: /edición/i, campo: "edicionId" },
  { patron: /La competencia «/, campo: "competenciaId" },
  { patron: /inscripción|autorización|integrantes|estudiante|club/i, campo: "inscripcionId" },
];

const PISTAS_DE_COMPETENCIA: readonly PistaDeCampo[] = [
  { patron: /nombre/i, campo: "nombre" },
  { patron: /sitio web/i, campo: "sitioWeb" },
  { patron: /organizador/i, campo: "organizador" },
];

const PISTAS_DE_EDICION: readonly PistaDeCampo[] = [
  { patron: /nombre/i, campo: "nombre" },
  { patron: /indique también|fecha de inicio/i, campo: "fechaInicio" },
  { patron: /fecha de fin/i, campo: "fechaFin" },
  { patron: /año/i, campo: "anio" },
  { patron: /sede/i, campo: "sede" },
];

const PISTAS_DE_CATEGORIA: readonly PistaDeCampo[] = [
  { patron: /nombre/i, campo: "nombre" },
  { patron: /nivel/i, campo: "nivel" },
  { patron: /descripci/i, campo: "descripcion" },
];

function cuerpoDeResultado(datos: DatosDeResultado) {
  return {
    equipoNombre: datos.equipoNombre.trim(),
    puesto: puestoDe(datos.puesto) ?? undefined,
    reconocimiento: datos.reconocimiento.trim(),
    observaciones: datos.observaciones.trim(),
  };
}

export async function registrarParticipacion(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_PARTICIPACION, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarParticipacion(datos, { ...CONTEXTO_DEL_SERVIDOR, autorizado: null });
  const inscripcionId = idDe(datos.inscripcionId);
  const edicionId = idDe(datos.edicionId);
  const categoriaId = idDe(datos.categoriaId);
  if (hayErrores(errores) || !inscripcionId || !edicionId || !categoriaId) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/participaciones-competencia", {
      ...conSesion(token),
      body: { inscripcionId, edicionId, categoriaId, ...cuerpoDeResultado(datos) },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS_DE_PARTICIPACION);
  }

  revalidarPortal();
  return accionCorrecta(
    "La participación quedó registrada.",
    respuesta.datos.avisos ?? [],
    rutaDeParticipacion(respuesta.datos.id, "registrada"),
  );
}

export async function actualizarParticipacion(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_PARTICIPACION);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_RESULTADO, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarResultado(datos, CONTEXTO_DEL_SERVIDOR);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/participaciones-competencia/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: cuerpoDeResultado(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_RESULTADO);
  }

  revalidarPortal();
  const avisos = respuesta.datos.avisos ?? [];
  return avisos.length > 0 && avisos[0].startsWith("No había cambios")
    ? accionCorrecta(avisos[0])
    : accionCorrecta("El resultado de la participación se guardó.", avisos);
}

export async function eliminarParticipacion(identificador: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_PARTICIPACION);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.DELETE("/api/participaciones-competencia/{id}", {
      ...conSesion(token),
      params: { path: { id } },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta("La participación se eliminó.", [], `${RUTA_COMPETENCIAS}?aviso=eliminada`);
}

function cuerpoDeCompetencia(datos: DatosDeCompetencia) {
  return {
    nombre: datos.nombre.trim(),
    organizador: textoOpcional(datos.organizador),
    sitioWeb: textoOpcional(datos.sitioWeb),
  };
}

export async function crearCompetencia(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_COMPETENCIA, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarCompetencia(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/competencias", { ...conSesion(token), body: cuerpoDeCompetencia(datos) }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS_DE_COMPETENCIA);
  }

  revalidarPortal();
  return accionCorrecta(
    "La competencia se registró en el catálogo.",
    [],
    rutaDeCompetenciaDelCatalogo(respuesta.datos.id, "creada"),
  );
}

export async function actualizarCompetencia(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_COMPETENCIA);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_COMPETENCIA, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarCompetencia(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/competencias/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: cuerpoDeCompetencia(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_COMPETENCIA);
  }

  revalidarPortal();
  return accionCorrecta("Los datos de la competencia se guardaron.");
}

function activaDe(estado: unknown): boolean | null {
  if (estado === "ACTIVA") {
    return true;
  }
  return estado === "INACTIVA" ? false : null;
}

function mensajeDeEstado(sujeto: string, activa: boolean): string {
  return activa
    ? `${sujeto} vuelve a admitir nuevas participaciones.`
    : `${sujeto} ya no admite nuevas participaciones. Las registradas se conservan.`;
}

export async function cambiarEstadoCompetencia(
  identificador: unknown,
  estado: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  const activa = activaDe(estado);
  if (!id || activa === null) {
    return accionFallida(MENSAJE_SIN_COMPETENCIA);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/competencias/{id}/estado", {
      ...conSesion(token),
      params: { path: { id } },
      body: { activa },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta(mensajeDeEstado("La competencia", activa));
}

function cuerpoDeEdicion(datos: DatosDeEdicion) {
  return {
    nombre: datos.nombre.trim(),
    anio: enteroDe(datos.anio) ?? 0,
    fechaInicio: datos.fechaInicio || undefined,
    fechaFin: datos.fechaFin || undefined,
    sede: textoOpcional(datos.sede),
  };
}

export async function guardarEdicion(
  competencia: unknown,
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const competenciaId = idDe(competencia);
  const id = identificador === null ? null : idDe(identificador);
  if (!competenciaId || (identificador !== null && !id)) {
    return accionFallida(MENSAJE_SIN_EDICION);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_EDICION, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarEdicion(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    id
      ? api.PUT("/api/competencias/{competenciaId}/ediciones/{id}", {
          ...conSesion(token),
          params: { path: { competenciaId, id } },
          body: cuerpoDeEdicion(datos),
        })
      : api.POST("/api/competencias/{competenciaId}/ediciones", {
          ...conSesion(token),
          params: { path: { competenciaId } },
          body: cuerpoDeEdicion(datos),
        }),
  );

  if (!respuesta.datos?.id) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_EDICION);
  }

  revalidarPortal();
  return accionCorrecta(id ? "Los cambios de la edición se guardaron." : "La edición se agregó a la competencia.");
}

export async function cambiarEstadoEdicion(
  competencia: unknown,
  identificador: unknown,
  estado: unknown,
): Promise<ResultadoDeAccion> {
  const competenciaId = idDe(competencia);
  const id = idDe(identificador);
  const activa = activaDe(estado);
  if (!competenciaId || !id || activa === null) {
    return accionFallida(MENSAJE_SIN_EDICION);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/competencias/{competenciaId}/ediciones/{id}/estado", {
      ...conSesion(token),
      params: { path: { competenciaId, id } },
      body: { activa },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta(mensajeDeEstado("La edición", activa));
}

function cuerpoDeCategoria(datos: DatosDeCategoria & { nivel: "BASICA" | "AVANZADA" }) {
  return {
    nivel: datos.nivel,
    nombre: datos.nombre.trim(),
    descripcion: textoOpcional(datos.descripcion),
  };
}

export async function guardarCategoria(
  competencia: unknown,
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const competenciaId = idDe(competencia);
  const id = identificador === null ? null : idDe(identificador);
  if (!competenciaId || (identificador !== null && !id)) {
    return accionFallida(MENSAJE_SIN_CATEGORIA);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_CATEGORIA, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarCategoria(datos);
  const nivel = datos.nivel;
  if (hayErrores(errores) || !esNivelDeCategoria(nivel)) {
    return camposInvalidos(errores);
  }

  const cuerpo = cuerpoDeCategoria({ ...datos, nivel });
  const token = await tokenDeSesion();
  const respuesta = await intentar(
    id
      ? api.PUT("/api/competencias/{competenciaId}/categorias/{id}", {
          ...conSesion(token),
          params: { path: { competenciaId, id } },
          body: cuerpo,
        })
      : api.POST("/api/competencias/{competenciaId}/categorias", {
          ...conSesion(token),
          params: { path: { competenciaId } },
          body: cuerpo,
        }),
  );

  if (!respuesta.datos?.id) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_CATEGORIA);
  }

  revalidarPortal();
  return accionCorrecta(id ? "Los cambios de la categoría se guardaron." : "La categoría se agregó a la competencia.");
}

export async function cambiarEstadoCategoria(
  competencia: unknown,
  identificador: unknown,
  estado: unknown,
): Promise<ResultadoDeAccion> {
  const competenciaId = idDe(competencia);
  const id = idDe(identificador);
  const activa = activaDe(estado);
  if (!competenciaId || !id || activa === null) {
    return accionFallida(MENSAJE_SIN_CATEGORIA);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/competencias/{competenciaId}/categorias/{id}/estado", {
      ...conSesion(token),
      params: { path: { competenciaId, id } },
      body: { activa },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta(mensajeDeEstado("La categoría", activa));
}

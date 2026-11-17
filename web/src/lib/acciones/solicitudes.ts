"use server";

import { api } from "@/lib/api/cliente";
import { obtenerClub } from "@/lib/api/clubes";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import { listarEstudiantesActivos } from "@/lib/api/estudiantes";
import {
  listarCursosAbiertos,
  verificarSolicitud,
  type ControlDeVerificacion,
} from "@/lib/api/solicitudes";
import type { NivelCurso } from "@/lib/portal/filtros-cursos";
import { RUTA_SOLICITUDES } from "@/lib/portal/filtros-solicitudes";
import {
  opcionesDeCursos,
  opcionesDeEstudiantes,
  type OpcionDeCurso,
  type OpcionDeFormulario,
} from "@/lib/portal/opciones";
import {
  CAMPOS_DE_APROBACION,
  CAMPOS_DE_SOLICITUD,
  SOBRECUPO_AUTORIZADO,
  errorDeMotivo,
  esNivel,
  pideConocimientos,
  pideExperiencia,
  validarAprobacion,
  validarSolicitud,
} from "@/lib/portal/reglas-solicitudes";
import { hayErrores, idDe, leerCampos, textoDe } from "@/lib/portal/validacion";
import { falloConDatosAlDia, fueCorrecta, revalidarPortal, type PistaDeCampo } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

export type OpcionesDeClub =
  | { ok: true; estudiantes: OpcionDeFormulario[]; cursos: OpcionDeCurso[] }
  | { ok: false; mensaje: string };

export type VerificacionConsultada =
  | { ok: true; aprobable: boolean; controles: ControlDeVerificacion[] }
  | { ok: false; mensaje: string };

const LONGITUD_MAXIMA_DE_ENTRADA = 4000;
const MENSAJE_SIN_REGISTRO = "No se reconoce la solicitud que intentas modificar.";
const MENSAJE_SIN_OPCIONES =
  "No pudimos cargar los estudiantes y los cursos del club. Vuelve a elegirlo para reintentar.";
const MENSAJE_SIN_VERIFICACION =
  "No pudimos volver a verificar los requisitos. El servidor los comprobará al aprobar.";

const PISTAS_DE_REGISTRO: readonly PistaDeCampo[] = [
  { patron: /describir los conocimientos/i, campo: "conocimientos" },
  { patron: /describir la experiencia/i, campo: "experienciaPrevia" },
  { patron: /curso indicado|inscrito en ese curso|indique el curso/i, campo: "cursoId" },
  { patron: /estudiante indicado|estudiantes activos|ya tiene una solicitud/i, campo: "estudianteId" },
  { patron: /club indicado|clubes que coordina|el club está/i, campo: "clubId" },
];

const PISTAS_DE_APROBACION: readonly PistaDeCampo[] = [
  { patron: /sobrecupo/i, campo: "observacion" },
  { patron: /nivel asignado/i, campo: "nivelAsignado" },
  { patron: /curso asignado|no asigna ningún curso|cupo máximo de \d+ participantes|horario del curso/i, campo: "cursoId" },
];

const PISTAS_DE_MOTIVO: readonly PistaDeCampo[] = [{ patron: /motivo/i, campo: "motivo" }];

export async function crearSolicitud(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_SOLICITUD, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarSolicitud(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/solicitudes-inscripcion", {
      ...conSesion(token),
      body: {
        estudianteId: Number(datos.estudianteId),
        clubId: Number(datos.clubId),
        cursoId: datos.cursoId ? Number(datos.cursoId) : undefined,
        nivel: datos.nivel as NivelCurso,
        conocimientos: pideConocimientos(datos.nivel)
          ? datos.conocimientos.trim()
          : datos.conocimientos.trim() || undefined,
        experienciaPrevia: pideExperiencia(datos.nivel)
          ? datos.experienciaPrevia.trim()
          : datos.experienciaPrevia.trim() || undefined,
        motivacion: datos.motivacion.trim(),
      },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_REGISTRO);
  }

  revalidarPortal();
  return accionCorrecta(
    "La solicitud se registró y queda pendiente de revisión.",
    respuesta.datos.advertencias ?? [],
    `${RUTA_SOLICITUDES}/${respuesta.datos.id}`,
  );
}

export async function tomarSolicitudEnRevision(identificador: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/solicitudes-inscripcion/{id}/revision", {
      ...conSesion(token),
      params: { path: { id } },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta("La solicitud pasó a revisión. Comprueba los requisitos antes de resolverla.");
}

export async function aprobarSolicitud(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_APROBACION, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarAprobacion(datos);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const sobrecupo = datos.autorizarSobrecupo === SOBRECUPO_AUTORIZADO;
  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/solicitudes-inscripcion/{id}/aprobacion", {
      ...conSesion(token),
      params: { path: { id } },
      body: {
        nivelAsignado: datos.nivelAsignado as NivelCurso,
        cursoId: datos.cursoId ? Number(datos.cursoId) : undefined,
        observacion: datos.observacion.trim() || undefined,
        autorizarSobrecupo: sobrecupo ? true : undefined,
      },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta, PISTAS_DE_APROBACION);
  }

  revalidarPortal();
  return accionCorrecta(
    sobrecupo
      ? "La solicitud se aprobó con sobrecupo autorizado. El estudiante ya es integrante del club."
      : "La solicitud se aprobó. El estudiante ya es integrante del club.",
  );
}

async function resolverConMotivo(
  ruta: "/api/solicitudes-inscripcion/{id}/rechazo" | "/api/solicitudes-inscripcion/{id}/cancelacion",
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

export async function rechazarSolicitud(
  identificador: unknown,
  motivo: unknown,
): Promise<ResultadoDeAccion> {
  return resolverConMotivo(
    "/api/solicitudes-inscripcion/{id}/rechazo",
    identificador,
    motivo,
    "La solicitud se rechazó y el motivo quedó registrado.",
  );
}

export async function cancelarSolicitud(
  identificador: unknown,
  motivo: unknown,
): Promise<ResultadoDeAccion> {
  return resolverConMotivo(
    "/api/solicitudes-inscripcion/{id}/cancelacion",
    identificador,
    motivo,
    "La solicitud se canceló y el motivo quedó registrado.",
  );
}

export async function consultarOpcionesDeClub(identificador: unknown): Promise<OpcionesDeClub> {
  const clubId = idDe(identificador);
  if (!clubId) {
    return { ok: true, estudiantes: [], cursos: [] };
  }

  const club = await obtenerClub(clubId);
  if (club.estado !== "ok" || !club.datos.institucionId) {
    return { ok: false, mensaje: MENSAJE_SIN_OPCIONES };
  }

  const [estudiantes, cursos] = await Promise.all([
    listarEstudiantesActivos(club.datos.institucionId),
    listarCursosAbiertos(clubId),
  ]);

  return estudiantes && cursos
    ? { ok: true, estudiantes: opcionesDeEstudiantes(estudiantes), cursos: opcionesDeCursos(cursos) }
    : { ok: false, mensaje: MENSAJE_SIN_OPCIONES };
}

export async function consultarVerificacion(
  identificador: unknown,
  cursoElegido: unknown,
  nivelElegido: unknown,
): Promise<VerificacionConsultada> {
  const id = idDe(identificador);
  if (!id) {
    return { ok: false, mensaje: MENSAJE_SIN_REGISTRO };
  }

  const nivel = typeof nivelElegido === "string" && esNivel(nivelElegido) ? nivelElegido : null;
  const verificacion = await verificarSolicitud(id, idDe(cursoElegido), nivel);

  return verificacion
    ? {
        ok: true,
        aprobable: verificacion.aprobable ?? false,
        controles: verificacion.controles ?? [],
      }
    : { ok: false, mensaje: MENSAJE_SIN_VERIFICACION };
}

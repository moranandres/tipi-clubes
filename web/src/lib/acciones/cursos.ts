"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  ESTADOS_DE_CURSO,
  RUTA_CURSOS,
  type EstadoCurso,
  type ModalidadCurso,
  type NivelCurso,
} from "@/lib/portal/filtros-cursos";
import { LONGITUD_MAXIMA_DE_MOTIVO } from "@/lib/portal/reglas-clubes";
import {
  CAMPOS_DE_CURSO,
  CAMPOS_DE_HORARIO,
  usaEnlace,
  usaLugar,
  validarCurso,
  validarHorario,
  type DatosDeCurso,
  type TipoSesion,
} from "@/lib/portal/reglas-cursos";
import { hayErrores, idDe, leerCampos, textoDe } from "@/lib/portal/validacion";
import { falloDeApi, fueCorrecta, revalidarPortal, type PistaDeCampo } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 4000;
const MENSAJE_SIN_CURSO = "No se reconoce el curso que intentas modificar.";
const MENSAJE_SIN_HORARIO = "No se reconoce el horario que intentas modificar.";

const SIN_CONTEXTO = {
  inscritosActivos: 0,
  cupoDelClub: null,
  periodo: null,
};

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /con ese nombre/i, campo: "nombre" },
  { patron: /cupo/i, campo: "cupoMaximo" },
  { patron: /fecha de fin/i, campo: "fechaFin" },
  { patron: /fechas? /i, campo: "fechaInicio" },
  { patron: /híbrido requiere/i, campo: "lugar" },
  { patron: /enlace/i, campo: "enlaceVirtual" },
  { patron: /requiere el lugar/i, campo: "lugar" },
  { patron: /modalidad/i, campo: "modalidad" },
  { patron: /club/i, campo: "clubId" },
];

const PISTAS_DE_ESTADO: readonly PistaDeCampo[] = [{ patron: /motivo/i, campo: "motivo" }];

const PISTAS_DE_HORARIO: readonly PistaDeCampo[] = [
  { patron: /se cruza/i, campo: "horaInicio" },
  { patron: /hora de fin|debe durar/i, campo: "horaFin" },
  { patron: /tipo de sesión/i, campo: "tipoSesion" },
];

function cuerpoDeCurso(datos: DatosDeCurso) {
  return {
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion.trim() || undefined,
    nivel: datos.nivel as NivelCurso,
    modalidad: datos.modalidad as ModalidadCurso,
    lugar: usaLugar(datos.modalidad) ? datos.lugar.trim() : undefined,
    enlaceVirtual: usaEnlace(datos.modalidad) ? datos.enlaceVirtual.trim() : undefined,
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
    duracionHoras: datos.duracionHoras.trim() ? Number(datos.duracionHoras) : undefined,
    cupoMaximo: Number(datos.cupoMaximo),
  };
}

export async function crearCurso(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_CURSO, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarCurso(datos, { ...SIN_CONTEXTO, esNuevo: true });
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/cursos", {
      ...conSesion(token),
      body: { ...cuerpoDeCurso(datos), clubId: Number(datos.clubId) },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta(
    "El curso se creó.",
    [],
    `${RUTA_CURSOS}/${respuesta.datos.id}?aviso=creado`,
  );
}

export async function actualizarCurso(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_CURSO);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_CURSO, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarCurso(datos, { ...SIN_CONTEXTO, esNuevo: false });
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/cursos/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: cuerpoDeCurso(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los cambios del curso se guardaron.");
}

export async function cambiarEstadoDeCurso(
  identificador: unknown,
  estadoNuevo: unknown,
  motivoEscrito: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_CURSO);
  }
  if (!ESTADOS_DE_CURSO.includes(estadoNuevo as EstadoCurso)) {
    return accionFallida("Elige el nuevo estado del curso.");
  }

  const estado = estadoNuevo as EstadoCurso;
  const motivo = textoDe(motivoEscrito, LONGITUD_MAXIMA_DE_ENTRADA).trim();
  if (motivo.length > LONGITUD_MAXIMA_DE_MOTIVO) {
    return camposInvalidos({
      motivo: `El motivo admite hasta ${LONGITUD_MAXIMA_DE_MOTIVO} caracteres.`,
    });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/cursos/{id}/estado", {
      ...conSesion(token),
      params: { path: { id } },
      body: { estado, motivo: motivo || undefined },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloDeApi(respuesta, PISTAS_DE_ESTADO);
  }

  revalidarPortal();
  return accionCorrecta("El estado del curso se actualizó.");
}

export async function eliminarCurso(identificador: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_CURSO);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.DELETE("/api/cursos/{id}", { ...conSesion(token), params: { path: { id } } }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloDeApi(respuesta);
  }

  revalidarPortal();
  return accionCorrecta("El curso se eliminó.", [], `${RUTA_CURSOS}?aviso=curso-eliminado`);
}

export async function guardarHorario(
  identificadorDeCurso: unknown,
  identificadorDeHorario: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const cursoId = idDe(identificadorDeCurso);
  if (!cursoId) {
    return accionFallida(MENSAJE_SIN_CURSO);
  }

  const esNuevo = identificadorDeHorario === null || identificadorDeHorario === undefined;
  const horarioId = esNuevo ? null : idDe(identificadorDeHorario);
  if (!esNuevo && !horarioId) {
    return accionFallida(MENSAJE_SIN_HORARIO);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_HORARIO, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarHorario(datos, { otros: [] });
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const cuerpo = {
    diaSemana: Number(datos.diaSemana),
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
    tipoSesion: datos.tipoSesion as TipoSesion,
  };

  const token = await tokenDeSesion();
  const respuesta = horarioId
    ? await intentar(
        api.PUT("/api/cursos/{cursoId}/horarios/{horarioId}", {
          ...conSesion(token),
          params: { path: { cursoId, horarioId } },
          body: cuerpo,
        }),
      )
    : await intentar(
        api.POST("/api/cursos/{cursoId}/horarios", {
          ...conSesion(token),
          params: { path: { cursoId } },
          body: cuerpo,
        }),
      );

  if (!respuesta.datos) {
    return falloDeApi(respuesta, PISTAS_DE_HORARIO);
  }

  revalidarPortal();
  return accionCorrecta(
    horarioId ? "El horario se actualizó." : "El horario se agregó al curso.",
    respuesta.datos.advertencias ?? [],
  );
}

export async function eliminarHorario(
  identificadorDeCurso: unknown,
  identificadorDeHorario: unknown,
): Promise<ResultadoDeAccion> {
  const cursoId = idDe(identificadorDeCurso);
  const horarioId = idDe(identificadorDeHorario);
  if (!cursoId) {
    return accionFallida(MENSAJE_SIN_CURSO);
  }
  if (!horarioId) {
    return accionFallida(MENSAJE_SIN_HORARIO);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.DELETE("/api/cursos/{cursoId}/horarios/{horarioId}", {
      ...conSesion(token),
      params: { path: { cursoId, horarioId } },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloDeApi(respuesta);
  }

  revalidarPortal();
  return accionCorrecta("El horario se eliminó.");
}

"use server";

import { api } from "@/lib/api/cliente";
import { listarDocentesActivos } from "@/lib/api/clubes";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import { ESTADOS_DE_CLUB, RUTA_CLUBES, type EstadoClub } from "@/lib/portal/filtros-clubes";
import { opcionesDeDocentes, type OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_CLUB,
  LONGITUD_MAXIMA_DE_MOTIVO,
  validarClub,
  type DatosDeClub,
} from "@/lib/portal/reglas-clubes";
import { hayErrores, idDe, leerCampos, textoDe } from "@/lib/portal/validacion";
import { falloDeApi, fueCorrecta, revalidarPortal, type PistaDeCampo } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

export type ResultadoDeDocentes =
  | { ok: true; docentes: OpcionDeFormulario[] }
  | { ok: false; mensaje: string };

const LONGITUD_MAXIMA_DE_ENTRADA = 4000;
const MENSAJE_SIN_REGISTRO = "No se reconoce el club que intentas modificar.";
const MENSAJE_SIN_DOCENTES =
  "No pudimos cargar los docentes de la institución. Vuelve a elegirla para reintentar.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /con ese nombre/i, campo: "nombre" },
  { patron: /cupo/i, campo: "cupoMaximo" },
  { patron: /docente/i, campo: "docenteId" },
  { patron: /hora de fin/i, campo: "horaFin" },
  { patron: /institución/i, campo: "institucionId" },
  { patron: /período/i, campo: "periodoId" },
];

const PISTAS_DE_ESTADO: readonly PistaDeCampo[] = [{ patron: /motivo/i, campo: "motivo" }];

function datosComunes(datos: DatosDeClub) {
  return {
    docenteId: Number(datos.docenteId),
    nombre: datos.nombre.trim(),
    objetivo: datos.objetivo.trim(),
    diaSemana: datos.diaSemana ? Number(datos.diaSemana) : undefined,
    horaInicio: datos.horaInicio || undefined,
    horaFin: datos.horaFin || undefined,
    lugar: datos.lugar.trim() || undefined,
    cupoMaximo: Number(datos.cupoMaximo),
  };
}

export async function crearClub(entrada: unknown): Promise<ResultadoDeAccion> {
  const datos = leerCampos(entrada, CAMPOS_DE_CLUB, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarClub(datos, { esNuevo: true, integrantesActivos: 0 });
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/clubes", {
      ...conSesion(token),
      body: {
        ...datosComunes(datos),
        institucionId: Number(datos.institucionId),
        periodoId: Number(datos.periodoId),
      },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta(
    "El club se creó.",
    [],
    `${RUTA_CLUBES}/${respuesta.datos.id}?aviso=creado`,
  );
}

export async function actualizarClub(
  identificador: unknown,
  entrada: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }

  const datos = leerCampos(entrada, CAMPOS_DE_CLUB, LONGITUD_MAXIMA_DE_ENTRADA);
  const errores = validarClub(datos, { esNuevo: false, integrantesActivos: 0 });
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/clubes/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: datosComunes(datos),
    }),
  );

  if (!respuesta.datos) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los cambios del club se guardaron.");
}

export async function cambiarEstadoDeClub(
  identificador: unknown,
  estadoNuevo: unknown,
  motivoEscrito: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_REGISTRO);
  }
  if (!ESTADOS_DE_CLUB.includes(estadoNuevo as EstadoClub)) {
    return accionFallida("Elige el nuevo estado del club.");
  }

  const estado = estadoNuevo as EstadoClub;
  const motivo = textoDe(motivoEscrito, LONGITUD_MAXIMA_DE_ENTRADA).trim();
  if (motivo.length > LONGITUD_MAXIMA_DE_MOTIVO) {
    return camposInvalidos({
      motivo: `El motivo admite hasta ${LONGITUD_MAXIMA_DE_MOTIVO} caracteres.`,
    });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/clubes/{id}/estado", {
      ...conSesion(token),
      params: { path: { id } },
      body: { estado, motivo: motivo || undefined },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloDeApi(respuesta, PISTAS_DE_ESTADO);
  }

  revalidarPortal();
  return accionCorrecta("El estado del club se actualizó.");
}

export async function consultarDocentesDeInstitucion(
  identificador: unknown,
): Promise<ResultadoDeDocentes> {
  const institucionId = idDe(identificador);
  if (!institucionId) {
    return { ok: true, docentes: [] };
  }

  const docentes = await listarDocentesActivos(institucionId);
  return docentes
    ? { ok: true, docentes: opcionesDeDocentes(docentes) }
    : { ok: false, mensaje: MENSAJE_SIN_DOCENTES };
}

"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import { rutaDeAvance } from "@/lib/portal/filtros-avances";
import {
  CAMPOS_DE_AVANCE,
  LIMITES_DE_AVANCE,
  competenciasValidas,
  errorDeMotivoDeAnulacion,
  esAlcanceDeAvance,
  validarAvance,
  type CompetenciaEvaluada,
  type DatosDeAvance,
} from "@/lib/portal/reglas-avances";
import { enteroDe, hayErrores, idDe, leerCampos, textoDe, textoOpcional } from "@/lib/portal/validacion";
import { falloConDatosAlDia, falloDeApi, revalidarPortal, type PistaDeCampo } from "./fallo";
import { accionCorrecta, accionFallida, camposInvalidos, type ResultadoDeAccion } from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 2100;
const MENSAJE_SIN_AVANCE = "No se reconoce el avance que intentas modificar.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /competencia/i, campo: "competencias" },
  { patron: /porcentaje/i, campo: "porcentajeAvance" },
  { patron: /Ya existe un avance|fecha/i, campo: "fecha" },
  { patron: /actividad/i, campo: "actividadId" },
  { patron: /estudiante/i, campo: "estudianteId" },
  { patron: /proyecto/i, campo: "proyectoId" },
  { patron: /resultados/i, campo: "resultados" },
];

type Nivel = "INICIAL" | "EN_PROCESO" | "LOGRADO" | "DESTACADO";

function contenidoDe(datos: DatosDeAvance, competencias: CompetenciaEvaluada[]) {
  return {
    actividadId: idDe(datos.actividadId) ?? undefined,
    resultados: datos.resultados.trim(),
    logros: textoOpcional(datos.logros),
    dificultades: textoOpcional(datos.dificultades),
    proximosPasos: textoOpcional(datos.proximosPasos),
    porcentajeAvance: datos.alcance === "PROYECTO" ? (enteroDe(datos.porcentajeAvance) ?? undefined) : undefined,
    competencias: competencias.map((competencia) => ({
      contenidoId: competencia.contenidoId,
      nivel: competencia.nivel as Nivel,
    })),
  };
}

function leer(entrada: unknown, evaluadas: unknown, exigeFecha: boolean) {
  const datos = leerCampos(entrada, CAMPOS_DE_AVANCE, LONGITUD_MAXIMA_DE_ENTRADA);
  const competencias = competenciasValidas(evaluadas);
  const errores = validarAvance(datos, competencias, {
    periodo: null,
    hoy: null,
    inicioDelProyecto: null,
    actividad: null,
    exigeFecha,
  });
  return { datos, competencias, errores };
}

export async function registrarAvance(entrada: unknown, evaluadas: unknown): Promise<ResultadoDeAccion> {
  const { datos, competencias, errores } = leer(entrada, evaluadas, false);
  const clubId = idDe(datos.clubId);
  if (hayErrores(errores) || !clubId || !esAlcanceDeAvance(datos.alcance)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/avances", {
      ...conSesion(token),
      body: {
        clubId,
        alcance: datos.alcance,
        estudianteId: datos.alcance === "ESTUDIANTE" ? (idDe(datos.estudianteId) ?? undefined) : undefined,
        proyectoId: datos.alcance === "PROYECTO" ? (idDe(datos.proyectoId) ?? undefined) : undefined,
        fecha: datos.fecha || undefined,
        ...contenidoDe(datos, competencias),
      },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloDeApi(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("El avance quedó registrado.", [], rutaDeAvance(respuesta.datos.id, "registrado"));
}

export async function actualizarAvance(
  identificador: unknown,
  entrada: unknown,
  evaluadas: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_AVANCE);
  }

  const { datos, competencias, errores } = leer(entrada, evaluadas, true);
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/avances/{id}", {
      ...conSesion(token),
      params: { path: { id } },
      body: { fecha: datos.fecha, ...contenidoDe(datos, competencias) },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los cambios del avance se guardaron.");
}

export async function anularAvance(identificador: unknown, motivoEscrito: unknown): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_AVANCE);
  }

  const motivo = textoDe(motivoEscrito, LIMITES_DE_AVANCE.motivo + 1).trim();
  const error = errorDeMotivoDeAnulacion(motivo);
  if (error) {
    return camposInvalidos({ motivo: error });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/avances/{id}/anulacion", {
      ...conSesion(token),
      params: { path: { id } },
      body: { motivo },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, [{ patron: /motivo/i, campo: "motivo" }]);
  }

  revalidarPortal();
  return accionCorrecta("El avance quedó anulado.", [], rutaDeAvance(id, "anulado"));
}

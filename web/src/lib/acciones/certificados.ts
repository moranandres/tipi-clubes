"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  esTipoDeCertificado,
  esTipoDeCurso,
  rutaDeCertificado,
} from "@/lib/portal/filtros-certificados";
import {
  LIMITES_DE_ANULACION,
  NOMBRES_DE_RESULTADO_DE_CURSO,
  esResultadoDeCurso,
} from "@/lib/portal/reglas-certificados";
import { errorDeMotivo } from "@/lib/portal/reglas-solicitudes";
import { idDe, textoDe } from "@/lib/portal/validacion";
import { falloConDatosAlDia, revalidarPortal } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

const MENSAJE_SIN_ORIGEN = "No se reconoce el registro que intentas certificar.";
const MENSAJE_SIN_CERTIFICADO = "No se reconoce el certificado que intentas anular.";
const MENSAJE_SIN_INSCRIPCION = "No se reconoce la inscripción en el curso.";

export async function emitirCertificado(
  tipoElegido: unknown,
  origen: unknown,
): Promise<ResultadoDeAccion> {
  const origenId = idDe(origen);
  if (!esTipoDeCertificado(tipoElegido) || !origenId) {
    return accionFallida(MENSAJE_SIN_ORIGEN);
  }

  const deCurso = esTipoDeCurso(tipoElegido);
  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/certificados", {
      ...conSesion(token),
      body: deCurso
        ? { tipo: tipoElegido, inscripcionCursoId: origenId }
        : { tipo: tipoElegido, participacionId: origenId },
    }),
  );

  if (!respuesta.datos?.id) {
    return falloConDatosAlDia(respuesta);
  }

  revalidarPortal();
  return accionCorrecta(
    `Se emitió el certificado ${respuesta.datos.codigoVerificacion ?? ""}.`.replace(" .", "."),
    [],
    rutaDeCertificado(respuesta.datos.id, "emitido"),
  );
}

export async function anularCertificado(
  identificador: unknown,
  motivoEscrito: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_CERTIFICADO);
  }

  const motivo = textoDe(motivoEscrito, LIMITES_DE_ANULACION.motivoMaximo + 1).trim();
  const error = errorDeMotivo(motivo, LIMITES_DE_ANULACION.motivoMinimo);
  if (error) {
    return camposInvalidos({ motivo: error });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/certificados/{id}/anulacion", {
      ...conSesion(token),
      params: { path: { id } },
      body: { motivo },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, [{ patron: /motivo/i, campo: "motivo" }]);
  }

  revalidarPortal();
  return accionCorrecta("El certificado quedó anulado.", [], rutaDeCertificado(id, "anulado"));
}

export async function registrarResultadoDeCurso(
  identificador: unknown,
  resultadoElegido: unknown,
): Promise<ResultadoDeAccion> {
  const id = idDe(identificador);
  if (!id) {
    return accionFallida(MENSAJE_SIN_INSCRIPCION);
  }
  const resultado = resultadoElegido === "" ? undefined : resultadoElegido;
  if (resultado !== undefined && !esResultadoDeCurso(resultado)) {
    return camposInvalidos({ resultado: "Elige Aprobado o No aprobado." });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PATCH("/api/inscripciones-curso/{id}/resultado", {
      ...conSesion(token),
      params: { path: { id } },
      body: { resultado },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, [{ patron: /resultado|aprobaci/i, campo: "resultado" }]);
  }

  revalidarPortal();
  const avisos = respuesta.datos.avisos ?? [];
  if (avisos.length > 0 && avisos[0].startsWith("No había cambios")) {
    return accionCorrecta(avisos[0]);
  }
  return accionCorrecta(
    resultado
      ? `Resultado guardado: ${NOMBRES_DE_RESULTADO_DE_CURSO[resultado]}.`
      : "Se quitó el resultado registrado.",
  );
}

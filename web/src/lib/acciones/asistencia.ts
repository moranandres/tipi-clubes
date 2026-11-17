"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  CAMPO_DE_MOTIVO,
  LIMITES_DE_ASISTENCIA,
  hayProblemas,
  registrosDe,
  validarPlanilla,
} from "@/lib/portal/reglas-asistencia";
import { idDe, textoDe } from "@/lib/portal/validacion";
import { falloConDatosAlDia, revalidarPortal, type PistaDeCampo } from "./fallo";
import { accionCorrecta, accionFallida, camposInvalidos, type ResultadoDeAccion } from "./resultado";

const MENSAJE_SIN_SESION = "No se reconoce la sesión cuya asistencia intentas registrar.";
const CAMPO_GENERAL = "registros";

const PISTAS: readonly PistaDeCampo[] = [{ patron: /motivo de la corrección/i, campo: CAMPO_DE_MOTIVO }];

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

export async function registrarAsistencia(
  identificador: unknown,
  entrada: unknown,
  motivoEscrito: unknown,
): Promise<ResultadoDeAccion> {
  const actividadId = idDe(identificador);
  if (!actividadId) {
    return accionFallida(MENSAJE_SIN_SESION);
  }

  const registros = registrosDe(entrada).filter((registro) => registro.estado);
  const motivo = textoDe(motivoEscrito, LIMITES_DE_ASISTENCIA.motivo + 1).trim();
  const validacion = validarPlanilla(registros, new Map(), motivo);
  if (hayProblemas(validacion)) {
    const primero = Object.values(validacion.porEstudiante)[0];
    return camposInvalidos({
      [CAMPO_GENERAL]: validacion.general ?? primero,
      [CAMPO_DE_MOTIVO]: validacion.motivo,
    });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/actividades/{id}/asistencia", {
      ...conSesion(token),
      params: { path: { id: actividadId } },
      body: {
        registros: registros.map((registro) => ({
          estudianteId: registro.estudianteId,
          estado: registro.estado ?? "PRESENTE",
          observacion: registro.observacion.trim() || undefined,
        })),
        motivoCorreccion: motivo || undefined,
      },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS);
  }

  revalidarPortal();
  const conteo = respuesta.datos.conteo;
  const pendientes = respuesta.datos.pendientes ?? 0;
  const partes = [
    plural(conteo?.presentes ?? 0, "presente", "presentes"),
    plural(conteo?.atrasados ?? 0, "atrasado", "atrasados"),
    plural(conteo?.ausentes ?? 0, "ausente", "ausentes"),
    plural(conteo?.justificados ?? 0, "justificado", "justificados"),
  ];
  return accionCorrecta(
    `La asistencia quedó guardada: ${partes.join(", ")}.`,
    pendientes > 0
      ? [`Quedan ${plural(pendientes, "estudiante", "estudiantes")} sin registrar en esta sesión.`]
      : [],
  );
}

"use server";

import { api } from "@/lib/api/cliente";
import { conSesion, intentar, tokenDeSesion } from "@/lib/api/con-sesion";
import {
  CAMPOS_DE_EVIDENCIA,
  LIMITES_DE_EVIDENCIA,
  LONGITUD_DE_FIRMA,
  MARCA_AFIRMATIVA,
  errorDeFirma,
  esTipoDeEvidencia,
  idsDeEstudiantes,
  relacionaEstudiantes,
  usaArchivo,
  usaEnlace,
  validarEvidencia,
  type DatosDeEvidencia,
} from "@/lib/portal/reglas-evidencias";
import { hayErrores, idDe, leerCampos, textoDe } from "@/lib/portal/validacion";
import { falloConDatosAlDia, fueCorrecta, revalidarPortal, type PistaDeCampo } from "./fallo";
import {
  accionCorrecta,
  accionFallida,
  camposInvalidos,
  type ResultadoDeAccion,
} from "./resultado";

const LONGITUD_MAXIMA_DE_ENTRADA = 1100;
const CAMPO_DE_ARCHIVO = "archivo";
const CAMPO_DE_ESTUDIANTES = "estudianteIds";
const MENSAJE_SIN_SESION = "No se reconoce la sesión en la que intentas registrar la evidencia.";
const MENSAJE_SIN_EVIDENCIA = "No se reconoce la evidencia que intentas modificar.";

const PISTAS: readonly PistaDeCampo[] = [
  { patron: /archivo|formato|tamaño|imagen supera|pdf|píxeles|dañad/i, campo: CAMPO_DE_ARCHIVO },
  { patron: /enlace/i, campo: "url" },
  { patron: /estudiante|fotografía|identificables|autorización/i, campo: CAMPO_DE_ESTUDIANTES },
  { patron: /fecha/i, campo: "fechaEvidencia" },
  { patron: /título/i, campo: "titulo" },
];

function leerDatos(formulario: FormData): DatosDeEvidencia {
  return Object.fromEntries(
    CAMPOS_DE_EVIDENCIA.map((campo) => [
      campo,
      textoDe(formulario.get(campo), LONGITUD_MAXIMA_DE_ENTRADA),
    ]),
  ) as DatosDeEvidencia;
}

function archivoDe(formulario: FormData): File | null {
  const valor = formulario.get(CAMPO_DE_ARCHIVO);
  return valor instanceof File && valor.size > 0 ? valor : null;
}

export async function registrarEvidencia(
  identificador: unknown,
  formulario: unknown,
): Promise<ResultadoDeAccion> {
  const actividadId = idDe(identificador);
  if (!actividadId || !(formulario instanceof FormData)) {
    return accionFallida(MENSAJE_SIN_SESION);
  }

  const datos = leerDatos(formulario);
  const estudiantes = relacionaEstudiantes(datos.tipo)
    ? idsDeEstudiantes(formulario.getAll(CAMPO_DE_ESTUDIANTES))
    : [];
  const archivo = usaArchivo(datos.tipo, datos.forma) ? archivoDe(formulario) : null;
  const errores = validarEvidencia(
    datos,
    estudiantes,
    archivo ? { nombre: archivo.name, tipo: archivo.type, tamano: archivo.size } : null,
    { esNueva: true, fechaActividad: null, hoy: null, autorizados: null },
  );
  if (archivo && !errores.archivo && esTipoDeEvidencia(datos.tipo)) {
    const firma = new Uint8Array(await archivo.slice(0, LONGITUD_DE_FIRMA).arrayBuffer());
    errores.archivo = errorDeFirma(datos.tipo, firma);
  }
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const cuerpo = new FormData();
  cuerpo.append("tipo", datos.tipo);
  cuerpo.append("titulo", datos.titulo.trim());
  cuerpo.append("descripcion", datos.descripcion.trim());
  if (datos.fechaEvidencia) {
    cuerpo.append("fechaEvidencia", datos.fechaEvidencia);
  }
  if (usaEnlace(datos.tipo, datos.forma)) {
    cuerpo.append("url", datos.url.trim());
  }
  for (const estudianteId of estudiantes) {
    cuerpo.append(CAMPO_DE_ESTUDIANTES, String(estudianteId));
  }
  if (datos.tipo === "FOTOGRAFIA" && datos.sinEstudiantes === MARCA_AFIRMATIVA) {
    cuerpo.append("sinEstudiantesIdentificables", "true");
  }
  if (archivo) {
    cuerpo.append(CAMPO_DE_ARCHIVO, archivo, archivo.name);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/actividades/{id}/evidencias", {
      ...conSesion(token),
      params: { path: { id: actividadId } },
      body: {
        tipo: datos.tipo,
        titulo: datos.titulo.trim(),
        descripcion: datos.descripcion.trim(),
      },
      bodySerializer: () => cuerpo,
    }),
  );

  if (!respuesta.datos?.id) {
    return falloConDatosAlDia(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("La evidencia quedó registrada en la sesión.");
}

export async function actualizarEvidencia(
  identificador: unknown,
  tipoActual: unknown,
  entrada: unknown,
  estudiantesElegidos: unknown,
): Promise<ResultadoDeAccion> {
  const evidenciaId = idDe(identificador);
  const tipo = typeof tipoActual === "string" ? tipoActual : "";
  if (!evidenciaId || !esTipoDeEvidencia(tipo)) {
    return accionFallida(MENSAJE_SIN_EVIDENCIA);
  }

  const datos = { ...leerCampos(entrada, CAMPOS_DE_EVIDENCIA, LONGITUD_MAXIMA_DE_ENTRADA), tipo };
  const estudiantes = relacionaEstudiantes(tipo) ? idsDeEstudiantes(estudiantesElegidos) : [];
  const errores = validarEvidencia(datos, estudiantes, null, {
    esNueva: false,
    fechaActividad: null,
    hoy: null,
    autorizados: null,
  });
  if (hayErrores(errores)) {
    return camposInvalidos(errores);
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.PUT("/api/evidencias/{id}", {
      ...conSesion(token),
      params: { path: { id: evidenciaId } },
      body: {
        titulo: datos.titulo.trim(),
        descripcion: datos.descripcion.trim(),
        fechaEvidencia: datos.fechaEvidencia,
        estudianteIds: estudiantes,
        sinEstudiantesIdentificables: tipo === "FOTOGRAFIA" && datos.sinEstudiantes === MARCA_AFIRMATIVA,
      },
    }),
  );

  if (!respuesta.datos) {
    return falloConDatosAlDia(respuesta, PISTAS);
  }

  revalidarPortal();
  return accionCorrecta("Los cambios de la evidencia se guardaron.");
}

export async function retirarEvidencia(
  identificador: unknown,
  motivoEscrito: unknown,
): Promise<ResultadoDeAccion> {
  const evidenciaId = idDe(identificador);
  if (!evidenciaId) {
    return accionFallida(MENSAJE_SIN_EVIDENCIA);
  }

  const motivo = textoDe(motivoEscrito, LIMITES_DE_EVIDENCIA.motivo + 1).trim();
  if (!motivo) {
    return camposInvalidos({ motivo: "Escribe el motivo del retiro." });
  }
  if (motivo.length > LIMITES_DE_EVIDENCIA.motivo) {
    return camposInvalidos({ motivo: `Admite hasta ${LIMITES_DE_EVIDENCIA.motivo} caracteres.` });
  }

  const token = await tokenDeSesion();
  const respuesta = await intentar(
    api.POST("/api/evidencias/{id}/retiro", {
      ...conSesion(token),
      params: { path: { id: evidenciaId } },
      body: { motivo },
    }),
  );

  if (!fueCorrecta(respuesta)) {
    return falloConDatosAlDia(respuesta, [{ patron: /motivo/i, campo: "motivo" }]);
  }

  revalidarPortal();
  return accionCorrecta("La evidencia se retiró y su archivo se eliminó del repositorio.");
}

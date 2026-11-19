import { fechaDeFiltro, rangoOrdenado } from "./filtros-actividades";
import {
  enteroPositivo,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ENTIDADES_DE_AUDITORIA = {
  ACTIVIDAD: "Actividad",
  ASISTENCIA: "Asistencia",
  AVANCE: "Avance",
  CATEGORIA_COMPETENCIA: "Categoría de competencia",
  CERTIFICADO: "Certificado",
  CLUB: "Club",
  COMPETENCIA: "Competencia",
  CONTENIDO: "Contenido",
  CURSO: "Curso",
  DOCENTE: "Docente",
  EDICION_COMPETENCIA: "Edición de competencia",
  ESTUDIANTE: "Estudiante",
  EVIDENCIA: "Evidencia",
  INSCRIPCION_CURSO: "Inscripción en curso",
  INSTITUCION: "Institución",
  PARAMETROS_SEGUIMIENTO: "Parámetros de seguimiento",
  PARTICIPACION_COMPETENCIA: "Participación en competencia",
  PERIODO: "Período académico",
  PROYECTO: "Proyecto",
  SOLICITUD_INSCRIPCION: "Solicitud de inscripción",
  SOLICITUD_RETIRO: "Solicitud de retiro",
  USUARIO: "Usuario",
} as const;

export type EntidadDeAuditoria = keyof typeof ENTIDADES_DE_AUDITORIA;

type DefinicionDeAccion = readonly [codigo: string, entidad: EntidadDeAuditoria | null, nombre: string];

const DEFINICIONES_DE_ACCION: readonly DefinicionDeAccion[] = [
  ["LOGIN_EXITOSO", null, "Inicio de sesión correcto"],
  ["LOGIN_FALLIDO", null, "Inicio de sesión fallido"],
  ["CUENTA_BLOQUEADA", null, "Cuenta bloqueada por intentos fallidos"],
  ["RECUPERACION_SOLICITADA", null, "Recuperación de contraseña solicitada"],
  ["PASSWORD_RECUPERADA", null, "Contraseña recuperada por correo"],
  ["LOGOUT", "USUARIO", "Cierre de sesión"],
  ["PASSWORD_CAMBIADA", "USUARIO", "Contraseña cambiada"],
  ["PASSWORD_RESTABLECIDA", "USUARIO", "Contraseña temporal asignada"],
  ["SESIONES_CERRADAS", "USUARIO", "Sesiones cerradas"],
  ["USUARIO_CREADO", "USUARIO", "Cuenta creada"],
  ["USUARIO_ACTUALIZADO", "USUARIO", "Cuenta actualizada"],
  ["USUARIO_ACTIVADO", "USUARIO", "Cuenta activada"],
  ["USUARIO_DESACTIVADO", "USUARIO", "Cuenta desactivada"],
  ["INSTITUCION_CREADA", "INSTITUCION", "Institución registrada"],
  ["INSTITUCION_ACTUALIZADA", "INSTITUCION", "Institución actualizada"],
  ["INSTITUCION_CONTACTO_ACTUALIZADO", "INSTITUCION", "Contacto de la institución actualizado"],
  ["INSTITUCION_RESPONSABLE_ASIGNADO", "INSTITUCION", "Responsable institucional asignado"],
  ["PERIODO_CREADO", "PERIODO", "Período creado"],
  ["PERIODO_ACTUALIZADO", "PERIODO", "Período actualizado"],
  ["PERIODO_ACTIVADO", "PERIODO", "Período marcado como vigente"],
  ["DOCENTE_CREADO", "DOCENTE", "Docente registrado"],
  ["DOCENTE_ACTUALIZADO", "DOCENTE", "Docente actualizado"],
  ["DOCENTE_ACTIVADO", "DOCENTE", "Docente activado"],
  ["DOCENTE_DESACTIVADO", "DOCENTE", "Docente desactivado"],
  ["CLUB_CREADO", "CLUB", "Club creado"],
  ["CLUB_ACTUALIZADO", "CLUB", "Club actualizado"],
  ["CLUB_ESTADO_CAMBIADO", "CLUB", "Estado del club cambiado"],
  ["CURSO_CREADO", "CURSO", "Curso creado"],
  ["CURSO_ACTUALIZADO", "CURSO", "Curso actualizado"],
  ["CURSO_ESTADO_CAMBIADO", "CURSO", "Estado del curso cambiado"],
  ["CURSO_ELIMINADO", "CURSO", "Curso eliminado"],
  ["HORARIO_CREADO", "CURSO", "Horario agregado"],
  ["HORARIO_ACTUALIZADO", "CURSO", "Horario actualizado"],
  ["HORARIO_ELIMINADO", "CURSO", "Horario eliminado"],
  ["RESULTADO_CURSO_REGISTRADO", "INSCRIPCION_CURSO", "Resultado final del curso registrado"],
  ["ESTUDIANTE_CREADO", "ESTUDIANTE", "Estudiante registrado"],
  ["ESTUDIANTE_ACTUALIZADO", "ESTUDIANTE", "Estudiante actualizado"],
  ["ESTUDIANTE_ESTADO_CAMBIADO", "ESTUDIANTE", "Estado del estudiante cambiado"],
  ["ESTUDIANTE_ELIMINADO", "ESTUDIANTE", "Estudiante eliminado"],
  ["ESTUDIANTE_ANONIMIZADO", "ESTUDIANTE", "Datos personales del estudiante anonimizados"],
  ["AUTORIZACION_ACTUALIZADA", "ESTUDIANTE", "Autorización actualizada"],
  ["AUTORIZACION_DOCUMENTO_CARGADO", "ESTUDIANTE", "Documento de autorización cargado"],
  ["AUTORIZACION_DOCUMENTO_DESCARGADO", "ESTUDIANTE", "Documento de autorización descargado"],
  ["SOLICITUD_INSCRIPCION_CREADA", "SOLICITUD_INSCRIPCION", "Solicitud de inscripción registrada"],
  ["SOLICITUD_INSCRIPCION_EN_REVISION", "SOLICITUD_INSCRIPCION", "Solicitud tomada en revisión"],
  ["SOLICITUD_INSCRIPCION_APROBADA", "SOLICITUD_INSCRIPCION", "Solicitud de inscripción aprobada"],
  ["SOLICITUD_INSCRIPCION_RECHAZADA", "SOLICITUD_INSCRIPCION", "Solicitud de inscripción rechazada"],
  ["SOLICITUD_INSCRIPCION_CANCELADA", "SOLICITUD_INSCRIPCION", "Solicitud de inscripción cancelada"],
  ["SOLICITUD_RETIRO_CREADA", "SOLICITUD_RETIRO", "Solicitud de retiro registrada"],
  ["SOLICITUD_RETIRO_APROBADA", "SOLICITUD_RETIRO", "Solicitud de retiro aprobada"],
  ["SOLICITUD_RETIRO_RECHAZADA", "SOLICITUD_RETIRO", "Solicitud de retiro rechazada"],
  ["SOLICITUD_RETIRO_CANCELADA", "SOLICITUD_RETIRO", "Solicitud de retiro cancelada"],
  ["CONTENIDO_CREADO", "CONTENIDO", "Contenido creado"],
  ["CONTENIDO_ACTUALIZADO", "CONTENIDO", "Contenido actualizado"],
  ["CONTENIDO_ESTADO_CAMBIADO", "CONTENIDO", "Estado del contenido cambiado"],
  ["ACTIVIDAD_CREADA", "ACTIVIDAD", "Actividad planificada"],
  ["ACTIVIDAD_ACTUALIZADA", "ACTIVIDAD", "Actividad actualizada"],
  ["ACTIVIDAD_REPROGRAMADA", "ACTIVIDAD", "Actividad reprogramada"],
  ["ACTIVIDAD_EJECUTADA", "ACTIVIDAD", "Actividad ejecutada"],
  ["ACTIVIDAD_EJECUCION_CORREGIDA", "ACTIVIDAD", "Ejecución de la actividad corregida"],
  ["ACTIVIDAD_CANCELADA", "ACTIVIDAD", "Actividad cancelada"],
  ["ACTIVIDAD_ELIMINADA", "ACTIVIDAD", "Actividad eliminada"],
  ["ASISTENCIA_REGISTRADA", "ACTIVIDAD", "Asistencia registrada"],
  ["ASISTENCIA_CORREGIDA", "ASISTENCIA", "Asistencia corregida"],
  ["EVIDENCIA_REGISTRADA", "EVIDENCIA", "Evidencia cargada"],
  ["EVIDENCIA_ACTUALIZADA", "EVIDENCIA", "Evidencia actualizada"],
  ["EVIDENCIA_RETIRADA", "EVIDENCIA", "Evidencia retirada"],
  ["EVIDENCIA_DESCARGADA", "EVIDENCIA", "Evidencia descargada"],
  ["COMPETENCIA_CREADA", "COMPETENCIA", "Competencia agregada al catálogo"],
  ["COMPETENCIA_ACTUALIZADA", "COMPETENCIA", "Competencia actualizada"],
  ["COMPETENCIA_ACTIVADA", "COMPETENCIA", "Competencia activada"],
  ["COMPETENCIA_DESACTIVADA", "COMPETENCIA", "Competencia desactivada"],
  ["EDICION_COMPETENCIA_CREADA", "EDICION_COMPETENCIA", "Edición creada"],
  ["EDICION_COMPETENCIA_ACTUALIZADA", "EDICION_COMPETENCIA", "Edición actualizada"],
  ["EDICION_COMPETENCIA_ACTIVADA", "EDICION_COMPETENCIA", "Edición activada"],
  ["EDICION_COMPETENCIA_DESACTIVADA", "EDICION_COMPETENCIA", "Edición desactivada"],
  ["CATEGORIA_COMPETENCIA_CREADA", "CATEGORIA_COMPETENCIA", "Categoría creada"],
  ["CATEGORIA_COMPETENCIA_ACTUALIZADA", "CATEGORIA_COMPETENCIA", "Categoría actualizada"],
  ["CATEGORIA_COMPETENCIA_ACTIVADA", "CATEGORIA_COMPETENCIA", "Categoría activada"],
  ["CATEGORIA_COMPETENCIA_DESACTIVADA", "CATEGORIA_COMPETENCIA", "Categoría desactivada"],
  ["PARTICIPACION_COMPETENCIA_REGISTRADA", "PARTICIPACION_COMPETENCIA", "Participación registrada"],
  ["PARTICIPACION_COMPETENCIA_ACTUALIZADA", "PARTICIPACION_COMPETENCIA", "Participación actualizada"],
  ["PARTICIPACION_COMPETENCIA_ELIMINADA", "PARTICIPACION_COMPETENCIA", "Participación eliminada"],
  ["CERTIFICADO_EMITIDO", "CERTIFICADO", "Certificado emitido"],
  ["CERTIFICADO_DESCARGADO", "CERTIFICADO", "Certificado descargado"],
  ["CERTIFICADO_ANULADO", "CERTIFICADO", "Certificado anulado"],
  ["PROYECTO_REGISTRADO", "PROYECTO", "Proyecto registrado"],
  ["PROYECTO_ACTUALIZADO", "PROYECTO", "Proyecto actualizado"],
  ["PROYECTO_EVIDENCIAS_ACTUALIZADAS", "PROYECTO", "Evidencias del proyecto actualizadas"],
  ["PROYECTO_FINALIZADO", "PROYECTO", "Proyecto finalizado"],
  ["PROYECTO_CANCELADO", "PROYECTO", "Proyecto cancelado"],
  ["AVANCE_REGISTRADO", "AVANCE", "Avance registrado"],
  ["AVANCE_ACTUALIZADO", "AVANCE", "Avance actualizado"],
  ["AVANCE_ANULADO", "AVANCE", "Avance anulado"],
  [
    "PARAMETROS_SEGUIMIENTO_ACTUALIZADOS",
    "PARAMETROS_SEGUIMIENTO",
    "Parámetros del semáforo actualizados",
  ],
];

export type AccionDeAuditoria = {
  codigo: string;
  entidad: EntidadDeAuditoria | null;
  nombre: string;
};

export const ACCIONES_DE_AUDITORIA: readonly AccionDeAuditoria[] = DEFINICIONES_DE_ACCION.map(
  ([codigo, entidad, nombre]) => ({ codigo, entidad, nombre }),
);

const ACCION_VALIDA = /^[A-Z_]{3,50}$/;

const RUTAS_DE_ENTIDAD: Partial<Record<EntidadDeAuditoria, string>> = {
  ACTIVIDAD: "/portal/actividades",
  AVANCE: "/portal/avances",
  CERTIFICADO: "/portal/certificados",
  CLUB: "/portal/clubes",
  COMPETENCIA: "/portal/competencias/catalogo",
  CONTENIDO: "/portal/contenidos",
  CURSO: "/portal/cursos",
  DOCENTE: "/portal/docentes",
  ESTUDIANTE: "/portal/estudiantes",
  INSTITUCION: "/portal/instituciones",
  PARTICIPACION_COMPETENCIA: "/portal/competencias",
  PERIODO: "/portal/periodos",
  PROYECTO: "/portal/proyectos",
  SOLICITUD_INSCRIPCION: "/portal/solicitudes",
  SOLICITUD_RETIRO: "/portal/retiros",
  USUARIO: "/portal/usuarios",
};

const ENTIDADES_SOLO_ADMINISTRADOR: readonly EntidadDeAuditoria[] = ["CONTENIDO", "USUARIO"];

export type FiltrosAuditoria = {
  q: string;
  entidad: EntidadDeAuditoria | null;
  accion: string | null;
  registro: number | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
};

export const RUTA_AUDITORIA = "/portal/auditoria";
export const EVENTOS_POR_PAGINA = 20;

export const FILTROS_DE_AUDITORIA_VACIOS: FiltrosAuditoria = {
  q: "",
  entidad: null,
  accion: null,
  registro: null,
  desde: null,
  hasta: null,
  pagina: 1,
};

export function esEntidadDeAuditoria(valor?: string | null): valor is EntidadDeAuditoria {
  return Boolean(valor && Object.hasOwn(ENTIDADES_DE_AUDITORIA, valor));
}

export function nombreDeEntidad(entidad?: string | null): string {
  return esEntidadDeAuditoria(entidad) ? ENTIDADES_DE_AUDITORIA[entidad] : (entidad ?? "");
}

export function nombreDeAccion(codigo?: string | null): string {
  if (!codigo) {
    return "Acción sin nombre";
  }
  const conocida = ACCIONES_DE_AUDITORIA.find((accion) => accion.codigo === codigo);
  if (conocida) {
    return conocida.nombre;
  }
  const texto = codigo.toLowerCase().replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function accionesDeEntidad(entidad: EntidadDeAuditoria | null): AccionDeAuditoria[] {
  const elegidas = entidad
    ? ACCIONES_DE_AUDITORIA.filter((accion) => accion.entidad === entidad)
    : [...ACCIONES_DE_AUDITORIA];
  return elegidas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function enlaceDeEntidad(
  entidad: string | undefined,
  entidadId: number | undefined,
  esAdministrador: boolean,
): string | null {
  if (!esEntidadDeAuditoria(entidad) || !entidadId) {
    return null;
  }
  if (!esAdministrador && ENTIDADES_SOLO_ADMINISTRADOR.includes(entidad)) {
    return null;
  }
  const base = RUTAS_DE_ENTIDAD[entidad];
  return base ? `${base}/${entidadId}` : null;
}

function accionDeFiltro(valor: string): string | null {
  const texto = valor.trim().toUpperCase();
  return ACCION_VALIDA.test(texto) ? texto : null;
}

export function leerFiltrosDeAuditoria(parametros: ParametrosDeBusqueda): FiltrosAuditoria {
  const entidad = primerValor(parametros.entidad);
  const entidadValida = esEntidadDeAuditoria(entidad) ? entidad : null;
  return {
    q: textoDeBusqueda(parametros.q),
    entidad: entidadValida,
    accion: accionDeFiltro(primerValor(parametros.accion)),
    registro: entidadValida ? enteroPositivo(primerValor(parametros.registro)) : null,
    ...rangoOrdenado(fechaDeFiltro(parametros.desde), fechaDeFiltro(parametros.hasta)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeAuditoria(filtros: FiltrosAuditoria): string {
  return rutaConConsulta(RUTA_AUDITORIA, {
    q: filtros.q,
    entidad: filtros.entidad,
    registro: filtros.entidad ? filtros.registro : null,
    accion: filtros.accion,
    desde: filtros.desde,
    hasta: filtros.hasta,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeAuditoria(filtros: FiltrosAuditoria): boolean {
  return Boolean(
    filtros.q ||
      filtros.entidad ||
      filtros.accion ||
      filtros.registro ||
      filtros.desde ||
      filtros.hasta,
  );
}

export type CambioRegistrado = {
  campo: string;
  antes: string;
  despues: string;
};

export type DetalleLegible =
  | { tipo: "cambios"; cambios: CambioRegistrado[] }
  | { tipo: "datos"; datos: { campo: string; valor: string }[] }
  | { tipo: "texto"; texto: string }
  | { tipo: "vacio" };

const CAMBIO_CON_COMILLAS = /([\wÀ-ſ]+): '([^']*)' -> '([^']*)'/g;
const ANTES_Y_DESPUES = /^antes: \[([\s\S]*)\] -> despues: \[([\s\S]*)\]$/;
const PAR_CLAVE_VALOR = /^[\wÀ-ſ]+=/;

function separarPares(texto: string): { campo: string; valor: string }[] | null {
  const partes = texto.split(/,\s*(?=[\wÀ-ſ]+=)/);
  if (!partes.every((parte) => PAR_CLAVE_VALOR.test(parte.trim()))) {
    return null;
  }
  return partes.map((parte) => {
    const limpio = parte.trim();
    const corte = limpio.indexOf("=");
    return { campo: limpio.slice(0, corte), valor: limpio.slice(corte + 1) };
  });
}

function valorVisible(valor: string): string {
  return valor === "" || valor === "null" ? "(vacío)" : valor;
}

export function interpretarDetalle(detalle?: string | null): DetalleLegible {
  const texto = detalle?.trim() ?? "";
  if (!texto) {
    return { tipo: "vacio" };
  }

  const antesYDespues = texto.match(ANTES_Y_DESPUES);
  if (antesYDespues) {
    const antes = separarPares(antesYDespues[1]);
    const despues = separarPares(antesYDespues[2]);
    if (antes && despues) {
      const previos = new Map(antes.map((par) => [par.campo, par.valor]));
      const cambios = despues
        .filter((par) => previos.get(par.campo) !== par.valor)
        .map((par) => ({
          campo: par.campo,
          antes: valorVisible(previos.get(par.campo) ?? ""),
          despues: valorVisible(par.valor),
        }));
      return cambios.length > 0 ? { tipo: "cambios", cambios } : { tipo: "texto", texto: "Sin cambios" };
    }
  }

  const cambios = [...texto.matchAll(CAMBIO_CON_COMILLAS)].map((coincidencia) => ({
    campo: coincidencia[1],
    antes: valorVisible(coincidencia[2]),
    despues: valorVisible(coincidencia[3]),
  }));
  if (cambios.length > 0) {
    return { tipo: "cambios", cambios };
  }

  const pares = separarPares(texto);
  if (pares && pares.length > 0) {
    return { tipo: "datos", datos: pares.map((par) => ({ ...par, valor: valorVisible(par.valor) })) };
  }

  return { tipo: "texto", texto };
}

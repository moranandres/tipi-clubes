import {
  enteroPositivo,
  opcionValida,
  paginaEnRuta,
  primerValor,
  rutaConConsulta,
  textoDeBusqueda,
  type ParametrosDeBusqueda,
} from "./parametros";

export const ROLES_DE_USUARIO = [
  "ADMIN",
  "COORDINADOR",
  "RESP_INSTITUCIONAL",
  "DOCENTE",
  "CONSULTA",
] as const;

export type RolDeUsuario = (typeof ROLES_DE_USUARIO)[number];

export const NOMBRES_DE_ROL_DE_USUARIO: Record<RolDeUsuario, string> = {
  ADMIN: "Administrador",
  COORDINADOR: "Coordinador TIPI 3.0",
  RESP_INSTITUCIONAL: "Responsable institucional",
  DOCENTE: "Docente coordinador",
  CONSULTA: "Consulta",
};

export const DESCRIPCIONES_DE_ROL_DE_USUARIO: Record<RolDeUsuario, string> = {
  ADMIN: "Administra usuarios, instituciones, períodos y catálogos de todo el sistema.",
  COORDINADOR: "Sigue el avance de los clubes de todas las instituciones.",
  RESP_INSTITUCIONAL: "Gestiona clubes, cursos, inscripciones y certificados de su institución.",
  DOCENTE: "Planifica sesiones, pasa asistencia y carga evidencias de sus clubes.",
  CONSULTA: "Consulta la información y la auditoría sin modificar registros.",
};

export const ROLES_CON_INSTITUCION: readonly RolDeUsuario[] = ["RESP_INSTITUCIONAL", "DOCENTE"];

export const ESTADOS_DE_USUARIO = ["ACTIVO", "INACTIVO"] as const;

export type EstadoUsuario = (typeof ESTADOS_DE_USUARIO)[number];

export const NOMBRES_DE_ESTADO_DE_USUARIO: Record<EstadoUsuario, string> = {
  ACTIVO: "Activos",
  INACTIVO: "Inactivos",
};

export const NOMBRE_DE_ESTADO_DE_USUARIO: Record<EstadoUsuario, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
};

export const PUNTOS_DE_ESTADO_DE_USUARIO: Record<EstadoUsuario, string> = {
  ACTIVO: "bg-exito",
  INACTIVO: "bg-tenue",
};

export type FiltrosUsuarios = {
  q: string;
  rol: RolDeUsuario | null;
  institucion: number | null;
  estado: EstadoUsuario | null;
  pagina: number;
};

export const RUTA_USUARIOS = "/portal/usuarios";
export const USUARIOS_POR_PAGINA = 10;

export const FILTROS_DE_USUARIOS_VACIOS: FiltrosUsuarios = {
  q: "",
  rol: null,
  institucion: null,
  estado: null,
  pagina: 1,
};

export function esRolDeUsuario(valor?: string): valor is RolDeUsuario {
  return ROLES_DE_USUARIO.includes(valor as RolDeUsuario);
}

export function nombreDeRolDeUsuario(rol?: string): string {
  return esRolDeUsuario(rol) ? NOMBRES_DE_ROL_DE_USUARIO[rol] : "Sin rol";
}

export function rolRequiereInstitucion(rol?: string): boolean {
  return esRolDeUsuario(rol) && ROLES_CON_INSTITUCION.includes(rol);
}

export function estadoDeUsuario(activo?: boolean): EstadoUsuario {
  return activo === false ? "INACTIVO" : "ACTIVO";
}

export function activoSegun(estado: EstadoUsuario | null): boolean | undefined {
  return estado ? estado === "ACTIVO" : undefined;
}

export function leerFiltrosDeUsuarios(parametros: ParametrosDeBusqueda): FiltrosUsuarios {
  const rol = opcionValida(ROLES_DE_USUARIO, primerValor(parametros.rol));
  return {
    q: textoDeBusqueda(parametros.q),
    rol,
    institucion: enteroPositivo(primerValor(parametros.institucion)),
    estado: opcionValida(ESTADOS_DE_USUARIO, primerValor(parametros.estado)),
    pagina: enteroPositivo(primerValor(parametros.pagina)) ?? 1,
  };
}

export function rutaDeUsuarios(filtros: FiltrosUsuarios): string {
  return rutaConConsulta(RUTA_USUARIOS, {
    q: filtros.q,
    rol: filtros.rol,
    institucion: filtros.institucion,
    estado: filtros.estado,
    pagina: paginaEnRuta(filtros.pagina),
  });
}

export function hayFiltrosDeUsuarios(filtros: FiltrosUsuarios): boolean {
  return Boolean(filtros.q || filtros.rol || filtros.institucion || filtros.estado);
}

export function rutaDeUsuario(id: number, aviso?: string): string {
  return rutaConConsulta(`${RUTA_USUARIOS}/${id}`, { aviso });
}

export function nombreDeUsuario(usuario: { nombres?: string; apellidos?: string; username?: string }): string {
  return (
    [usuario.apellidos, usuario.nombres].filter(Boolean).join(" ") || usuario.username || "Usuario"
  );
}

export function estaBloqueado(bloqueadoHasta?: string, ahora: number = Date.now()): boolean {
  if (!bloqueadoHasta) {
    return false;
  }
  const hasta = Date.parse(bloqueadoHasta);
  return !Number.isNaN(hasta) && hasta > ahora;
}

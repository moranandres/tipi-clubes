const ROLES_QUE_GESTIONAN = ["ADMIN", "RESP_INSTITUCIONAL"];
const ROLES_QUE_REGISTRAN = ["ADMIN", "RESP_INSTITUCIONAL", "DOCENTE"];
const ROLES_CON_VISTA_MINIMA = ["COORDINADOR", "CONSULTA"];
const ROL_ADMINISTRADOR = "ADMIN";
const ROL_DOCENTE = "DOCENTE";

function esUnoDe(roles: readonly string[], rol?: string): boolean {
  return Boolean(rol && roles.includes(rol));
}

export function puedeGestionarClubesYCursos(rol?: string): boolean {
  return esUnoDe(ROLES_QUE_GESTIONAN, rol);
}

export function puedeElegirInstitucion(rol?: string): boolean {
  return rol === ROL_ADMINISTRADOR;
}

export function puedeReabrirClubes(rol?: string): boolean {
  return rol === ROL_ADMINISTRADOR;
}

export function puedeRegistrarEstudiantes(rol?: string): boolean {
  return esUnoDe(ROLES_QUE_REGISTRAN, rol);
}

export function puedeGestionarEstudiantes(rol?: string): boolean {
  return esUnoDe(ROLES_QUE_GESTIONAN, rol);
}

export function puedeRegistrarSolicitudes(rol?: string): boolean {
  return esUnoDe(ROLES_QUE_REGISTRAN, rol);
}

export function puedeResolverSolicitudes(rol?: string): boolean {
  return esUnoDe(ROLES_QUE_GESTIONAN, rol);
}

export function puedeAutorizarSobrecupo(rol?: string): boolean {
  return rol === ROL_ADMINISTRADOR;
}

export function puedeGestionarAutorizaciones(rol?: string): boolean {
  return esUnoDe(ROLES_QUE_REGISTRAN, rol);
}

export function soloVeDatosMinimos(rol?: string): boolean {
  return esUnoDe(ROLES_CON_VISTA_MINIMA, rol);
}

export function esDocente(rol?: string): boolean {
  return rol === ROL_DOCENTE;
}

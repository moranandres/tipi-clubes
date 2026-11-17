const ROLES_QUE_GESTIONAN = ["ADMIN", "RESP_INSTITUCIONAL"];
const ROL_ADMINISTRADOR = "ADMIN";

export function puedeGestionarClubesYCursos(rol?: string): boolean {
  return Boolean(rol && ROLES_QUE_GESTIONAN.includes(rol));
}

export function puedeElegirInstitucion(rol?: string): boolean {
  return rol === ROL_ADMINISTRADOR;
}

export function puedeReabrirClubes(rol?: string): boolean {
  return rol === ROL_ADMINISTRADOR;
}

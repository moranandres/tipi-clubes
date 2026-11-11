import { apiFetch, construirConsulta } from './api.js';

async function cargarTodasLasPaginas(ruta) {
  const todos = [];
  let pagina = 0;
  let totalPaginas = 1;
  const separador = ruta.includes('?') ? '&' : '?';
  while (pagina < totalPaginas) {
    const respuesta = await apiFetch(`${ruta}${separador}pagina=${pagina}&tamano=100`);
    todos.push(...respuesta.contenido);
    totalPaginas = respuesta.totalPaginas;
    pagina += 1;
  }
  return todos;
}

export function cargarInstituciones() {
  return cargarTodasLasPaginas('/api/instituciones');
}

export function cargarRoles() {
  return apiFetch('/api/roles');
}

export function cargarCursosEducativos() {
  return apiFetch('/api/estudiantes/cursos');
}

export function cargarPeriodos() {
  return apiFetch('/api/periodos');
}

export function cargarDocentesActivos(institucionId) {
  return cargarTodasLasPaginas(`/api/docentes?institucionId=${institucionId}&activo=true`);
}

export function cargarClubes() {
  return cargarTodasLasPaginas('/api/clubes');
}

export function cargarCursosDelClub(clubId) {
  return cargarTodasLasPaginas(`/api/cursos?clubId=${clubId}`);
}

export function cargarEstudiantesActivos(institucionId) {
  return cargarTodasLasPaginas(`/api/estudiantes?institucionId=${institucionId}&estado=ACTIVO`);
}

export function cargarEstudiantesDeInstitucion(institucionId) {
  return cargarTodasLasPaginas(`/api/estudiantes?institucionId=${institucionId}`);
}

export function cargarInscripcionesActivasDelClub(clubId) {
  return cargarTodasLasPaginas(`/api/inscripciones?clubId=${clubId}&estado=ACTIVA`);
}

export function cargarRetirosPendientesDelClub(clubId) {
  return cargarTodasLasPaginas(`/api/solicitudes-retiro?clubId=${clubId}&estado=PENDIENTE`);
}

export function cargarCompetencias() {
  return apiFetch('/api/competencias');
}

export function cargarEdicionesDeCompetencia(competenciaId) {
  return apiFetch(`/api/competencias/${competenciaId}/ediciones`);
}

export function cargarCategoriasDeCompetencia(competenciaId) {
  return apiFetch(`/api/competencias/${competenciaId}/categorias`);
}

export function cargarParticipaciones(filtros) {
  return cargarTodasLasPaginas(`/api/participaciones-competencia${construirConsulta(filtros)}`);
}

export function cargarCertificadosDelClub(clubId, estado) {
  return cargarTodasLasPaginas(`/api/certificados${construirConsulta({ clubId, estado })}`);
}

export function cargarActividadesDelClub(clubId, estado) {
  return cargarTodasLasPaginas(`/api/actividades${construirConsulta({ clubId, estado })}`);
}

export function cargarContenidos(filtros = {}) {
  return apiFetch(`/api/contenidos${construirConsulta(filtros)}`);
}

export function cargarInscripcionesDelClub(clubId) {
  return cargarTodasLasPaginas(`/api/inscripciones?clubId=${clubId}`);
}

export function cargarProyectos(filtros = {}) {
  return cargarTodasLasPaginas(`/api/proyectos${construirConsulta(filtros)}`);
}

export function cargarEvidenciasDelClub(clubId, estado) {
  return cargarTodasLasPaginas(`/api/evidencias${construirConsulta({ clubId, estado })}`);
}

import { apiFetch } from './api.js';

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

export function cargarInscripcionesActivasDelClub(clubId) {
  return cargarTodasLasPaginas(`/api/inscripciones?clubId=${clubId}&estado=ACTIVA`);
}

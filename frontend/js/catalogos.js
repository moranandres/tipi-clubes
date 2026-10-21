import { apiFetch } from './api.js';

export async function cargarInstituciones() {
  const todas = [];
  let pagina = 0;
  let totalPaginas = 1;
  while (pagina < totalPaginas) {
    const respuesta = await apiFetch(`/api/instituciones?pagina=${pagina}&tamano=100`);
    todas.push(...respuesta.contenido);
    totalPaginas = respuesta.totalPaginas;
    pagina += 1;
  }
  return todas;
}

export function cargarRoles() {
  return apiFetch('/api/roles');
}

export function cargarPeriodos() {
  return apiFetch('/api/periodos');
}

export async function cargarDocentesActivos(institucionId) {
  const todos = [];
  let pagina = 0;
  let totalPaginas = 1;
  while (pagina < totalPaginas) {
    const consulta = `institucionId=${institucionId}&activo=true&pagina=${pagina}&tamano=100`;
    const respuesta = await apiFetch(`/api/docentes?${consulta}`);
    todos.push(...respuesta.contenido);
    totalPaginas = respuesta.totalPaginas;
    pagina += 1;
  }
  return todos;
}
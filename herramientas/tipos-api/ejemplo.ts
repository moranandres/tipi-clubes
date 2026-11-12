import createClient from 'openapi-fetch';
import type { components, paths } from './tipos-api';

export type ClubResponse = components['schemas']['ClubResponse'];
export type PeriodoRequest = components['schemas']['PeriodoRequest'];
export type PeriodoResponse = components['schemas']['PeriodoResponse'];
export type ProblemaResponse = components['schemas']['ProblemaResponse'];

const api = createClient<paths>({ baseUrl: 'http://localhost:8080' });

function mensajeDe(problema: ProblemaResponse, respaldo: string): string {
  return problema.detail ?? respaldo;
}

export async function listarClubes(token: string, q: string): Promise<ClubResponse[]> {
  const { data, error } = await api.GET('/api/clubes', {
    params: { query: { q, pagina: 0, tamano: 10 } },
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error) {
    throw new Error(mensajeDe(error, 'No se pudo consultar los clubes'));
  }
  return data.contenido ?? [];
}

export async function crearPeriodo(token: string, periodo: PeriodoRequest): Promise<PeriodoResponse> {
  const { data, error, response } = await api.POST('/api/periodos', {
    body: periodo,
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error) {
    throw new Error(mensajeDe(error, 'No se pudo crear el período'));
  }
  console.log(`Recurso creado en ${response.headers.get('Location')}`);
  return data;
}

export async function eliminarCurso(token: string, id: number): Promise<void> {
  const { error } = await api.DELETE('/api/cursos/{id}', {
    params: { path: { id } },
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error) {
    throw new Error(mensajeDe(error, 'No se pudo eliminar el curso'));
  }
}

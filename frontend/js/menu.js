const TODOS = ['ADMIN', 'COORDINADOR', 'RESP_INSTITUCIONAL', 'DOCENTE', 'CONSULTA'];

export const OPCIONES_MENU = [
  { id: 'dashboard', etiqueta: 'Panel principal', icono: 'bi-speedometer2', href: 'dashboard.html', roles: TODOS, disponible: true },
  { id: 'instituciones', etiqueta: 'Instituciones', icono: 'bi-bank', href: 'instituciones.html', roles: TODOS, disponible: true },
  { id: 'clubes', etiqueta: 'Clubes', icono: 'bi-robot', href: 'clubes.html', roles: TODOS, disponible: false },
  { id: 'docentes', etiqueta: 'Docentes', icono: 'bi-person-workspace', href: 'docentes.html', roles: TODOS, disponible: false },
  { id: 'periodos', etiqueta: 'Períodos académicos', icono: 'bi-calendar3', href: 'periodos.html', roles: ['ADMIN', 'COORDINADOR', 'CONSULTA', 'RESP_INSTITUCIONAL'], disponible: true },
  { id: 'usuarios', etiqueta: 'Usuarios', icono: 'bi-people', href: 'usuarios.html', roles: ['ADMIN'], disponible: false },
  { id: 'auditoria', etiqueta: 'Auditoría', icono: 'bi-shield-check', href: 'auditoria.html', roles: ['ADMIN', 'CONSULTA'], disponible: false }
];
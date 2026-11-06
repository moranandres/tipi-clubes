const TODOS = ['ADMIN', 'COORDINADOR', 'RESP_INSTITUCIONAL', 'DOCENTE', 'CONSULTA'];

export const OPCIONES_MENU = [
  { id: 'dashboard', etiqueta: 'Panel principal', icono: 'bi-speedometer2', href: 'dashboard.html', roles: TODOS, disponible: true },
  { id: 'instituciones', etiqueta: 'Instituciones', icono: 'bi-bank', href: 'instituciones.html', roles: TODOS, disponible: true },
  { id: 'clubes', etiqueta: 'Clubes', icono: 'bi-robot', href: 'clubes.html', roles: TODOS, disponible: true },
  { id: 'docentes', etiqueta: 'Docentes', icono: 'bi-person-workspace', href: 'docentes.html', roles: TODOS, disponible: true },
  { id: 'estudiantes', etiqueta: 'Estudiantes', icono: 'bi-mortarboard', href: 'estudiantes.html', roles: TODOS, disponible: true },
  { id: 'cursos', etiqueta: 'Cursos y horarios', icono: 'bi-journal-code', href: 'cursos.html', roles: TODOS, disponible: true },
  { id: 'solicitudes', etiqueta: 'Solicitudes de inscripción', icono: 'bi-person-plus', href: 'solicitudes.html', roles: TODOS, disponible: true },
  { id: 'retiros', etiqueta: 'Solicitudes de retiro', icono: 'bi-person-dash', href: 'retiros.html', roles: TODOS, disponible: true },
  { id: 'competencias', etiqueta: 'Competencias', icono: 'bi-trophy', href: 'competencias.html', roles: TODOS, disponible: true },
  { id: 'certificados', etiqueta: 'Certificados', icono: 'bi-award', href: 'certificados.html', roles: TODOS, disponible: true },
  { id: 'periodos', etiqueta: 'Períodos académicos', icono: 'bi-calendar3', href: 'periodos.html', roles: ['ADMIN', 'COORDINADOR', 'CONSULTA', 'RESP_INSTITUCIONAL'], disponible: true },
  { id: 'usuarios', etiqueta: 'Usuarios', icono: 'bi-people', href: 'usuarios.html', roles: ['ADMIN'], disponible: true },
  { id: 'auditoria', etiqueta: 'Auditoría', icono: 'bi-shield-check', href: 'auditoria.html', roles: ['ADMIN', 'CONSULTA'], disponible: true }
];

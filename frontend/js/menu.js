const TODOS = ['ADMIN', 'COORDINADOR', 'RESP_INSTITUCIONAL', 'DOCENTE', 'CONSULTA'];
const SIN_DOCENTE = ['ADMIN', 'COORDINADOR', 'CONSULTA', 'RESP_INSTITUCIONAL'];

export const SECCIONES_MENU = [
  {
    titulo: 'Inicio',
    opciones: [
      { id: 'dashboard', etiqueta: 'Panel principal', icono: 'bi-speedometer2', href: 'dashboard.html', roles: TODOS },
      { id: 'catalogo', etiqueta: 'Catálogo de clubes', icono: 'bi-grid-3x3-gap', href: 'catalogo.html', roles: TODOS }
    ]
  },
  {
    titulo: 'Gestión institucional',
    opciones: [
      { id: 'instituciones', etiqueta: 'Instituciones', icono: 'bi-bank', href: 'instituciones.html', roles: TODOS },
      { id: 'clubes', etiqueta: 'Clubes', icono: 'bi-robot', href: 'clubes.html', roles: TODOS },
      { id: 'docentes', etiqueta: 'Docentes', icono: 'bi-person-workspace', href: 'docentes.html', roles: TODOS },
      { id: 'periodos', etiqueta: 'Períodos académicos', icono: 'bi-calendar3', href: 'periodos.html', roles: SIN_DOCENTE }
    ]
  },
  {
    titulo: 'Estudiantes',
    opciones: [
      { id: 'estudiantes', etiqueta: 'Estudiantes', icono: 'bi-mortarboard', href: 'estudiantes.html', roles: TODOS },
      { id: 'historial', etiqueta: 'Historial del estudiante', icono: 'bi-clock-history', href: 'historial.html', roles: TODOS },
      { id: 'solicitudes', etiqueta: 'Solicitudes de inscripción', icono: 'bi-person-plus', href: 'solicitudes.html', roles: TODOS },
      { id: 'retiros', etiqueta: 'Solicitudes de retiro', icono: 'bi-person-dash', href: 'retiros.html', roles: TODOS }
    ]
  },
  {
    titulo: 'Formación y logros',
    opciones: [
      { id: 'cursos', etiqueta: 'Cursos y horarios', icono: 'bi-journal-code', href: 'cursos.html', roles: TODOS },
      { id: 'competencias', etiqueta: 'Competencias', icono: 'bi-trophy', href: 'competencias.html', roles: TODOS },
      { id: 'certificados', etiqueta: 'Certificados', icono: 'bi-award', href: 'certificados.html', roles: TODOS }
    ]
  },
  {
    titulo: 'Actividades del club',
    opciones: [
      { id: 'actividades', etiqueta: 'Actividades y sesiones', icono: 'bi-calendar-check', href: 'actividades.html', roles: TODOS },
      { id: 'asistencia', etiqueta: 'Asistencia', icono: 'bi-clipboard-check', href: 'asistencia.html', roles: TODOS },
      { id: 'evidencias', etiqueta: 'Evidencias', icono: 'bi-images', href: 'evidencias.html', roles: TODOS }
    ]
  },
  {
    titulo: 'Resultados y seguimiento',
    opciones: [
      { id: 'proyectos', etiqueta: 'Proyectos de estudiantes', icono: 'bi-kanban', href: 'proyectos.html', roles: TODOS },
      { id: 'avances', etiqueta: 'Avances y resultados', icono: 'bi-graph-up-arrow', href: 'avances.html', roles: TODOS },
      { id: 'seguimiento', etiqueta: 'Seguimiento de actividades', icono: 'bi-stoplights', href: 'seguimiento.html', roles: TODOS }
    ]
  },
  {
    titulo: 'Administración',
    opciones: [
      { id: 'usuarios', etiqueta: 'Usuarios', icono: 'bi-people', href: 'usuarios.html', roles: ['ADMIN'] },
      { id: 'contenidos', etiqueta: 'Catálogo de contenidos', icono: 'bi-tags', href: 'contenidos.html', roles: ['ADMIN'] },
      { id: 'auditoria', etiqueta: 'Auditoría', icono: 'bi-shield-check', href: 'auditoria.html', roles: ['ADMIN', 'CONSULTA'] }
    ]
  }
];

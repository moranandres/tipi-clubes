export type Rol = "ADMIN" | "COORDINADOR" | "RESP_INSTITUCIONAL" | "DOCENTE" | "CONSULTA";

const TODOS: readonly Rol[] = ["ADMIN", "COORDINADOR", "RESP_INSTITUCIONAL", "DOCENTE", "CONSULTA"];
const SIN_DOCENTE: readonly Rol[] = ["ADMIN", "COORDINADOR", "RESP_INSTITUCIONAL", "CONSULTA"];
const SOLO_ADMIN: readonly Rol[] = ["ADMIN"];
const ADMIN_Y_CONSULTA: readonly Rol[] = ["ADMIN", "CONSULTA"];

type Definicion = {
  id: string;
  etiqueta: string;
  roles: readonly Rol[];
  etiquetaPorRol?: Partial<Record<Rol, string>>;
};

const SECCIONES = [
  {
    titulo: "Inicio",
    opciones: [
      { id: "panel", etiqueta: "Panel principal", roles: TODOS },
      { id: "catalogo", etiqueta: "Catálogo de clubes", roles: TODOS },
    ],
  },
  {
    titulo: "Gestión institucional",
    opciones: [
      {
        id: "instituciones",
        etiqueta: "Instituciones",
        roles: TODOS,
        etiquetaPorRol: { RESP_INSTITUCIONAL: "Mi institución", DOCENTE: "Mi institución" },
      },
      {
        id: "clubes",
        etiqueta: "Clubes",
        roles: TODOS,
        etiquetaPorRol: { DOCENTE: "Mis clubes" },
      },
      { id: "docentes", etiqueta: "Docentes", roles: TODOS },
      { id: "periodos", etiqueta: "Períodos académicos", roles: SIN_DOCENTE },
    ],
  },
  {
    titulo: "Estudiantes",
    opciones: [
      { id: "estudiantes", etiqueta: "Estudiantes", roles: TODOS },
      { id: "historial", etiqueta: "Historial del estudiante", roles: TODOS },
      { id: "solicitudes", etiqueta: "Solicitudes de inscripción", roles: TODOS },
      { id: "retiros", etiqueta: "Solicitudes de retiro", roles: TODOS },
    ],
  },
  {
    titulo: "Formación y logros",
    opciones: [
      { id: "cursos", etiqueta: "Cursos y horarios", roles: TODOS },
      { id: "competencias", etiqueta: "Competencias", roles: TODOS },
      { id: "certificados", etiqueta: "Certificados", roles: TODOS },
    ],
  },
  {
    titulo: "Actividades del club",
    opciones: [
      { id: "actividades", etiqueta: "Actividades y sesiones", roles: TODOS },
      { id: "asistencia", etiqueta: "Asistencia", roles: TODOS },
      { id: "evidencias", etiqueta: "Evidencias", roles: TODOS },
    ],
  },
  {
    titulo: "Resultados y seguimiento",
    opciones: [
      { id: "proyectos", etiqueta: "Proyectos de estudiantes", roles: TODOS },
      { id: "avances", etiqueta: "Avances y resultados", roles: TODOS },
      { id: "seguimiento", etiqueta: "Seguimiento de actividades", roles: TODOS },
    ],
  },
  {
    titulo: "Administración",
    opciones: [
      { id: "usuarios", etiqueta: "Usuarios", roles: SOLO_ADMIN },
      { id: "contenidos", etiqueta: "Catálogo de contenidos", roles: SOLO_ADMIN },
      { id: "auditoria", etiqueta: "Auditoría", roles: ADMIN_Y_CONSULTA },
    ],
  },
] as const satisfies readonly { titulo: string; opciones: readonly Definicion[] }[];

export type IdOpcion = (typeof SECCIONES)[number]["opciones"][number]["id"];

export type OpcionMenu = {
  id: IdOpcion;
  etiqueta: string;
  href: string;
};

export type SeccionMenu = {
  titulo: string;
  opciones: OpcionMenu[];
};

export type ModuloPortal = {
  id: IdOpcion;
  etiqueta: string;
  roles: readonly Rol[];
};

const ID_PANEL: IdOpcion = "panel";

export function rutaDeOpcion(id: IdOpcion): string {
  return id === ID_PANEL ? "/portal" : `/portal/${id}`;
}

function esRol(valor?: string): valor is Rol {
  return TODOS.includes(valor as Rol);
}

function etiquetaPara(opcion: Definicion, rol: Rol): string {
  return opcion.etiquetaPorRol?.[rol] ?? opcion.etiqueta;
}

export function seccionesParaRol(rol?: string): SeccionMenu[] {
  if (!esRol(rol)) {
    return [];
  }
  return SECCIONES.map((seccion) => ({
    titulo: seccion.titulo,
    opciones: seccion.opciones
      .filter((opcion) => opcion.roles.includes(rol))
      .map((opcion) => ({
        id: opcion.id,
        etiqueta: etiquetaPara(opcion, rol),
        href: rutaDeOpcion(opcion.id),
      })),
  })).filter((seccion) => seccion.opciones.length > 0);
}

export const MODULOS_DEL_PORTAL: ModuloPortal[] = SECCIONES.flatMap((seccion) =>
  seccion.opciones
    .filter((opcion) => opcion.id !== ID_PANEL)
    .map((opcion) => ({ id: opcion.id, etiqueta: opcion.etiqueta, roles: opcion.roles })),
);

export function buscarModulo(id: string): ModuloPortal | undefined {
  return MODULOS_DEL_PORTAL.find((modulo) => modulo.id === id);
}

export function rolPuedeVer(modulo: ModuloPortal, rol?: string): boolean {
  return esRol(rol) && modulo.roles.includes(rol);
}

# PASO 3 · Bloque 6: cursos y horarios

Este bloque construye la sección Cursos y horarios en `/portal/cursos`: un resumen por estado que también filtra, búsqueda por nombre, filtros por nivel, modalidad e institución, la tabla con los horarios de cada curso y su paginación. Además convierte en piezas compartidas lo que el Bloque 5 había hecho solo para clubes.

Todo está en tu rama `main`. Los comandos de Git están al final.

## Alcance de este bloque

Igual que en clubes, construí la consulta completa: listar, buscar, filtrar y paginar. Crear y editar cursos, administrar sus horarios y cambiar su estado no entraron: son formularios con validaciones propias (cruces de horario, cupos, transiciones de estado) y conviene entregarlos en un bloque dedicado.

## Endpoints verificados

Revisé `CursoController`, `HorarioController` y `CursoService` del backend:

| Operación | Endpoint | En este bloque |
|---|---|---|
| Listar con filtros | `GET /api/cursos` | Sí |
| Detalle con horarios | `GET /api/cursos/{id}` | No |
| Crear, actualizar, eliminar | `POST`, `PUT`, `DELETE /api/cursos` | No |
| Cambiar estado | `PATCH /api/cursos/{id}/estado` | No |
| Horarios de un curso | `/api/cursos/{cursoId}/horarios` | No, la lista ya los trae |
| Participantes | `GET /api/cursos/{cursoId}/participantes` | No |

`GET /api/cursos` acepta `q`, `institucionId`, `clubId`, `nivel`, `modalidad`, `estado`, `pagina` y `tamano`. Ordena por fecha de inicio, de la más reciente a la más antigua, y luego por nombre. Cada curso llega con su lista de horarios, así que la tabla no necesita una segunda consulta. El alcance lo decide el backend: los roles globales ven todo, el responsable ve su institución y el docente ve los cursos de sus clubes.

## Qué se construyó

| Parte | Resultado |
|---|---|
| Servicio de cursos | `src/lib/api/cursos.ts` con `listarCursos` y `contarCursosPorEstado`, sobre las ayudas de `con-sesion.ts` |
| Filtros en la dirección | `src/lib/portal/filtros-cursos.ts`: búsqueda, estado, nivel, modalidad, institución y página |
| Resumen por estado | Cuatro fichas con el total de cursos En curso, Planificado, Finalizado y Cancelado; pulsar una filtra por ese estado |
| Tabla | Curso, institución, horario semanal, fechas, inscritos y estado; fichas por debajo de 1280 px |
| Piezas compartidas | `ControlesDeFiltro`, `Paginacion`, `AvisoDeLista` y `EsqueletoLista`, que ahora usan clubes y cursos |

## Cuatro decisiones que debes conocer

**1. El resumen por estado es también el filtro.** En lugar de una lista desplegable más, las cuatro fichas muestran cuántos cursos hay en cada estado y funcionan como botones: una pulsación filtra, otra quita el filtro. Los totales respetan los demás filtros: si eliges nivel Avanzado, las fichas cuentan solo cursos avanzados. Son cuatro consultas en paralelo que piden una sola fila cada una.

**2. Lo repetido se volvió compartido.** El Bloque 5 tenía la búsqueda con espera, las listas desplegables, la paginación, los avisos y el esqueleto dentro de los archivos de clubes. Los moví a `components/portal` para que clubes y cursos usen exactamente el mismo código. Por eso este bloque modifica tres archivos de clubes; su comportamiento no cambia y lo volví a probar.

**3. Los filtros no se pisan entre sí.** `useFiltrosEnUrl` recuerda los últimos filtros pedidos aunque la respuesta anterior todavía no haya llegado. Si alguien cambia el nivel y enseguida escribe en la búsqueda, la segunda consulta conserva el nivel.

**4. La tabla aparece desde 1280 px.** Con seis columnas y horarios de dos líneas, a 1024 px la tabla necesitaba desplazamiento horizontal. Por debajo de 1280 px cada curso se muestra como una ficha.

## Cómo usé cada skill

**Impeccable, modo Operate.** Misma estructura que clubes, para que quien aprendió una pantalla ya sepa usar la otra. Las fichas de estado son botones reales con `aria-pressed`; la elegida se marca con borde de acento y fondo más claro. El color del punto siempre va con el nombre del estado.

**Taste.** Etiquetas visibles en todos los controles y el mismo sistema de diseño.

**Emil Kowalski.** Sin animaciones nuevas. La lista se atenúa 150 ms al filtrar, las fichas y los botones responden al pulsar con `scale(0.98)` y `scale(0.97)`, y el indicador de búsqueda gira a 600 ms por vuelta.

## Archivos nuevos y modificados

```text
web/src/
  app/portal/clubes/page.tsx                    modificado
  app/portal/cursos/page.tsx                    nuevo
  components/portal/
    AvisoDeLista.tsx                            nuevo
    ControlesDeFiltro.tsx                       nuevo
    EsqueletoLista.tsx                          nuevo
    Paginacion.tsx                              nuevo, reemplaza a clubes/PaginacionClubes.tsx
    clubes/FiltrosClubes.tsx                    modificado
    clubes/PaginacionClubes.tsx                 eliminado
    clubes/TablaClubes.tsx                      modificado
    cursos/FiltrosCursos.tsx                    nuevo
    cursos/ResumenPorEstado.tsx                 nuevo
    cursos/TablaCursos.tsx                      nuevo
  lib/
    api/cursos.ts                               nuevo
    portal/filtros-clubes.ts                    modificado
    portal/filtros-cursos.ts                    nuevo
    portal/menu.ts                              modificado
```

# Parte A. Servicio y tipado

## Paso 1. Filtros de cursos en la dirección

Define los estados, niveles y modalidades con sus nombres en español y el color del punto de cada estado. `leerFiltrosDeCursos` valida lo que llega en la dirección y `rutaDeCursos` la vuelve a escribir. La modalidad `ONLINE` del backend se muestra como En línea.

Archivo: `web/src/lib/portal/filtros-cursos.ts`

```typescript
export const ESTADOS_DE_CURSO = ["EN_CURSO", "PLANIFICADO", "FINALIZADO", "CANCELADO"] as const;
export const NIVELES_DE_CURSO = ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"] as const;
export const MODALIDADES_DE_CURSO = ["PRESENCIAL", "ONLINE", "HIBRIDO"] as const;

export type EstadoCurso = (typeof ESTADOS_DE_CURSO)[number];
export type NivelCurso = (typeof NIVELES_DE_CURSO)[number];
export type ModalidadCurso = (typeof MODALIDADES_DE_CURSO)[number];

export const NOMBRES_DE_ESTADO_DE_CURSO: Record<EstadoCurso, string> = {
  EN_CURSO: "En curso",
  PLANIFICADO: "Planificado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const PUNTOS_DE_ESTADO_DE_CURSO: Record<EstadoCurso, string> = {
  EN_CURSO: "bg-exito",
  PLANIFICADO: "bg-acento",
  FINALIZADO: "bg-tenue",
  CANCELADO: "bg-error",
};

export const NOMBRES_DE_NIVEL: Record<NivelCurso, string> = {
  PRINCIPIANTE: "Principiante",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
};

export const NOMBRES_DE_MODALIDAD: Record<ModalidadCurso, string> = {
  PRESENCIAL: "Presencial",
  ONLINE: "En línea",
  HIBRIDO: "Híbrida",
};

export type FiltrosCursos = {
  q: string;
  estado: EstadoCurso | null;
  nivel: NivelCurso | null;
  modalidad: ModalidadCurso | null;
  institucion: number | null;
  pagina: number;
};

export type ParametrosDeBusqueda = Record<string, string | string[] | undefined>;

export const RUTA_CURSOS = "/portal/cursos";
export const CURSOS_POR_PAGINA = 10;

export const FILTROS_DE_CURSOS_VACIOS: FiltrosCursos = {
  q: "",
  estado: null,
  nivel: null,
  modalidad: null,
  institucion: null,
  pagina: 1,
};

const LONGITUD_MAXIMA_BUSQUEDA = 80;

function primero(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

function enteroPositivo(texto: string): number | null {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function opcionValida<T extends string>(opciones: readonly T[], valor: string): T | null {
  return opciones.includes(valor as T) ? (valor as T) : null;
}

export function leerFiltrosDeCursos(parametros: ParametrosDeBusqueda): FiltrosCursos {
  return {
    q: primero(parametros.q).trim().slice(0, LONGITUD_MAXIMA_BUSQUEDA),
    estado: opcionValida(ESTADOS_DE_CURSO, primero(parametros.estado)),
    nivel: opcionValida(NIVELES_DE_CURSO, primero(parametros.nivel)),
    modalidad: opcionValida(MODALIDADES_DE_CURSO, primero(parametros.modalidad)),
    institucion: enteroPositivo(primero(parametros.institucion)),
    pagina: enteroPositivo(primero(parametros.pagina)) ?? 1,
  };
}

export function rutaDeCursos(filtros: FiltrosCursos): string {
  const parametros = new URLSearchParams();
  if (filtros.q) {
    parametros.set("q", filtros.q);
  }
  if (filtros.estado) {
    parametros.set("estado", filtros.estado);
  }
  if (filtros.nivel) {
    parametros.set("nivel", filtros.nivel);
  }
  if (filtros.modalidad) {
    parametros.set("modalidad", filtros.modalidad);
  }
  if (filtros.institucion) {
    parametros.set("institucion", String(filtros.institucion));
  }
  if (filtros.pagina > 1) {
    parametros.set("pagina", String(filtros.pagina));
  }
  const consulta = parametros.toString();
  return consulta ? `${RUTA_CURSOS}?${consulta}` : RUTA_CURSOS;
}

export function hayFiltrosDeCursos(filtros: FiltrosCursos): boolean {
  return Boolean(
    filtros.q || filtros.estado || filtros.nivel || filtros.modalidad || filtros.institucion,
  );
}
```

## Paso 2. Servicio de cursos

`listarCursos` devuelve la página de cursos, acceso denegado o servidor sin respuesta, igual que el servicio de clubes. `contarCursosPorEstado` lanza las cuatro consultas de conteo en paralelo con los demás filtros aplicados. Las dos usan `tokenDeSesion`, `conSesion`, `intentar` y `exigirAutenticacion` de `con-sesion.ts`.

Archivo: `web/src/lib/api/cursos.ts`

```typescript
import "server-only";
import {
  CURSOS_POR_PAGINA,
  ESTADOS_DE_CURSO,
  type EstadoCurso,
  type FiltrosCursos,
} from "@/lib/portal/filtros-cursos";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";

export type Curso = Esquemas["CursoResponse"];
export type HorarioDeCurso = Esquemas["HorarioResponse"];

export type PaginaDeCursos = {
  cursos: Curso[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

export type ResultadoDeCursos =
  | { estado: "ok"; datos: PaginaDeCursos }
  | { estado: "denegado"; mensaje: string }
  | { estado: "sin-servicio" };

export type ConteosPorEstado = Record<EstadoCurso, number | null>;

const ACCESO_DENEGADO = 403;
const MENSAJE_DENEGADO = "Tu cuenta no tiene permiso para ver esta lista.";

function consultaDe(filtros: FiltrosCursos, estado: EstadoCurso | null) {
  return {
    q: filtros.q || undefined,
    estado: estado ?? undefined,
    nivel: filtros.nivel ?? undefined,
    modalidad: filtros.modalidad ?? undefined,
    institucionId: filtros.institucion ?? undefined,
  };
}

export async function listarCursos(filtros: FiltrosCursos): Promise<ResultadoDeCursos> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/cursos", {
      ...conSesion(token),
      params: {
        query: {
          ...consultaDe(filtros, filtros.estado),
          pagina: filtros.pagina - 1,
          tamano: CURSOS_POR_PAGINA,
        },
      },
    }),
  );

  exigirAutenticacion(respuesta);

  if (respuesta.estado === ACCESO_DENEGADO) {
    return { estado: "denegado", mensaje: respuesta.detalle ?? MENSAJE_DENEGADO };
  }
  if (!respuesta.datos) {
    return { estado: "sin-servicio" };
  }

  return {
    estado: "ok",
    datos: {
      cursos: respuesta.datos.contenido ?? [],
      total: respuesta.datos.totalElementos ?? 0,
      pagina: (respuesta.datos.pagina ?? 0) + 1,
      totalPaginas: Math.max(respuesta.datos.totalPaginas ?? 1, 1),
    },
  };
}

export async function contarCursosPorEstado(filtros: FiltrosCursos): Promise<ConteosPorEstado> {
  const token = await tokenDeSesion();

  const respuestas = await Promise.all(
    ESTADOS_DE_CURSO.map((estado) =>
      intentar(
        api.GET("/api/cursos", {
          ...conSesion(token),
          params: { query: { ...consultaDe(filtros, estado), pagina: 0, tamano: 1 } },
        }),
      ),
    ),
  );

  exigirAutenticacion(...respuestas);

  return Object.fromEntries(
    ESTADOS_DE_CURSO.map((estado, indice) => [
      estado,
      respuestas[indice].datos?.totalElementos ?? null,
    ]),
  ) as ConteosPorEstado;
}
```

## Paso 3. El menú registra Cursos como sección construida

Una sola línea cambia: `MODULOS_CONSTRUIDOS` ahora incluye `cursos`, así deja de usar la página provisional.

Archivo: `web/src/lib/portal/menu.ts`

```typescript
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
const MODULOS_CONSTRUIDOS: readonly IdOpcion[] = ["clubes", "cursos"];
const ROLES_GLOBALES: readonly Rol[] = ["ADMIN", "COORDINADOR", "CONSULTA"];

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

const ACCESOS_POR_ROL: Record<Rol, readonly IdOpcion[]> = {
  ADMIN: ["usuarios", "instituciones", "periodos"],
  COORDINADOR: ["seguimiento", "avances", "clubes"],
  RESP_INSTITUCIONAL: ["solicitudes", "clubes", "certificados"],
  DOCENTE: ["actividades", "asistencia", "evidencias"],
  CONSULTA: ["seguimiento", "avances", "auditoria"],
};

export function accesosRapidosParaRol(rol?: string): OpcionMenu[] {
  if (!esRol(rol)) {
    return [];
  }
  const permitidas = seccionesParaRol(rol).flatMap((seccion) => seccion.opciones);
  return ACCESOS_POR_ROL[rol].flatMap((id) => permitidas.filter((opcion) => opcion.id === id));
}

const DESCRIPCIONES_DE_ROL: Record<Rol, string> = {
  ADMIN: "Administras el sistema completo: usuarios, instituciones, períodos y catálogos.",
  COORDINADOR: "Sigues el avance de los clubes de todas las instituciones y revisas sus resultados.",
  RESP_INSTITUCIONAL:
    "Gestionas los clubes, los cursos, las inscripciones y los certificados de tu institución.",
  DOCENTE: "Planificas las sesiones de tus clubes, pasas asistencia y cargas las evidencias.",
  CONSULTA: "Consultas la información y los reportes del proyecto sin modificar registros.",
};

export function descripcionDeRol(rol?: string): string {
  return esRol(rol) ? DESCRIPCIONES_DE_ROL[rol] : "";
}

export const MODULOS_DEL_PORTAL: ModuloPortal[] = SECCIONES.flatMap((seccion) =>
  seccion.opciones
    .filter((opcion) => opcion.id !== ID_PANEL && !MODULOS_CONSTRUIDOS.includes(opcion.id))
    .map((opcion) => ({ id: opcion.id, etiqueta: opcion.etiqueta, roles: opcion.roles })),
);

export function buscarModulo(id: string): ModuloPortal | undefined {
  return MODULOS_DEL_PORTAL.find((modulo) => modulo.id === id);
}

export function tieneAlcanceGlobal(rol?: string): boolean {
  return esRol(rol) && ROLES_GLOBALES.includes(rol);
}

export function rolPuedeVer(modulo: ModuloPortal, rol?: string): boolean {
  return esRol(rol) && modulo.roles.includes(rol);
}
```

# Parte B. Piezas compartidas

## Paso 4. Controles de filtro

Reúne lo que antes estaba dentro de `FiltrosClubes`. `useFiltrosEnUrl` maneja el texto de la búsqueda, la espera de 350 ms y la navegación; sirve para cualquier lista cuyos filtros tengan `q` y `pagina`. `CampoDeBusqueda`, `Selector` y `BotonQuitarFiltros` son los controles, y `EsqueletoFiltros` recibe los anchos de cada control para ocupar el mismo espacio.

Archivo: `web/src/components/portal/ControlesDeFiltro.tsx`

```tsx
"use client";

import { ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CONTROL, ETIQUETA_CONTROL } from "@/components/ui/estilos-control";
import { useBusqueda } from "./Busqueda";

const ESPERA_AL_ESCRIBIR_MS = 350;
const LONGITUD_MAXIMA = 80;
const ICONO_EN_CAMPO = "pointer-events-none absolute top-1/2 -translate-y-1/2 text-tenue";

type FiltrosBasicos = { q: string; pagina: number };

export function useFiltrosEnUrl<F extends FiltrosBasicos>(
  filtros: F,
  rutaDe: (filtros: F) => string,
  vacios: F,
) {
  const { navegar } = useBusqueda();
  const [texto, setTexto] = useState(filtros.q);
  const [busquedaVista, setBusquedaVista] = useState(filtros.q);
  const [escribiendo, setEscribiendo] = useState(false);
  const deseados = useRef(filtros);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (filtros.q !== busquedaVista) {
    setBusquedaVista(filtros.q);
    if (!escribiendo) {
      setTexto(filtros.q);
    }
  }

  useEffect(() => {
    deseados.current = filtros;
  }, [filtros]);

  useEffect(() => {
    return () => {
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
    };
  }, []);

  function cancelarEspera() {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    setEscribiendo(false);
  }

  function aplicar(cambios: Partial<F>, reemplazar: boolean) {
    const siguientes = { ...deseados.current, ...cambios, pagina: 1 };
    deseados.current = siguientes;
    navegar(rutaDe(siguientes), { reemplazar, conservarPosicion: true });
  }

  function alEscribir(valor: string) {
    setTexto(valor);
    setEscribiendo(true);
    if (temporizador.current) {
      clearTimeout(temporizador.current);
    }
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      setEscribiendo(false);
      aplicar({ q: valor.trim() } as Partial<F>, true);
    }, ESPERA_AL_ESCRIBIR_MS);
  }

  function cambiar(cambios: Partial<F>) {
    cancelarEspera();
    aplicar({ ...cambios, q: texto.trim() }, false);
  }

  function enviar() {
    cancelarEspera();
    aplicar({ q: texto.trim() } as Partial<F>, true);
  }

  function quitar() {
    cancelarEspera();
    setTexto("");
    deseados.current = vacios;
    navegar(rutaDe(vacios), { conservarPosicion: true });
  }

  return { texto, alEscribir, cambiar, enviar, quitar };
}

export function CampoDeBusqueda({
  etiqueta,
  texto,
  alEscribir,
  placeholder,
}: {
  etiqueta: string;
  texto: string;
  alEscribir: (valor: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const { pendiente } = useBusqueda();

  return (
    <div className="min-w-0 md:min-w-[16rem] md:flex-1">
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <Search aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} left-3.5`} />
        <input
          id={id}
          type="search"
          name="q"
          value={texto}
          onChange={(evento) => alEscribir(evento.target.value)}
          maxLength={LONGITUD_MAXIMA}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className={`${CONTROL} h-11 pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden`}
        />
        {pendiente ? (
          <LoaderCircle
            aria-hidden="true"
            size={18}
            className={`${ICONO_EN_CAMPO} right-3.5 animate-spin [animation-duration:600ms]`}
          />
        ) : null}
      </div>
    </div>
  );
}

export function Selector({
  etiqueta,
  valor,
  opciones,
  alCambiar,
  textoDeTodos,
  className = "md:w-48",
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  alCambiar: (valor: string) => void;
  textoDeTodos: string;
  className?: string;
}) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          className={`${CONTROL} h-11 appearance-none truncate pr-10`}
        >
          <option value="">{textoDeTodos}</option>
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} right-3`} />
      </div>
    </div>
  );
}

export function BotonQuitarFiltros({
  visible,
  alPulsar,
}: {
  visible: boolean;
  alPulsar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={!visible}
      className="inline-flex h-11 shrink-0 select-none items-center justify-center gap-2 rounded-control px-3 text-[0.9375rem] font-medium text-tenue transition-[transform,background-color,color,opacity] duration-150 ease-salida hover:bg-superficie hover:text-tinta active:scale-[0.97] disabled:pointer-events-none disabled:opacity-0"
    >
      <X aria-hidden="true" size={16} />
      Quitar filtros
    </button>
  );
}

export function EsqueletoFiltros({ anchos }: { anchos: string[] }) {
  return (
    <div
      aria-hidden="true"
      className="mt-6 flex flex-col gap-4 motion-safe:animate-pulse md:flex-row md:flex-wrap md:items-end"
    >
      {anchos.map((ancho, indice) => (
        <div key={indice} className={ancho}>
          <div className="flex h-[1.40625rem] items-center">
            <div className="h-3.5 w-28 rounded-full bg-superficie" />
          </div>
          <div className="mt-2 h-11 rounded-control bg-superficie" />
        </div>
      ))}
      <div className="hidden h-11 w-[8.5625rem] shrink-0 md:block" />
    </div>
  );
}
```

## Paso 5. Paginación genérica

Reemplaza a `PaginacionClubes.tsx`, que se elimina. Ya no conoce los filtros: recibe del servidor las direcciones de la página anterior y la siguiente.

Archivo: `web/src/components/portal/Paginacion.tsx`

```tsx
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { useBusqueda } from "./Busqueda";

type Props = {
  etiqueta: string;
  pagina: number;
  totalPaginas: number;
  rutaAnterior: string | null;
  rutaSiguiente: string | null;
};

export function Paginacion({ etiqueta, pagina, totalPaginas, rutaAnterior, rutaSiguiente }: Props) {
  const { navegar } = useBusqueda();

  if (totalPaginas <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={etiqueta}
      className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
    >
      <p className="cifras text-[0.9375rem] text-tenue">
        Página {pagina} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={!rutaAnterior}
          onClick={() => rutaAnterior && navegar(rutaAnterior)}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Anterior
        </Boton>
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={!rutaSiguiente}
          onClick={() => rutaSiguiente && navegar(rutaSiguiente)}
        >
          Siguiente
          <ArrowRight aria-hidden="true" size={16} />
        </Boton>
      </div>
    </nav>
  );
}
```

## Paso 6. Aviso de lista

El aviso con icono, título, texto y acción que usaba la página de clubes, ahora en su propio archivo.

Archivo: `web/src/components/portal/AvisoDeLista.tsx`

```tsx
import type { ReactNode } from "react";

type Props = {
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
  urgente?: boolean;
};

export function AvisoDeLista({ icono, titulo, children, accion, urgente = false }: Props) {
  return (
    <div
      role={urgente ? "alert" : undefined}
      className="flex flex-col items-start gap-4 rounded-pieza bg-superficie p-6 sm:flex-row sm:p-8"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-control bg-superficie-alta text-tenue"
      >
        {icono}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-medium">{titulo}</h2>
        <p className="mt-1.5 max-w-[60ch] text-tenue">{children}</p>
        {accion ? <div className="mt-5">{accion}</div> : null}
      </div>
    </div>
  );
}
```

## Paso 7. Esqueleto de lista

El esqueleto de tabla y fichas que estaba dentro de `TablaClubes`. Recibe el mensaje que se anuncia a los lectores de pantalla.

Archivo: `web/src/components/portal/EsqueletoLista.tsx`

```tsx
const FILAS_DE_ESPERA = [0, 1, 2, 3, 4, 5];

export function EsqueletoLista({ mensaje }: { mensaje: string }) {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        {mensaje}
      </p>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="flex h-6 items-center">
          <div className="h-3.5 w-56 max-w-full rounded-full bg-superficie" />
        </div>
        <div className="mt-4 hidden rounded-pieza bg-superficie md:block">
          <div className="h-[2.8125rem] border-b border-linea" />
          {FILAS_DE_ESPERA.map((fila) => (
            <div
              key={fila}
              className="flex h-[4.5rem] items-center gap-8 border-b border-linea px-5 last:border-b-0"
            >
              <div className="h-4 w-48 rounded-full bg-superficie-alta" />
              <div className="h-4 w-40 rounded-full bg-superficie-alta" />
              <div className="h-4 w-32 rounded-full bg-superficie-alta" />
              <div className="ml-auto h-4 w-20 rounded-full bg-superficie-alta" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 md:hidden">
          {FILAS_DE_ESPERA.slice(0, 3).map((fila) => (
            <div key={fila} className="h-40 rounded-pieza bg-superficie" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

# Parte C. Clubes sobre las piezas compartidas

## Paso 8. Filtros vacíos de clubes

Se agrega `FILTROS_DE_CLUBES_VACIOS`, que `useFiltrosEnUrl` usa al pulsar Quitar filtros.

Archivo: `web/src/lib/portal/filtros-clubes.ts`

```typescript
export const ESTADOS_DE_CLUB = ["PLANIFICADO", "ACTIVO", "SUSPENDIDO", "CERRADO"] as const;

export type EstadoClub = (typeof ESTADOS_DE_CLUB)[number];

export const NOMBRES_DE_ESTADO: Record<EstadoClub, string> = {
  PLANIFICADO: "Planificado",
  ACTIVO: "Activo",
  SUSPENDIDO: "Suspendido",
  CERRADO: "Cerrado",
};

export type FiltrosClubes = {
  q: string;
  estado: EstadoClub | null;
  institucion: number | null;
  pagina: number;
};

export type ParametrosDeBusqueda = Record<string, string | string[] | undefined>;

export const RUTA_CLUBES = "/portal/clubes";
export const CLUBES_POR_PAGINA = 10;

export const FILTROS_DE_CLUBES_VACIOS: FiltrosClubes = {
  q: "",
  estado: null,
  institucion: null,
  pagina: 1,
};

const LONGITUD_MAXIMA_BUSQUEDA = 80;

function primero(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

function enteroPositivo(texto: string): number | null {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

export function leerFiltros(parametros: ParametrosDeBusqueda): FiltrosClubes {
  const estado = primero(parametros.estado);
  return {
    q: primero(parametros.q).trim().slice(0, LONGITUD_MAXIMA_BUSQUEDA),
    estado: ESTADOS_DE_CLUB.includes(estado as EstadoClub) ? (estado as EstadoClub) : null,
    institucion: enteroPositivo(primero(parametros.institucion)),
    pagina: enteroPositivo(primero(parametros.pagina)) ?? 1,
  };
}

export function rutaConFiltros(filtros: FiltrosClubes): string {
  const parametros = new URLSearchParams();
  if (filtros.q) {
    parametros.set("q", filtros.q);
  }
  if (filtros.estado) {
    parametros.set("estado", filtros.estado);
  }
  if (filtros.institucion) {
    parametros.set("institucion", String(filtros.institucion));
  }
  if (filtros.pagina > 1) {
    parametros.set("pagina", String(filtros.pagina));
  }
  const consulta = parametros.toString();
  return consulta ? `${RUTA_CLUBES}?${consulta}` : RUTA_CLUBES;
}

export function hayFiltrosActivos(filtros: FiltrosClubes): boolean {
  return Boolean(filtros.q || filtros.estado || filtros.institucion);
}
```

## Paso 9. FiltrosClubes más corto

Hace lo mismo que antes con la cuarta parte del código, porque la lógica vive en `ControlesDeFiltro`.

Archivo: `web/src/components/portal/clubes/FiltrosClubes.tsx`

```tsx
"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import type { OpcionDeInstitucion } from "@/lib/api/clubes";
import {
  ESTADOS_DE_CLUB,
  FILTROS_DE_CLUBES_VACIOS,
  NOMBRES_DE_ESTADO,
  hayFiltrosActivos,
  rutaConFiltros,
  type EstadoClub,
  type FiltrosClubes as Filtros,
} from "@/lib/portal/filtros-clubes";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
};

const OPCIONES_DE_ESTADO = ESTADOS_DE_CLUB.map((estado) => ({
  valor: estado,
  texto: NOMBRES_DE_ESTADO[estado],
}));

export function FiltrosClubes({ filtros, instituciones }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaConFiltros,
    FILTROS_DE_CLUBES_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de clubes"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por nombre"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Robótica, programación"
      />
      <Selector
        etiqueta="Estado"
        valor={filtros.estado ?? ""}
        opciones={OPCIONES_DE_ESTADO}
        textoDeTodos="Todos"
        alCambiar={(valor) => cambiar({ estado: (valor || null) as EstadoClub | null })}
      />
      {instituciones ? (
        <Selector
          etiqueta="Institución"
          valor={filtros.institucion ? String(filtros.institucion) : ""}
          opciones={instituciones.map((institucion) => ({
            valor: String(institucion.id),
            texto: institucion.nombre ?? "",
          }))}
          textoDeTodos="Todas"
          className="md:w-72"
          alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null })}
        />
      ) : null}
      <BotonQuitarFiltros
        visible={hayFiltrosActivos(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
```

## Paso 10. TablaClubes sin su esqueleto

Solo se quita `EsqueletoTabla`, que ahora es `EsqueletoLista`. La tabla y las fichas no cambian.

Archivo: `web/src/components/portal/clubes/TablaClubes.tsx`

```tsx
import type { Club } from "@/lib/api/clubes";
import { NOMBRES_DE_ESTADO, type EstadoClub } from "@/lib/portal/filtros-clubes";

type Props = {
  clubes: Club[];
  mostrarInstitucion: boolean;
};

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const SIN_DATO = "—";

const PUNTOS: Record<EstadoClub, string> = {
  PLANIFICADO: "bg-acento",
  ACTIVO: "bg-exito",
  SUSPENDIDO: "bg-aviso",
  CERRADO: "bg-tenue",
};

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function horaCorta(hora?: string): string {
  return hora ? hora.slice(0, 5) : "";
}

function horarioDe(club: Club): string {
  const dia = club.diaSemana ? DIAS[club.diaSemana] : "";
  if (!dia) {
    return "Sin horario";
  }
  const inicio = horaCorta(club.horaInicio);
  const fin = horaCorta(club.horaFin);
  return inicio && fin ? `${dia}, ${inicio} a ${fin}` : dia;
}

function integrantesDe(club: Club): string {
  const activos = club.integrantesActivos ?? 0;
  return typeof club.cupoMaximo === "number" ? `${activos} de ${club.cupoMaximo}` : String(activos);
}

function estaCompleto(club: Club): boolean {
  return club.cuposDisponibles === 0 && typeof club.cupoMaximo === "number";
}

function Estado({ estado }: { estado?: EstadoClub }) {
  if (!estado) {
    return <span className="text-tenue">{SIN_DATO}</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${PUNTOS[estado]}`} />
      {NOMBRES_DE_ESTADO[estado]}
    </span>
  );
}

function Detalle({ club }: { club: Club }) {
  const partes = [club.periodoNombre, club.lugar].filter(Boolean);
  return partes.length > 0 ? (
    <span className="mt-0.5 block text-sm text-tenue">{partes.join(" · ")}</span>
  ) : null;
}

export function TablaClubes({ clubes, mostrarInstitucion }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie md:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de clubes</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} ${mostrarInstitucion ? "w-[28%]" : "w-[40%]"}`}>
                Club
              </th>
              {mostrarInstitucion ? (
                <th scope="col" className={`${ENCABEZADO} w-[20%]`}>
                  Institución
                </th>
              ) : null}
              <th scope="col" className={`${ENCABEZADO} ${mostrarInstitucion ? "w-[15%]" : "w-[22%]"}`}>
                Docente
              </th>
              <th scope="col" className={ENCABEZADO}>
                Horario
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                Integrantes
              </th>
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {clubes.map((club) => (
              <tr key={club.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{club.nombre}</span>
                  <Detalle club={club} />
                </th>
                {mostrarInstitucion ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {club.institucionNombre ?? SIN_DATO}
                  </td>
                ) : null}
                <td className={`${CELDA} break-words`}>
                  {club.docenteNombre ?? <span className="text-tenue">Sin docente</span>}
                </td>
                <td className={`${CELDA} cifras whitespace-nowrap`}>{horarioDe(club)}</td>
                <td className={`${CELDA} cifras whitespace-nowrap text-right`}>
                  {integrantesDe(club)}
                  {estaCompleto(club) ? (
                    <span className="mt-0.5 block text-sm text-aviso">Completo</span>
                  ) : null}
                </td>
                <td className={CELDA}>
                  <Estado estado={club.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {clubes.map((club) => (
          <li key={club.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{club.nombre}</p>
              <span className="shrink-0 text-sm">
                <Estado estado={club.estado} />
              </span>
            </div>
            <Detalle club={club} />
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{club.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Docente</dt>
              <dd className="min-w-0 break-words">{club.docenteNombre ?? "Sin docente"}</dd>
              <dt className="text-tenue">Horario</dt>
              <dd className="cifras">{horarioDe(club)}</dd>
              <dt className="text-tenue">Integrantes</dt>
              <dd className="cifras">
                {integrantesDe(club)}
                {estaCompleto(club) ? <span className="ml-2 text-sm text-aviso">Completo</span> : null}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
```

## Paso 11. Página de clubes

Usa `AvisoDeLista`, `EsqueletoLista`, `EsqueletoFiltros` y `Paginacion`. La pantalla se ve y se comporta igual.

Archivo: `web/src/app/portal/clubes/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, SearchX, ShieldAlert, Users } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { FiltrosClubes } from "@/components/portal/clubes/FiltrosClubes";
import { TablaClubes } from "@/components/portal/clubes/TablaClubes";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { listarClubes, listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import {
  CLUBES_POR_PAGINA,
  RUTA_CLUBES,
  hayFiltrosActivos,
  leerFiltros,
  rutaConFiltros,
  type ParametrosDeBusqueda,
} from "@/lib/portal/filtros-clubes";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Clubes",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ROL_DOCENTE = "DOCENTE";
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-48", "md:w-72"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return rol === ROL_DOCENTE ? "a tu cargo" : "de tu institución";
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltros(await parametros);
  const usuario = await exigirSesion();
  const instituciones = tieneAlcanceGlobal(usuario?.rol)
    ? await listarInstitucionesParaFiltro()
    : null;

  return <FiltrosClubes filtros={filtros} instituciones={instituciones} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltros(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarClubes(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los clubes"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada y los
        filtros se conservan.
      </AvisoDeLista>
    );
  }

  if (resultado.estado === "denegado") {
    return (
      <AvisoDeLista urgente icono={<ShieldAlert size={20} />} titulo="No tienes acceso a esta lista">
        {resultado.mensaje}
      </AvisoDeLista>
    );
  }

  const { clubes, total, pagina, totalPaginas } = resultado.datos;

  if (clubes.length === 0 && total > 0) {
    redirect(rutaConFiltros({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosActivos(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún club coincide con los filtros"
        accion={
          <Link href={RUTA_CLUBES} className="font-medium text-acento">
            Ver todos los clubes
          </Link>
        }
      >
        Prueba con otro nombre o cambia el estado o la institución.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<Users size={20} />} titulo="Todavía no hay clubes">
        {usuario?.rol === ROL_DOCENTE
          ? "No tienes clubes a tu cargo. El responsable de tu institución puede asignarte uno."
          : "Cuando se registre el primer club aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * CLUBES_POR_PAGINA + 1;
  const ultimo = primero + clubes.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 club ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} clubes ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaClubes clubes={clubes} mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)} />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de clubes"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaConFiltros({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaConFiltros({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaClubes({ searchParams }: PageProps<"/portal/clubes">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Clubes</h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Consulta los clubes de robótica y programación con su docente, su horario y sus cupos.
      </p>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de clubes." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
```

# Parte D. Interfaz de cursos

## Paso 12. Filtros de cursos

Búsqueda por nombre, nivel, modalidad e institución. La institución solo aparece para los roles que ven todas.

Archivo: `web/src/components/portal/cursos/FiltrosCursos.tsx`

```tsx
"use client";

import type { FormEvent } from "react";
import {
  BotonQuitarFiltros,
  CampoDeBusqueda,
  Selector,
  useFiltrosEnUrl,
} from "@/components/portal/ControlesDeFiltro";
import type { OpcionDeInstitucion } from "@/lib/api/clubes";
import {
  FILTROS_DE_CURSOS_VACIOS,
  MODALIDADES_DE_CURSO,
  NIVELES_DE_CURSO,
  NOMBRES_DE_MODALIDAD,
  NOMBRES_DE_NIVEL,
  hayFiltrosDeCursos,
  rutaDeCursos,
  type FiltrosCursos as Filtros,
  type ModalidadCurso,
  type NivelCurso,
} from "@/lib/portal/filtros-cursos";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
};

const OPCIONES_DE_NIVEL = NIVELES_DE_CURSO.map((nivel) => ({
  valor: nivel,
  texto: NOMBRES_DE_NIVEL[nivel],
}));

const OPCIONES_DE_MODALIDAD = MODALIDADES_DE_CURSO.map((modalidad) => ({
  valor: modalidad,
  texto: NOMBRES_DE_MODALIDAD[modalidad],
}));

export function FiltrosCursos({ filtros, instituciones }: Props) {
  const { texto, alEscribir, cambiar, enviar, quitar } = useFiltrosEnUrl(
    filtros,
    rutaDeCursos,
    FILTROS_DE_CURSOS_VACIOS,
  );

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    enviar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de cursos"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <CampoDeBusqueda
        etiqueta="Buscar por nombre"
        texto={texto}
        alEscribir={alEscribir}
        placeholder="Scratch, Arduino"
      />
      <Selector
        etiqueta="Nivel"
        valor={filtros.nivel ?? ""}
        opciones={OPCIONES_DE_NIVEL}
        textoDeTodos="Todos"
        className="md:w-44"
        alCambiar={(valor) => cambiar({ nivel: (valor || null) as NivelCurso | null })}
      />
      <Selector
        etiqueta="Modalidad"
        valor={filtros.modalidad ?? ""}
        opciones={OPCIONES_DE_MODALIDAD}
        textoDeTodos="Todas"
        className="md:w-44"
        alCambiar={(valor) => cambiar({ modalidad: (valor || null) as ModalidadCurso | null })}
      />
      {instituciones ? (
        <Selector
          etiqueta="Institución"
          valor={filtros.institucion ? String(filtros.institucion) : ""}
          opciones={instituciones.map((institucion) => ({
            valor: String(institucion.id),
            texto: institucion.nombre ?? "",
          }))}
          textoDeTodos="Todas"
          className="md:w-64"
          alCambiar={(valor) => cambiar({ institucion: valor ? Number(valor) : null })}
        />
      ) : null}
      <BotonQuitarFiltros
        visible={hayFiltrosDeCursos(filtros) || texto.trim() !== ""}
        alPulsar={quitar}
      />
    </form>
  );
}
```

## Paso 13. Resumen por estado

Cuatro botones con el total de cada estado. El elegido lleva `aria-pressed`. Si el backend no puede dar un total, la ficha muestra una raya. El esqueleto tiene la misma altura fija, así la tabla no se mueve al cargar.

Archivo: `web/src/components/portal/cursos/ResumenPorEstado.tsx`

```tsx
"use client";

import { useBusqueda } from "@/components/portal/Busqueda";
import type { ConteosPorEstado } from "@/lib/api/cursos";
import {
  ESTADOS_DE_CURSO,
  NOMBRES_DE_ESTADO_DE_CURSO,
  PUNTOS_DE_ESTADO_DE_CURSO,
  rutaDeCursos,
  type EstadoCurso,
  type FiltrosCursos,
} from "@/lib/portal/filtros-cursos";

type Props = {
  filtros: FiltrosCursos;
  conteos: ConteosPorEstado;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const SIN_DATO = "—";

const REJILLA = "mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4";
const FICHA = "flex h-[4.75rem] flex-col justify-between rounded-pieza border p-4 text-left";

export function ResumenPorEstado({ filtros, conteos }: Props) {
  const { navegar } = useBusqueda();

  function alternar(estado: EstadoCurso) {
    const siguiente = filtros.estado === estado ? null : estado;
    navegar(rutaDeCursos({ ...filtros, estado: siguiente, pagina: 1 }), {
      conservarPosicion: true,
    });
  }

  return (
    <div role="group" aria-label="Cursos por estado" className={REJILLA}>
      {ESTADOS_DE_CURSO.map((estado) => {
        const elegido = filtros.estado === estado;
        const cantidad = conteos[estado];
        return (
          <button
            key={estado}
            type="button"
            aria-pressed={elegido}
            onClick={() => alternar(estado)}
            className={`${FICHA} select-none transition-[transform,background-color,border-color] duration-150 ease-salida active:scale-[0.98] ${
              elegido
                ? "border-acento bg-superficie-alta"
                : "border-transparent bg-superficie hover:bg-superficie-alta"
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-tenue">
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${PUNTOS_DE_ESTADO_DE_CURSO[estado]}`}
              />
              {NOMBRES_DE_ESTADO_DE_CURSO[estado]}
            </span>
            <span className="cifras text-2xl font-medium leading-none tracking-tight">
              {typeof cantidad === "number" ? FORMATO_NUMERO.format(cantidad) : SIN_DATO}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EsqueletoResumenPorEstado() {
  return (
    <div aria-hidden="true" className={`${REJILLA} motion-safe:animate-pulse`}>
      {ESTADOS_DE_CURSO.map((estado) => (
        <div key={estado} className={`${FICHA} border-transparent bg-superficie`}>
          <span className="h-3 w-20 rounded-full bg-superficie-alta" />
          <span className="h-5 w-10 rounded-[6px] bg-superficie-alta" />
        </div>
      ))}
    </div>
  );
}
```

## Paso 14. Tabla y fichas de cursos

Componente de servidor. Debajo del nombre muestra el club y, en una línea, el nivel, la modalidad y la duración. La columna de horario lista cada sesión semanal y las horas por semana; en cursos híbridos indica si cada sesión es presencial o virtual. Las fechas van en dos líneas que no se parten.

Archivo: `web/src/components/portal/cursos/TablaCursos.tsx`

```tsx
import type { Curso, HorarioDeCurso } from "@/lib/api/cursos";
import {
  NOMBRES_DE_ESTADO_DE_CURSO,
  NOMBRES_DE_MODALIDAD,
  NOMBRES_DE_NIVEL,
  PUNTOS_DE_ESTADO_DE_CURSO,
  type EstadoCurso,
} from "@/lib/portal/filtros-cursos";

type Props = {
  cursos: Curso[];
  mostrarInstitucion: boolean;
};

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const SIN_DATO = "—";
const MODALIDAD_HIBRIDA = "HIBRIDO";
const SESION_VIRTUAL = "VIRTUAL";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const FORMATO_HORAS = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

const CELDA = "px-5 py-3.5 align-top";
const ENCABEZADO = "px-5 py-3 text-left text-sm font-medium text-tenue";

function horaCorta(hora?: string): string {
  return hora ? hora.slice(0, 5) : "";
}

function fechaCorta(fecha?: string): string {
  return fecha ? FORMATO_FECHA.format(new Date(`${fecha}T00:00:00Z`)) : "";
}

function textoDeHorario(horario: HorarioDeCurso, hibrido: boolean): string {
  const dia = horario.diaSemana ? DIAS[horario.diaSemana] : (horario.dia ?? "");
  const base = `${dia}, ${horaCorta(horario.horaInicio)} a ${horaCorta(horario.horaFin)}`;
  if (!hibrido) {
    return base;
  }
  return `${base} · ${horario.tipoSesion === SESION_VIRTUAL ? "Virtual" : "Presencial"}`;
}

function fechasDe(curso: Curso): string {
  const inicio = fechaCorta(curso.fechaInicio);
  const fin = fechaCorta(curso.fechaFin);
  if (inicio && fin) {
    return `${inicio} al ${fin}`;
  }
  return inicio || fin || "Sin fechas";
}

function inscritosDe(curso: Curso): string {
  const activos = curso.inscritosActivos ?? 0;
  return typeof curso.cupoMaximo === "number" ? `${activos} de ${curso.cupoMaximo}` : String(activos);
}

function estaCompleto(curso: Curso): boolean {
  return curso.cuposDisponibles === 0 && typeof curso.cupoMaximo === "number";
}

function caracteristicasDe(curso: Curso): string {
  return [
    curso.nivel ? NOMBRES_DE_NIVEL[curso.nivel] : null,
    curso.modalidad ? NOMBRES_DE_MODALIDAD[curso.modalidad] : null,
    typeof curso.duracionHoras === "number" ? `${curso.duracionHoras} h` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Estado({ estado }: { estado?: EstadoCurso }) {
  if (!estado) {
    return <span className="text-tenue">{SIN_DATO}</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${PUNTOS_DE_ESTADO_DE_CURSO[estado]}`}
      />
      {NOMBRES_DE_ESTADO_DE_CURSO[estado]}
    </span>
  );
}

function Horarios({ curso }: { curso: Curso }) {
  const horarios = curso.horarios ?? [];
  if (horarios.length === 0) {
    return <span className="text-tenue">Sin horario</span>;
  }
  const hibrido = curso.modalidad === MODALIDAD_HIBRIDA;
  return (
    <>
      <ul className="cifras">
        {horarios.map((horario) => (
          <li key={horario.id}>
            {textoDeHorario(horario, hibrido)}
          </li>
        ))}
      </ul>
      {typeof curso.horasSemanales === "number" ? (
        <span className="cifras mt-0.5 block text-sm text-tenue">
          {FORMATO_HORAS.format(curso.horasSemanales)} h por semana
        </span>
      ) : null}
    </>
  );
}

function FechasEnDosLineas({ curso }: { curso: Curso }) {
  const inicio = fechaCorta(curso.fechaInicio);
  const fin = fechaCorta(curso.fechaFin);
  if (!inicio || !fin) {
    return <span className="whitespace-nowrap">{fechasDe(curso)}</span>;
  }
  return (
    <>
      <span className="block whitespace-nowrap">{inicio}</span>
      <span className="block whitespace-nowrap">al {fin}</span>
    </>
  );
}

function Detalle({ curso }: { curso: Curso }) {
  const caracteristicas = caracteristicasDe(curso);
  return (
    <>
      {curso.clubNombre ? (
        <span className="mt-0.5 block break-words text-sm font-normal text-tenue">
          {curso.clubNombre}
        </span>
      ) : null}
      {caracteristicas ? (
        <span className="mt-0.5 block text-sm font-normal text-tenue">{caracteristicas}</span>
      ) : null}
    </>
  );
}

export function TablaCursos({ cursos, mostrarInstitucion }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-pieza bg-superficie xl:block">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Lista de cursos</caption>
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className={`${ENCABEZADO} ${mostrarInstitucion ? "w-[25%]" : "w-[36%]"}`}>
                Curso
              </th>
              {mostrarInstitucion ? (
                <th scope="col" className={`${ENCABEZADO} w-[17%]`}>
                  Institución
                </th>
              ) : null}
              <th scope="col" className={ENCABEZADO}>
                Horario
              </th>
              <th scope="col" className={ENCABEZADO}>
                Fechas
              </th>
              <th scope="col" className={`${ENCABEZADO} text-right`}>
                Inscritos
              </th>
              <th scope="col" className={ENCABEZADO}>
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {cursos.map((curso) => (
              <tr key={curso.id} className="border-b border-linea last:border-b-0">
                <th scope="row" className={`${CELDA} text-left font-medium`}>
                  <span className="block break-words">{curso.nombre}</span>
                  <Detalle curso={curso} />
                </th>
                {mostrarInstitucion ? (
                  <td className={`${CELDA} break-words text-tenue`}>
                    {curso.institucionNombre ?? SIN_DATO}
                  </td>
                ) : null}
                <td className={CELDA}>
                  <Horarios curso={curso} />
                </td>
                <td className={`${CELDA} cifras`}>
                  <FechasEnDosLineas curso={curso} />
                </td>
                <td className={`${CELDA} cifras whitespace-nowrap text-right`}>
                  {inscritosDe(curso)}
                  {estaCompleto(curso) ? (
                    <span className="mt-0.5 block text-sm text-aviso">Completo</span>
                  ) : null}
                </td>
                <td className={CELDA}>
                  <Estado estado={curso.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {cursos.map((curso) => (
          <li key={curso.id} className="rounded-pieza bg-superficie p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 break-words font-medium">{curso.nombre}</p>
              <span className="shrink-0 text-sm">
                <Estado estado={curso.estado} />
              </span>
            </div>
            <Detalle curso={curso} />
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              {mostrarInstitucion ? (
                <>
                  <dt className="text-tenue">Institución</dt>
                  <dd className="min-w-0 break-words">{curso.institucionNombre ?? SIN_DATO}</dd>
                </>
              ) : null}
              <dt className="text-tenue">Horario</dt>
              <dd className="min-w-0">
                <Horarios curso={curso} />
              </dd>
              <dt className="text-tenue">Fechas</dt>
              <dd className="cifras">{fechasDe(curso)}</dd>
              <dt className="text-tenue">Inscritos</dt>
              <dd className="cifras">
                {inscritosDe(curso)}
                {estaCompleto(curso) ? <span className="ml-2 text-sm text-aviso">Completo</span> : null}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
```

## Paso 15. Página de cursos

Tres fronteras de `<Suspense>`: los filtros, el resumen por estado y los resultados. Cada una lee la dirección y consulta por su cuenta, así la tabla no espera a los conteos.

Archivo: `web/src/app/portal/cursos/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CircleAlert, SearchX, ShieldAlert } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros } from "@/components/portal/ControlesDeFiltro";
import { FiltrosCursos } from "@/components/portal/cursos/FiltrosCursos";
import {
  EsqueletoResumenPorEstado,
  ResumenPorEstado,
} from "@/components/portal/cursos/ResumenPorEstado";
import { TablaCursos } from "@/components/portal/cursos/TablaCursos";
import { EsqueletoLista } from "@/components/portal/EsqueletoLista";
import { Paginacion } from "@/components/portal/Paginacion";
import { listarInstitucionesParaFiltro } from "@/lib/api/clubes";
import { contarCursosPorEstado, listarCursos } from "@/lib/api/cursos";
import {
  CURSOS_POR_PAGINA,
  RUTA_CURSOS,
  hayFiltrosDeCursos,
  leerFiltrosDeCursos,
  rutaDeCursos,
  type ParametrosDeBusqueda,
} from "@/lib/portal/filtros-cursos";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Cursos y horarios",
};

type PropsConParametros = {
  parametros: Promise<ParametrosDeBusqueda>;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const ROL_DOCENTE = "DOCENTE";
const ANCHOS_DE_FILTROS = ["md:min-w-[16rem] md:flex-1", "md:w-44", "md:w-44", "md:w-64"];

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return rol === ROL_DOCENTE ? "en tus clubes" : "en tu institución";
}

async function Filtros({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCursos(await parametros);
  const usuario = await exigirSesion();
  const instituciones = tieneAlcanceGlobal(usuario?.rol)
    ? await listarInstitucionesParaFiltro()
    : null;

  return <FiltrosCursos filtros={filtros} instituciones={instituciones} />;
}

async function Resumen({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCursos(await parametros);
  const conteos = await contarCursosPorEstado(filtros);

  return <ResumenPorEstado filtros={filtros} conteos={conteos} />;
}

async function Resultados({ parametros }: PropsConParametros) {
  const filtros = leerFiltrosDeCursos(await parametros);
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarCursos(filtros)]);

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los cursos"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada y los
        filtros se conservan.
      </AvisoDeLista>
    );
  }

  if (resultado.estado === "denegado") {
    return (
      <AvisoDeLista urgente icono={<ShieldAlert size={20} />} titulo="No tienes acceso a esta lista">
        {resultado.mensaje}
      </AvisoDeLista>
    );
  }

  const { cursos, total, pagina, totalPaginas } = resultado.datos;

  if (cursos.length === 0 && total > 0) {
    redirect(rutaDeCursos({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeCursos(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún curso coincide con los filtros"
        accion={
          <Link href={RUTA_CURSOS} className="font-medium text-acento">
            Ver todos los cursos
          </Link>
        }
      >
        Prueba con otro nombre o cambia el estado, el nivel o la modalidad.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<BookOpen size={20} />} titulo="Todavía no hay cursos">
        {usuario?.rol === ROL_DOCENTE
          ? "Tus clubes todavía no tienen cursos. El responsable de tu institución puede crearlos."
          : "Cuando se registre el primer curso aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * CURSOS_POR_PAGINA + 1;
  const ultimo = primero + cursos.length - 1;

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 curso ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} cursos ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaCursos cursos={cursos} mostrarInstitucion={tieneAlcanceGlobal(usuario?.rol)} />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de cursos"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDeCursos({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={
          pagina < totalPaginas ? rutaDeCursos({ ...filtros, pagina: pagina + 1 }) : null
        }
      />
    </>
  );
}

export default function PaginaCursos({ searchParams }: PageProps<"/portal/cursos">) {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Cursos y horarios</h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Consulta la programación de cada club: nivel, modalidad, horario semanal, fechas y cupos.
      </p>
      <ProveedorDeBusqueda>
        <Suspense fallback={<EsqueletoFiltros anchos={ANCHOS_DE_FILTROS} />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoResumenPorEstado />}>
          <Resumen parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoLista mensaje="Cargando la lista de cursos." />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
```

# Parte E. Comprobar y guardar

## Paso 16. Compilar

Desde la carpeta `web`. Hay una ruta nueva, así que primero se regeneran los tipos de rutas:

```bash
npx next typegen
```

```bash
npm run lint
```

```bash
npm run tipos
```

```bash
npm run build
```

Los cuatro terminaron sin errores en tu equipo, ya con tu cambio del título oficial incluido. La compilación lista `/portal/clubes` y `/portal/cursos` como rutas propias.

## Paso 17. Probar

Con Spring Boot en el puerto 8080 y `npm run dev` en el 3000:

1. Entra como administrador y abre Cursos y horarios. Aparecen las cuatro fichas de estado y la tabla.
2. Pulsa la ficha Planificado. La tabla se filtra y la ficha queda marcada; púlsala otra vez para quitar el filtro.
3. Elige un nivel. Los totales de las cuatro fichas cambian para contar solo ese nivel.
4. Combina modalidad y búsqueda, y luego pulsa Quitar filtros.
5. Reduce la ventana por debajo de 1280 px. La tabla se convierte en fichas.
6. Entra como docente. Ve solo los cursos de sus clubes, sin columna ni filtro de institución.
7. Abre Clubes y repite una búsqueda y un cambio de página, para confirmar que sigue igual.

## Qué verifiqué y cómo

| Caso | Resultado | Contra qué |
|---|---|---|
| Lista inicial: 37 cursos, 10 por página, fichas con 19, 9, 5 y 4 | Correcto | API simulada |
| Ficha de estado filtra y se desmarca al pulsarla de nuevo | Correcto | Navegador |
| Los totales de las fichas respetan nivel, modalidad y búsqueda | Correcto | API simulada |
| Nivel, modalidad y búsqueda combinados en la dirección | Correcto | Navegador |
| Quitar filtros, página siguiente y búsqueda sin resultados | Correcto | Navegador |
| Docente: 7 cursos en sus clubes, cinco columnas, sin filtro de institución | Correcto | API simulada |
| 403: aviso con el mensaje del backend y fichas con raya | Correcto | API simulada |
| Esqueleto y contenido en la misma posición, medido en cinco puntos | Correcto | Navegador a 1440 px |
| Tabla sin desplazamiento a 1440 y 1280 px; fichas a 1100, 768 y 375 px | Correcto | Navegador |
| Sin desbordamiento horizontal en ningún ancho probado | Correcto | Navegador |
| Clubes tras el cambio a piezas compartidas: lista, filtros y páginas | Correcto | API simulada |
| Sin errores de consola | Correcto | Navegador |

**Sigue sin probarse contra tu backend real con datos verdaderos.** Probé con una API simulada que responde con el contrato exacto de `PaginaResponseCursoResponse`, con horarios incluidos. Los pasos 1 a 7 lo confirman con tus datos.

Durante las pruebas corregí dos detalles: la columna de fechas se partía en cinco líneas y a 1100 px la tabla pedía desplazamiento horizontal.

## Paso 18. Guardar en Git

Tu commit "Alineamiento del título oficial con el dictamen del tribunal" ya incluyó los 15 archivos de código de este bloque junto con tu cambio del título, y está subido a `main`. Lo único que falta guardar es esta guía. Desde la raíz del repositorio:

```bash
git status
```

```bash
git add .
```

```bash
git commit -m "Paso 3 (B6): guía de cursos y horarios con resumen por estado, filtros en la dirección y piezas de lista compartidas con clubes"
```

```bash
git push origin main
```

`git status` debe mostrar solo `docs/guias/paso3-bloque6.md`.

## Notas

- El filtro por club no está en la interfaz; el backend ya acepta `clubId`.
- El enlace virtual de los cursos no se muestra en la lista. El backend lo oculta a algunos roles y conviene tratarlo en la pantalla de detalle.
- El sistema anterior en `frontend/` sigue funcionando igual.

# PASO 3 · Bloque 5: gestión de clubes, listado con filtros

Este bloque construye la primera pantalla de gestión del portal: la lista de clubes en `/portal/clubes`, con búsqueda por nombre, filtros por estado e institución, paginación y todos sus estados de carga, vacío y error.

Todo está en tu rama `main`, sin commits ni push de mi parte. Los comandos de Git están al final.

## Alcance de este bloque

Construí la consulta completa: listar, buscar, filtrar y paginar. Crear, editar, cambiar el estado y cerrar un club no están en este bloque. Son formularios con sus propias validaciones y reglas (transiciones de estado, sobrecupo, vista previa del cierre) y merecen un bloque propio para quedar bien probados. Tampoco agregué botones que todavía no hacen nada.

## Endpoints verificados

Revisé el controlador `ClubController` y el servicio `ClubService` del backend:

| Operación | Endpoint | Roles | En este bloque |
|---|---|---|---|
| Listar con filtros | `GET /api/clubes` | Los cinco roles | Sí |
| Opciones de instituciones | `GET /api/opciones/instituciones` | Los cinco roles | Sí, para el filtro |
| Detalle | `GET /api/clubes/{id}` | Los cinco roles | No |
| Crear | `POST /api/clubes` | Administrador y Responsable | No |
| Actualizar | `PUT /api/clubes/{id}` | Administrador y Responsable | No |
| Cambiar estado | `PATCH /api/clubes/{id}/estado` | Administrador y Responsable | No |
| Vista previa del cierre | `GET /api/clubes/{id}/cierre` | Administrador y Responsable | No |

`GET /api/clubes` acepta `q`, `institucionId`, `periodoId`, `estado`, `pagina` y `tamano`, ordena por nombre y limita el tamaño a 100. El alcance lo decide el backend: los roles globales ven todo, el responsable ve su institución y el docente ve solo los clubes a su cargo.

## Qué se construyó

| Parte | Resultado |
|---|---|
| Ayudas de sesión | `src/lib/api/con-sesion.ts` reúne el token de la cookie, las opciones de `openapi-fetch` y el manejo de errores; el panel ahora también las usa |
| Servicio de clubes | `src/lib/api/clubes.ts` con `listarClubes` y `listarInstitucionesParaFiltro` |
| Filtros en la dirección | `src/lib/portal/filtros-clubes.ts` lee y escribe los filtros en la URL y descarta valores inválidos |
| Página | `app/portal/clubes/page.tsx`, componente de servidor con dos fronteras de `<Suspense>` |
| Filtros | `FiltrosClubes.tsx`: búsqueda con espera de 350 ms, estado e institución |
| Tabla | `TablaClubes.tsx`: tabla en escritorio y fichas en teléfono |
| Paginación | `PaginacionClubes.tsx`: 10 clubes por página |

## Cinco decisiones que debes conocer

**1. Los filtros viven en la dirección.** Una búsqueda queda como `/portal/clubes?q=python&estado=ACTIVO&pagina=2`. Se puede copiar, guardar en favoritos y recorrer con el botón Atrás. La página lee esa dirección en el servidor y hace la consulta con el JWT de la cookie; el navegador nunca habla con Spring Boot.

**2. Al cambiar un filtro no aparece el esqueleto.** La lista anterior se queda en pantalla, atenuada, hasta que llega la nueva. El esqueleto solo se ve en la primera carga. Esto se logra con `useTransition`: la navegación se marca como transición y React conserva lo que ya estaba pintado.

**3. La dirección no se confía.** Un estado desconocido, una institución que no es un número o una página fuera de rango no rompen la pantalla: se descartan o se corrigen. `?pagina=99` lleva a la última página real.

**4. La columna y el filtro de institución dependen del rol.** Solo aparecen para Administrador, Coordinador y Consulta. Un responsable o un docente ven una sola institución, así que serían ruido.

**5. Tabla en escritorio, fichas en teléfono.** Una tabla de seis columnas no cabe en 375 px. Por debajo de 768 px cada club se muestra como una ficha con los mismos datos.

## Estados de la lista

| Situación | Qué se ve |
|---|---|
| Primera carga | Esqueleto con la forma de los filtros y de la tabla, en la misma posición |
| Cambio de filtro o de página | La lista anterior atenuada y un indicador en el campo de búsqueda |
| Sin resultados con filtros | Aviso con el enlace Ver todos los clubes |
| Sin clubes | Aviso; al docente le explica que el responsable puede asignarle uno |
| Backend sin respuesta | Aviso con el botón Reintentar; los filtros se conservan en la dirección |
| 403 del backend | Aviso con el mensaje que envía Spring Boot, por ejemplo cuando el usuario docente no está vinculado a un registro de docente |
| 401 del backend | Redirección al login con el aviso de sesión terminada |

## Cómo usé cada skill

**Impeccable, modo Operate.** Controles estándar: un campo de búsqueda y dos listas desplegables nativas, con etiquetas visibles. La tabla usa cifras tabulares, encabezados de columna reales y el nombre del club como encabezado de fila. El estado se indica con un punto de color y siempre con su texto. Los errores nombran el problema y la salida.

**Taste.** Etiquetas siempre visibles y mensajes junto a lo que describen. Mismo sistema de diseño: tokens OKLCH, Instrument Sans y los mismos radios.

**Emil Kowalski.** La lista se atenúa con una transición de opacidad de 150 ms al filtrar y el indicador de búsqueda gira a 600 ms por vuelta. Los botones conservan su respuesta al pulsar. No animé filas ni números: es una pantalla que se usa muchas veces al día.

## Archivos nuevos y modificados

```text
web/src/
  app/portal/clubes/page.tsx                    nuevo
  components/
    portal/Busqueda.tsx                         nuevo
    portal/clubes/FiltrosClubes.tsx             nuevo
    portal/clubes/PaginacionClubes.tsx          nuevo
    portal/clubes/TablaClubes.tsx               nuevo
    ui/Campo.tsx                                modificado
    ui/estilos-control.ts                       nuevo
  lib/
    api/clubes.ts                               nuevo
    api/con-sesion.ts                           nuevo
    api/panel.ts                                modificado
    portal/filtros-clubes.ts                    nuevo
    portal/menu.ts                              modificado
```

# Parte A. Cliente y servicios de datos

## Paso 1. Ayudas compartidas para consultar con la sesión

Este archivo reúne lo que el panel ya hacía por su cuenta. `tokenDeSesion` lee el JWT de la cookie y redirige al login si no existe. `conSesion` arma la cabecera `Authorization`, desactiva la caché y pone un límite de 10 segundos. `intentar` devuelve siempre los datos, el código de estado y el mensaje de error del backend, sin lanzar excepciones. `exigirAutenticacion` redirige al login ante un 401.

Archivo: `web/src/lib/api/con-sesion.ts`

```typescript
import "server-only";
import { redirect } from "next/navigation";
import { RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { leerToken } from "@/lib/sesion/usuario";

export type Resultado<T> = {
  datos: T | null;
  estado: number;
  detalle: string | null;
};

type RespuestaDeApi<T> = {
  data?: T;
  error?: { detail?: string };
  response: Response;
};

const ESPERA_MAXIMA_MS = 10000;
const NO_AUTENTICADO = 401;

export async function tokenDeSesion(): Promise<string> {
  const token = await leerToken();
  if (!token) {
    redirect(RUTA_SESION_EXPIRADA);
  }
  return token;
}

export function conSesion(token: string) {
  return {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store" as const,
    signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
  };
}

export async function intentar<T>(peticion: Promise<RespuestaDeApi<T>>): Promise<Resultado<T>> {
  try {
    const { data, error, response } = await peticion;
    return { datos: data ?? null, estado: response.status, detalle: error?.detail ?? null };
  } catch {
    return { datos: null, estado: 0, detalle: null };
  }
}

export function exigirAutenticacion(...resultados: { estado: number }[]): void {
  if (resultados.some((resultado) => resultado.estado === NO_AUTENTICADO)) {
    redirect(RUTA_SESION_EXPIRADA);
  }
}
```

## Paso 2. El panel usa las ayudas compartidas

El comportamiento del panel no cambia; solo deja de repetir el código que ahora vive en `con-sesion.ts`.

Archivo: `web/src/lib/api/panel.ts`

```typescript
import "server-only";
import { cache } from "react";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";

export type ResumenPanel = Esquemas["PanelResumenResponse"];
export type IndicadoresActividad = Esquemas["IndicadoresSeguimiento"];

export type ActividadPanel = {
  indicadores: IndicadoresActividad | null;
  estudiantesActivos: number | null;
  inscripcionesActivas: number | null;
};

export const obtenerResumenPanel = cache(async (): Promise<ResumenPanel | null> => {
  const token = await tokenDeSesion();
  const resumen = await intentar(api.GET("/api/panel/resumen", conSesion(token)));

  exigirAutenticacion(resumen);
  return resumen.datos;
});

export const obtenerActividadPanel = cache(async (): Promise<ActividadPanel> => {
  const token = await tokenDeSesion();

  const [seguimiento, estudiantes, inscripciones] = await Promise.all([
    intentar(api.GET("/api/seguimiento/resumen", conSesion(token))),
    intentar(
      api.GET("/api/estudiantes", {
        ...conSesion(token),
        params: { query: { estado: "ACTIVO", tamano: 1 } },
      }),
    ),
    intentar(
      api.GET("/api/inscripciones", {
        ...conSesion(token),
        params: { query: { estado: "ACTIVA", tamano: 1 } },
      }),
    ),
  ]);

  exigirAutenticacion(seguimiento, estudiantes, inscripciones);

  return {
    indicadores: seguimiento.datos?.totales ?? null,
    estudiantesActivos: estudiantes.datos?.totalElementos ?? null,
    inscripcionesActivas: inscripciones.datos?.totalElementos ?? null,
  };
});
```

## Paso 3. Filtros en la dirección

Funciones puras, sin interfaz. `leerFiltros` convierte los parámetros de la dirección en un objeto validado y `rutaConFiltros` hace el camino inverso. Las usan tanto el servidor como los componentes del navegador.

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

## Paso 4. Servicio de clubes

`listarClubes` devuelve uno de tres resultados: la página de clubes, acceso denegado con el mensaje del backend, o servidor sin respuesta. La página decide qué mostrar en cada caso. La API cuenta las páginas desde cero y la interfaz desde uno; la conversión ocurre aquí. `listarInstitucionesParaFiltro` trae hasta 50 instituciones, que es el máximo que permite ese endpoint.

Archivo: `web/src/lib/api/clubes.ts`

```typescript
import "server-only";
import { cache } from "react";
import { CLUBES_POR_PAGINA, type FiltrosClubes } from "@/lib/portal/filtros-clubes";
import { api, type Esquemas } from "./cliente";
import { conSesion, exigirAutenticacion, intentar, tokenDeSesion } from "./con-sesion";

export type Club = Esquemas["ClubResponse"];
export type OpcionDeInstitucion = Esquemas["OpcionResponse"];

export type PaginaDeClubes = {
  clubes: Club[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

export type ResultadoDeClubes =
  | { estado: "ok"; datos: PaginaDeClubes }
  | { estado: "denegado"; mensaje: string }
  | { estado: "sin-servicio" };

const ACCESO_DENEGADO = 403;
const LIMITE_DE_INSTITUCIONES = 50;
const MENSAJE_DENEGADO = "Tu cuenta no tiene permiso para ver esta lista.";

export async function listarClubes(filtros: FiltrosClubes): Promise<ResultadoDeClubes> {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/clubes", {
      ...conSesion(token),
      params: {
        query: {
          q: filtros.q || undefined,
          estado: filtros.estado ?? undefined,
          institucionId: filtros.institucion ?? undefined,
          pagina: filtros.pagina - 1,
          tamano: CLUBES_POR_PAGINA,
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
      clubes: respuesta.datos.contenido ?? [],
      total: respuesta.datos.totalElementos ?? 0,
      pagina: (respuesta.datos.pagina ?? 0) + 1,
      totalPaginas: Math.max(respuesta.datos.totalPaginas ?? 1, 1),
    },
  };
}

export const listarInstitucionesParaFiltro = cache(async (): Promise<OpcionDeInstitucion[]> => {
  const token = await tokenDeSesion();

  const respuesta = await intentar(
    api.GET("/api/opciones/instituciones", {
      ...conSesion(token),
      params: { query: { limite: LIMITE_DE_INSTITUCIONES } },
    }),
  );

  exigirAutenticacion(respuesta);
  return respuesta.datos?.opciones ?? [];
});
```

## Paso 5. El menú registra la sección construida

Tres cambios en el archivo del menú: la lista `MODULOS_CONSTRUIDOS`, para que Clubes deje de usar la página provisional; `ROLES_GLOBALES`, igual a la del backend; y la función `tieneAlcanceGlobal`.

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
const MODULOS_CONSTRUIDOS: readonly IdOpcion[] = ["clubes"];
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

# Parte B. Interfaz

## Paso 6. Estilos compartidos de los controles

El campo de texto del login y los controles de los filtros comparten borde, fondo, foco y estado de error.

Archivo: `web/src/components/ui/estilos-control.ts`

```typescript
export const CONTROL =
  "w-full rounded-control border border-linea bg-superficie px-3.5 text-base text-tinta transition-[border-color,background-color] duration-150 ease-salida placeholder:text-tenue hover:border-tenue focus-visible:border-acento focus-visible:outline-offset-0 aria-invalid:border-error";

export const ETIQUETA_CONTROL = "block text-[0.9375rem] font-medium";
```

## Paso 7. Campo usa los estilos compartidos

Se ve igual que antes; solo cambia de dónde toma las clases.

Archivo: `web/src/components/ui/Campo.tsx`

```tsx
import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { CONTROL, ETIQUETA_CONTROL } from "./estilos-control";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  etiqueta: string;
  error?: string;
  accion?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Campo({ etiqueta, error, accion, className = "", ref, ...resto }: Props) {
  const id = useId();
  const idError = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={ETIQUETA_CONTROL}>
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <input
          {...resto}
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={`${CONTROL} h-12 ${accion ? "pr-12" : ""} ${className}`}
        />
        {accion ? <div className="absolute inset-y-0 right-1 flex items-center">{accion}</div> : null}
      </div>
      <p id={idError} className="mt-1.5 min-h-5 text-sm text-error">
        {error ? <span className="entrada-mensaje inline-block">{error}</span> : null}
      </p>
    </div>
  );
}
```

## Paso 8. Contexto de búsqueda

`ProveedorDeBusqueda` guarda una sola transición de React para toda la pantalla. Los filtros y la paginación navegan a través de `navegar`, y `ZonaDeResultados` atenúa la lista mientras la transición está pendiente. `BotonReintentar` vuelve a pedir los datos sin recargar la página. Es genérico: las próximas listas del portal pueden reutilizarlo.

Archivo: `web/src/components/portal/Busqueda.tsx`

```tsx
"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useMemo, useTransition, type ReactNode } from "react";
import { Boton } from "@/components/ui/Boton";

type OpcionesDeNavegacion = {
  reemplazar?: boolean;
  conservarPosicion?: boolean;
};

type Busqueda = {
  pendiente: boolean;
  navegar: (ruta: string, opciones?: OpcionesDeNavegacion) => void;
  recargar: () => void;
};

const ContextoDeBusqueda = createContext<Busqueda | null>(null);

export function ProveedorDeBusqueda({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();

  const navegar = useCallback(
    (ruta: string, opciones: OpcionesDeNavegacion = {}) => {
      const desplazamiento = { scroll: !opciones.conservarPosicion };
      iniciarTransicion(() => {
        if (opciones.reemplazar) {
          router.replace(ruta, desplazamiento);
        } else {
          router.push(ruta, desplazamiento);
        }
      });
    },
    [router],
  );

  const recargar = useCallback(() => {
    iniciarTransicion(() => router.refresh());
  }, [router]);

  const valor = useMemo(() => ({ pendiente, navegar, recargar }), [pendiente, navegar, recargar]);

  return <ContextoDeBusqueda value={valor}>{children}</ContextoDeBusqueda>;
}

export function useBusqueda(): Busqueda {
  const busqueda = use(ContextoDeBusqueda);
  if (!busqueda) {
    throw new Error("useBusqueda necesita un ProveedorDeBusqueda");
  }
  return busqueda;
}

export function ZonaDeResultados({ children }: { children: ReactNode }) {
  const { pendiente } = useBusqueda();
  return (
    <div
      aria-busy={pendiente}
      className={`transition-opacity duration-150 ease-salida ${pendiente ? "opacity-55" : ""}`}
    >
      {children}
    </div>
  );
}

export function BotonReintentar() {
  const { pendiente, recargar } = useBusqueda();
  return (
    <Boton variante="secundario" cargando={pendiente} textoCargando="Reintentando" onClick={recargar}>
      <RotateCw aria-hidden="true" size={16} />
      Reintentar
    </Boton>
  );
}
```

## Paso 9. Filtros

La búsqueda espera 350 ms después de la última tecla antes de consultar y reemplaza la entrada del historial, para que el botón Atrás no recorra letra por letra. Enter busca de inmediato. Las listas desplegables consultan al cambiar. El texto del campo no se pisa mientras la persona escribe, aunque llegue una respuesta anterior. Quitar filtros solo aparece cuando hay algún filtro puesto, y ocupa su espacio siempre para que los controles no se muevan.

Archivo: `web/src/components/portal/clubes/FiltrosClubes.tsx`

```tsx
"use client";

import { ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useBusqueda } from "@/components/portal/Busqueda";
import { CONTROL, ETIQUETA_CONTROL } from "@/components/ui/estilos-control";
import type { OpcionDeInstitucion } from "@/lib/api/clubes";
import {
  ESTADOS_DE_CLUB,
  NOMBRES_DE_ESTADO,
  RUTA_CLUBES,
  hayFiltrosActivos,
  rutaConFiltros,
  type EstadoClub,
  type FiltrosClubes as Filtros,
} from "@/lib/portal/filtros-clubes";

type Props = {
  filtros: Filtros;
  instituciones: OpcionDeInstitucion[] | null;
};

const ESPERA_AL_ESCRIBIR_MS = 350;
const ICONO_EN_CAMPO = "pointer-events-none absolute top-1/2 -translate-y-1/2 text-tenue";

export function FiltrosClubes({ filtros, instituciones }: Props) {
  const { pendiente, navegar } = useBusqueda();
  const idBusqueda = useId();
  const idEstado = useId();
  const idInstitucion = useId();
  const [texto, setTexto] = useState(filtros.q);
  const [busquedaVista, setBusquedaVista] = useState(filtros.q);
  const [escribiendo, setEscribiendo] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (filtros.q !== busquedaVista) {
    setBusquedaVista(filtros.q);
    if (!escribiendo) {
      setTexto(filtros.q);
    }
  }

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

  function buscar(cambios: Partial<Filtros>, reemplazar = false) {
    cancelarEspera();
    const siguientes = { ...filtros, q: texto.trim(), ...cambios, pagina: 1 };
    navegar(rutaConFiltros(siguientes), { reemplazar, conservarPosicion: true });
  }

  function alEscribir(evento: ChangeEvent<HTMLInputElement>) {
    const valor = evento.target.value;
    setTexto(valor);
    setEscribiendo(true);
    if (temporizador.current) {
      clearTimeout(temporizador.current);
    }
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      setEscribiendo(false);
      navegar(rutaConFiltros({ ...filtros, q: valor.trim(), pagina: 1 }), {
        reemplazar: true,
        conservarPosicion: true,
      });
    }, ESPERA_AL_ESCRIBIR_MS);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    buscar({}, true);
  }

  function quitarFiltros() {
    cancelarEspera();
    setTexto("");
    navegar(RUTA_CLUBES, { conservarPosicion: true });
  }

  const conFiltros = hayFiltrosActivos(filtros) || texto.trim() !== "";

  return (
    <form
      role="search"
      aria-label="Filtros de clubes"
      onSubmit={alEnviar}
      className="mt-6 flex flex-col gap-4 md:flex-row md:items-end"
    >
      <div className="min-w-0 md:flex-1">
        <label htmlFor={idBusqueda} className={ETIQUETA_CONTROL}>
          Buscar por nombre
        </label>
        <div className="relative mt-2">
          <Search aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} left-3.5`} />
          <input
            id={idBusqueda}
            type="search"
            name="q"
            value={texto}
            onChange={alEscribir}
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            placeholder="Robótica, programación"
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

      <div className="md:w-48">
        <label htmlFor={idEstado} className={ETIQUETA_CONTROL}>
          Estado
        </label>
        <div className="relative mt-2">
          <select
            id={idEstado}
            name="estado"
            value={filtros.estado ?? ""}
            onChange={(evento) =>
              buscar({ estado: (evento.target.value || null) as EstadoClub | null })
            }
            className={`${CONTROL} h-11 appearance-none pr-10`}
          >
            <option value="">Todos</option>
            {ESTADOS_DE_CLUB.map((estado) => (
              <option key={estado} value={estado}>
                {NOMBRES_DE_ESTADO[estado]}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} right-3`} />
        </div>
      </div>

      {instituciones ? (
        <div className="md:w-72">
          <label htmlFor={idInstitucion} className={ETIQUETA_CONTROL}>
            Institución
          </label>
          <div className="relative mt-2">
            <select
              id={idInstitucion}
              name="institucion"
              value={filtros.institucion ?? ""}
              onChange={(evento) =>
                buscar({ institucion: evento.target.value ? Number(evento.target.value) : null })
              }
              className={`${CONTROL} h-11 appearance-none truncate pr-10`}
            >
              <option value="">Todas</option>
              {instituciones.map((institucion) => (
                <option key={institucion.id} value={institucion.id}>
                  {institucion.nombre}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={18} className={`${ICONO_EN_CAMPO} right-3`} />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={quitarFiltros}
        disabled={!conFiltros}
        className="inline-flex h-11 shrink-0 select-none items-center justify-center gap-2 rounded-control px-3 text-[0.9375rem] font-medium text-tenue transition-[transform,background-color,color,opacity] duration-150 ease-salida hover:bg-superficie hover:text-tinta active:scale-[0.97] disabled:pointer-events-none disabled:opacity-0"
      >
        <X aria-hidden="true" size={16} />
        Quitar filtros
      </button>
    </form>
  );
}

export function EsqueletoFiltros() {
  return (
    <div aria-hidden="true" className="mt-6 flex flex-col gap-4 motion-safe:animate-pulse md:flex-row md:items-end">
      {["md:flex-1", "md:w-48", "md:w-72"].map((ancho) => (
        <div key={ancho} className={ancho}>
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

## Paso 10. Tabla y fichas

Es un componente de servidor, sin JavaScript en el navegador. Incluye la tabla para escritorio, las fichas para teléfono y el esqueleto. El día de la semana llega como número, de 1 para lunes a 7 para domingo. Cuando no quedan cupos, aparece Completo debajo de los integrantes.

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

const FILAS_DE_ESPERA = [0, 1, 2, 3, 4, 5];

export function EsqueletoTabla() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Cargando la lista de clubes.
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

## Paso 11. Paginación

Muestra la página actual y los botones Anterior y Siguiente. Si hay una sola página, no se dibuja.

Archivo: `web/src/components/portal/clubes/PaginacionClubes.tsx`

```tsx
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useBusqueda } from "@/components/portal/Busqueda";
import { Boton } from "@/components/ui/Boton";
import { rutaConFiltros, type FiltrosClubes } from "@/lib/portal/filtros-clubes";

type Props = {
  filtros: FiltrosClubes;
  pagina: number;
  totalPaginas: number;
};

export function PaginacionClubes({ filtros, pagina, totalPaginas }: Props) {
  const { navegar } = useBusqueda();

  if (totalPaginas <= 1) {
    return null;
  }

  function irA(destino: number) {
    navegar(rutaConFiltros({ ...filtros, pagina: destino }));
  }

  return (
    <nav
      aria-label="Páginas de la lista de clubes"
      className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
    >
      <p className="cifras text-[0.9375rem] text-tenue">
        Página {pagina} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={pagina <= 1}
          onClick={() => irA(pagina - 1)}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Anterior
        </Boton>
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={pagina >= totalPaginas}
          onClick={() => irA(pagina + 1)}
        >
          Siguiente
          <ArrowRight aria-hidden="true" size={16} />
        </Boton>
      </div>
    </nav>
  );
}
```

## Paso 12. Página de clubes

El título y la descripción son estáticos y llegan al instante. `Filtros` y `Resultados` son funciones asíncronas, cada una en su `<Suspense>`: leen la dirección, la sesión y los datos en el servidor. Next.js prefiere esta carpeta fija, `clubes`, sobre la ruta dinámica `[modulo]` del Bloque 3.

Archivo: `web/src/app/portal/clubes/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, SearchX, ShieldAlert, Users } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import {
  BotonReintentar,
  ProveedorDeBusqueda,
  ZonaDeResultados,
} from "@/components/portal/Busqueda";
import { EsqueletoFiltros, FiltrosClubes } from "@/components/portal/clubes/FiltrosClubes";
import { PaginacionClubes } from "@/components/portal/clubes/PaginacionClubes";
import { EsqueletoTabla, TablaClubes } from "@/components/portal/clubes/TablaClubes";
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

function alcanceDe(rol?: string): string {
  if (tieneAlcanceGlobal(rol)) {
    return "en todas las instituciones";
  }
  return rol === ROL_DOCENTE ? "a tu cargo" : "de tu institución";
}

function Aviso({
  icono,
  titulo,
  children,
  accion,
  urgente = false,
}: {
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
  urgente?: boolean;
}) {
  return (
    <div
      role={urgente ? "alert" : undefined}
      className="flex flex-col items-start gap-4 rounded-pieza bg-superficie p-6 sm:flex-row sm:p-8"
    >
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-control bg-superficie-alta text-tenue">
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
      <Aviso
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los clubes"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada y los
        filtros se conservan.
      </Aviso>
    );
  }

  if (resultado.estado === "denegado") {
    return (
      <Aviso urgente icono={<ShieldAlert size={20} />} titulo="No tienes acceso a esta lista">
        {resultado.mensaje}
      </Aviso>
    );
  }

  const { clubes, total, pagina, totalPaginas } = resultado.datos;

  if (clubes.length === 0 && total > 0) {
    redirect(rutaConFiltros({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosActivos(filtros) ? (
      <Aviso
        icono={<SearchX size={20} />}
        titulo="Ningún club coincide con los filtros"
        accion={
          <Link href={RUTA_CLUBES} className="font-medium text-acento">
            Ver todos los clubes
          </Link>
        }
      >
        Prueba con otro nombre o cambia el estado o la institución.
      </Aviso>
    ) : (
      <Aviso icono={<Users size={20} />} titulo="Todavía no hay clubes">
        {usuario?.rol === ROL_DOCENTE
          ? "No tienes clubes a tu cargo. El responsable de tu institución puede asignarte uno."
          : "Cuando se registre el primer club aparecerá en esta lista."}
      </Aviso>
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
      <PaginacionClubes filtros={filtros} pagina={pagina} totalPaginas={totalPaginas} />
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
        <Suspense fallback={<EsqueletoFiltros />}>
          <Filtros parametros={searchParams} />
        </Suspense>
        <div className="mt-8">
          <ZonaDeResultados>
            <Suspense fallback={<EsqueletoTabla />}>
              <Resultados parametros={searchParams} />
            </Suspense>
          </ZonaDeResultados>
        </div>
      </ProveedorDeBusqueda>
    </div>
  );
}
```

# Parte C. Comprobar y guardar

## Paso 13. Compilar

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

Los cuatro terminaron sin errores en tu equipo. La compilación lista `/portal/clubes` como ruta propia.

## Paso 14. Probar

Con Spring Boot en el puerto 8080 y `npm run dev` en el 3000:

1. Entra como administrador y abre Clubes en el menú. Aparece la tabla con seis columnas y el filtro de institución.
2. Escribe parte de un nombre. La lista se atenúa un instante y se actualiza sin que el campo pierda el foco.
3. Elige un estado y una institución. Mira cómo cambia la dirección del navegador.
4. Pasa a la página 2 y pulsa Atrás en el navegador. Vuelves a la página 1.
5. Escribe un texto que no exista. Aparece el aviso con el enlace Ver todos los clubes.
6. Entra como docente. No hay columna ni filtro de institución y el texto dice cuántos clubes tiene a su cargo.
7. Detén Spring Boot y cambia un filtro. Aparece el aviso con Reintentar; al volver a encender el backend, el botón recupera la lista.

## Qué verifiqué y cómo

| Caso | Resultado | Contra qué |
|---|---|---|
| Lista inicial: 54 clubes, 10 por página, seis columnas para el administrador | Correcto | API simulada |
| Filtro por estado, por institución y búsqueda por nombre | Correcto | API simulada |
| Al filtrar, la lista anterior sigue visible y no aparece el esqueleto | Correcto | Navegador |
| El campo de búsqueda conserva el foco mientras se escribe | Correcto | Navegador |
| Página siguiente y botón Atrás del navegador | Correcto | Navegador |
| `?pagina=99&estado=XYZ&institucion=abc` lleva a la última página sin error | Correcto | Compilación de producción |
| Sin resultados con filtros | Correcto | API simulada |
| Backend caído: aviso, dirección conservada y Reintentar recupera la lista | Correcto | API simulada |
| 403 con el mensaje del backend | Correcto | API simulada |
| Docente: cinco columnas, sin filtro de institución, texto de alcance propio | Correcto | API simulada |
| Esqueleto y contenido en la misma posición | Correcto, medido | Navegador a 1440 px |
| Fichas en teléfono sin desbordamiento horizontal | Correcto | Navegador a 375 px |
| Tema claro y oscuro, sin errores de consola | Correcto | Navegador |
| Cookie inválida en `/portal/clubes` redirige al login | Correcto | Spring Boot real |

**Sigue sin probarse contra tu backend real con datos verdaderos.** Probé con una API simulada que responde con el contrato exacto de `PaginaResponseClubResponse` y aplica los mismos filtros. Los pasos 1 a 6 lo confirman con tus datos.

Durante las pruebas encontré y corregí un desbordamiento: en teléfono los botones de la paginación se salían 13 px de la pantalla.

## Paso 15. Guardar en Git

Desde la raíz del repositorio, en tu rama `main`:

```bash
git status
```

```bash
git add .
```

```bash
git commit -m "Paso 3 (B5): listado de clubes con búsqueda, filtros por estado e institución en la dirección, paginación y estados de carga, vacío y error, con guía"
```

```bash
git push origin main
```

`git status` debe listar tres archivos modificados, nueve nuevos dentro de `web/src` y esta guía, `docs/guias/paso3-bloque5.md`.

## Notas

- El filtro de institución muestra hasta 50 instituciones, el máximo del endpoint de opciones. Hoy hay 7.
- La lista incluye los clubes de todos los períodos; cada fila indica el suyo. El backend ya acepta `periodoId`, así que un filtro de período es un agregado corto.
- Cursos y horarios sigue siendo una página provisional.
- El sistema anterior en `frontend/` sigue funcionando igual.

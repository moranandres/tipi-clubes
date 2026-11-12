# PASO 3 · Bloque 4: panel principal y métricas de la aplicación

El Bloque 3 ya dejó el panel con pendientes, indicadores y el semáforo. Este bloque lo completa con lo que faltaba: las métricas de actividad del período (sesiones, horas, cumplimiento y estudiantes) y una bienvenida que cambia según el rol y el nombre de la persona.

Todo está en tu rama `main`, sin commits ni push de mi parte. Los comandos de Git están al final.

## Qué se construyó

| Parte | Resultado |
|---|---|
| Cliente del panel | `src/lib/api/panel.ts` ahora tiene dos funciones tipadas con `openapi-fetch`: `obtenerResumenPanel` y la nueva `obtenerActividadPanel` |
| Métricas de actividad | Cuatro tarjetas: sesiones ejecutadas, horas de trabajo, cumplimiento y estudiantes activos |
| Bienvenida | Saludo según la hora de Guayaquil, el nombre, el rol con su descripción y tres accesos rápidos distintos por rol |
| Carga independiente | Cinco fronteras de `<Suspense>` en la página; cada sección aparece cuando su consulta responde |
| Tarjeta | `TarjetaMetrica` acepta decimales y una unidad, como `h` o `%` |

## De dónde sale cada métrica

No cambié el backend. Cada cifra sale de un endpoint que ya existía y que ya filtra por rol e institución:

| Tarjeta | Endpoint | Campo |
|---|---|---|
| Sesiones ejecutadas | `GET /api/seguimiento/resumen` | `totales.ejecutadas`, sobre `totales.exigibles` |
| Horas de trabajo | `GET /api/seguimiento/resumen` | `totales.horasEjecutadas`, sobre `totales.horasPlanificadas` |
| Cumplimiento | `GET /api/seguimiento/resumen` | `totales.porcentajeCumplimiento` y `totales.estado` |
| Estudiantes activos | `GET /api/estudiantes?estado=ACTIVO&tamano=1` | `totalElementos` |
| Inscripciones activas | `GET /api/inscripciones?estado=ACTIVA&tamano=1` | `totalElementos` |
| Instituciones, clubes, docentes, usuarios | `GET /api/panel/resumen` | `indicadores` |

Las tres consultas de actividad salen en paralelo con `Promise.all`. Las dos de listados piden una sola fila, porque solo interesa el total.

## Tres decisiones que debes conocer

**1. Estudiantes activos, no estudiantes participantes.** Pediste estudiantes participantes como ejemplo. El único dato con esa definición exacta, estudiantes distintos con inscripción activa, está en las estadísticas públicas y cuenta todo el proyecto sin separar por rol. Mostrarle ese número a un docente sería enseñarle una cifra que no es de su alcance. Por eso la tarjeta muestra los estudiantes activos que el backend le deja ver a ese rol, con las inscripciones activas como detalle. Si quieres el número exacto de participantes por alcance, hay que agregar un campo a `PanelResumenResponse` en Spring Boot; es un cambio pequeño para otro bloque.

**2. Las métricas de actividad cargan aparte.** El seguimiento recorre todas las sesiones del período y es la consulta más lenta. Va en su propia frontera de `<Suspense>`, así los pendientes y los indicadores aparecen sin esperarla.

**3. Sin período activo, las tarjetas lo dicen.** Si no hay período académico activo, o el usuario docente no está vinculado a un registro de docente, el seguimiento responde con error. En ese caso las tres tarjetas muestran una raya y el texto Sin datos del período, y el resto del panel sigue funcionando.

## Bienvenida por rol

| Rol | Descripción que se muestra | Accesos rápidos |
|---|---|---|
| Administrador | Administras el sistema completo: usuarios, instituciones, períodos y catálogos. | Usuarios, Instituciones, Períodos académicos |
| Coordinador TIPI 3.0 | Sigues el avance de los clubes de todas las instituciones y revisas sus resultados. | Seguimiento de actividades, Avances y resultados, Clubes |
| Responsable institucional | Gestionas los clubes, los cursos, las inscripciones y los certificados de tu institución. | Solicitudes de inscripción, Clubes, Certificados |
| Docente coordinador | Planificas las sesiones de tus clubes, pasas asistencia y cargas las evidencias. | Actividades y sesiones, Asistencia, Evidencias |
| Consulta | Consultas la información y los reportes del proyecto sin modificar registros. | Seguimiento de actividades, Avances y resultados, Auditoría |

Los accesos rápidos salen del mismo menú del Bloque 3, así que nunca ofrecen una sección que el rol no puede ver.

## Cómo usé cada skill

**Impeccable, modo Operate.** El panel abre con lo que la persona tiene que hacer: primero los pendientes, luego la actividad y al final los totales. El color solo marca estado: el cumplimiento usa verde, ámbar o rojo según el semáforo del backend, siempre acompañado del texto Adecuado, En riesgo o Crítico. No hay texto con degradado ni etiquetas sobre los titulares.

**Emil Kowalski.** No agregué animaciones nuevas: los números son datos que se leen y no se animan. Las tarjetas y los accesos rápidos conservan la respuesta al pulsar de `scale(0.97)` y `scale(0.98)` en 150 ms y el cambio de fondo al pasar el puntero.

**Taste.** Mismo sistema del Bloque 1: tokens OKLCH, Instrument Sans y los mismos radios.

## Archivos nuevos y modificados

```text
web/src/
  app/portal/page.tsx                  modificado
  components/portal/Bienvenida.tsx     nuevo
  components/portal/TarjetaMetrica.tsx modificado
  lib/api/panel.ts                     modificado
  lib/portal/menu.ts                   modificado
```

## Paso 1. Cliente tipado del panel

`conSesion` arma las opciones comunes: la cabecera `Authorization` con el JWT de la cookie, sin caché y con un límite de 10 segundos. `intentar` convierte cualquier fallo de red en un resultado vacío en lugar de una excepción. Las dos funciones públicas están envueltas en `cache` de React: si varias secciones de la página piden el mismo dato, Spring Boot recibe una sola llamada. Un 401 de cualquiera de las consultas redirige al login.

Archivo: `web/src/lib/api/panel.ts`

```typescript
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { leerToken } from "@/lib/sesion/usuario";
import { api, type Esquemas } from "./cliente";

export type ResumenPanel = Esquemas["PanelResumenResponse"];
export type IndicadoresActividad = Esquemas["IndicadoresSeguimiento"];

export type ActividadPanel = {
  indicadores: IndicadoresActividad | null;
  estudiantesActivos: number | null;
  inscripcionesActivas: number | null;
};

type Resultado<T> = { datos: T | null; estado: number };

const ESPERA_MAXIMA_MS = 10000;
const NO_AUTENTICADO = 401;

async function tokenDeSesion(): Promise<string> {
  const token = await leerToken();
  if (!token) {
    redirect(RUTA_SESION_EXPIRADA);
  }
  return token;
}

function conSesion(token: string) {
  return {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store" as const,
    signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
  };
}

async function intentar<T>(
  peticion: Promise<{ data?: T; response: Response }>,
): Promise<Resultado<T>> {
  try {
    const { data, response } = await peticion;
    return { datos: data ?? null, estado: response.status };
  } catch {
    return { datos: null, estado: 0 };
  }
}

export const obtenerResumenPanel = cache(async (): Promise<ResumenPanel | null> => {
  const token = await tokenDeSesion();
  const resumen = await intentar(api.GET("/api/panel/resumen", conSesion(token)));

  if (resumen.estado === NO_AUTENTICADO) {
    redirect(RUTA_SESION_EXPIRADA);
  }
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

  const estados = [seguimiento.estado, estudiantes.estado, inscripciones.estado];
  if (estados.includes(NO_AUTENTICADO)) {
    redirect(RUTA_SESION_EXPIRADA);
  }

  return {
    indicadores: seguimiento.datos?.totales ?? null,
    estudiantesActivos: estudiantes.datos?.totalElementos ?? null,
    inscripcionesActivas: inscripciones.datos?.totalElementos ?? null,
  };
});
```

## Paso 2. Accesos rápidos y descripción por rol

Se agregan dos funciones al final del archivo del menú: `accesosRapidosParaRol`, que devuelve tres opciones por rol tomadas del menú ya filtrado, y `descripcionDeRol`, que devuelve la frase de la bienvenida.

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
    .filter((opcion) => opcion.id !== ID_PANEL)
    .map((opcion) => ({ id: opcion.id, etiqueta: opcion.etiqueta, roles: opcion.roles })),
);

export function buscarModulo(id: string): ModuloPortal | undefined {
  return MODULOS_DEL_PORTAL.find((modulo) => modulo.id === id);
}

export function rolPuedeVer(modulo: ModuloPortal, rol?: string): boolean {
  return esRol(rol) && modulo.roles.includes(rol);
}
```

## Paso 3. Componente Bienvenida

Es un componente de servidor asíncrono. Lee el usuario con `exigirSesion`, que usa `GET /api/auth/me`, y arma el saludo con la hora de Guayaquil. `EsqueletoBienvenida` ocupa el mismo espacio mientras llega la respuesta.

Archivo: `web/src/components/portal/Bienvenida.tsx`

```tsx
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { accesosRapidosParaRol, descripcionDeRol } from "@/lib/portal/menu";
import { exigirSesion, nombreDeRol } from "@/lib/sesion/usuario";

const FORMATO_HORA = new Intl.DateTimeFormat("es-EC", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "America/Guayaquil",
});

const MEDIODIA = 12;
const ANOCHECER = 19;

function saludoSegunLaHora(): string {
  const hora = Number(FORMATO_HORA.format(new Date()));
  if (hora < MEDIODIA) {
    return "Buenos días";
  }
  return hora < ANOCHECER ? "Buenas tardes" : "Buenas noches";
}

export async function Bienvenida() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <h1 className="text-3xl font-medium tracking-tight">Panel principal</h1>;
  }

  const accesos = accesosRapidosParaRol(usuario.rol);

  return (
    <header>
      <h1 className="text-3xl font-medium tracking-tight">
        {saludoSegunLaHora()}, {usuario.nombres}
      </h1>
      <p className="mt-3 max-w-[70ch] text-tenue">
        Entraste como <span className="font-medium text-tinta">{nombreDeRol(usuario.rol)}</span>.{" "}
        {descripcionDeRol(usuario.rol)}
      </p>
      {accesos.length > 0 ? (
        <nav aria-label="Accesos rápidos" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {accesos.map((acceso) => (
              <li key={acceso.id}>
                <Link
                  href={acceso.href}
                  className="group inline-flex h-10 select-none items-center gap-2 rounded-control bg-superficie px-4 text-[0.9375rem] font-medium transition-[transform,background-color] duration-150 ease-salida hover:bg-superficie-alta active:scale-[0.97]"
                >
                  {acceso.etiqueta}
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="text-tenue transition-[transform,color] duration-150 ease-salida group-hover:translate-x-0.5 group-hover:text-tinta motion-reduce:transform-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function EsqueletoBienvenida() {
  return (
    <div aria-hidden="true" className="motion-safe:animate-pulse">
      <div className="flex h-9 items-center">
        <div className="h-7 w-72 max-w-full rounded-[10px] bg-superficie-alta" />
      </div>
      <div className="mt-3 flex h-6 items-center">
        <div className="h-4 w-[34rem] max-w-full rounded-full bg-superficie" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {["w-28", "w-36", "w-32"].map((ancho) => (
          <div key={ancho} className={`h-10 rounded-control bg-superficie ${ancho}`} />
        ))}
      </div>
    </div>
  );
}
```

## Paso 4. Tarjeta con decimales y unidad

`TarjetaMetrica` recibe dos propiedades nuevas: `decimales`, para las horas, y `sufijo`, para `h` y `%`. El tipo `DatosTarjeta` se exporta para que la página lo use.

Archivo: `web/src/components/portal/TarjetaMetrica.tsx`

```tsx
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export type TonoMetrica = "neutro" | "exito" | "aviso" | "error";

export type DatosTarjeta = {
  etiqueta: string;
  valor?: number | null;
  detalle: string;
  tono?: TonoMetrica;
  href?: string;
  decimales?: number;
  sufijo?: string;
};

const SIN_DATO = "—";

const PUNTOS: Record<TonoMetrica, string> = {
  neutro: "bg-tenue",
  exito: "bg-exito",
  aviso: "bg-aviso",
  error: "bg-error",
};

const BASE =
  "flex h-full items-center justify-between gap-4 rounded-pieza bg-superficie p-4 sm:flex-col sm:items-stretch sm:justify-start sm:gap-0 sm:p-5";

const TEXTOS = "min-w-0 sm:contents";
const FILA_ETIQUETA = "flex items-start justify-between gap-3 sm:order-1";
const FILA_DETALLE = "mt-1 flex items-center gap-2 sm:order-3 sm:mt-3";
const CIFRA = "shrink-0 sm:order-2 sm:mt-4";

function formatear(valor: number, decimales: number): string {
  return new Intl.NumberFormat("es-EC", { maximumFractionDigits: decimales }).format(valor);
}

export function TarjetaMetrica({
  etiqueta,
  valor,
  detalle,
  tono = "neutro",
  href,
  decimales = 0,
  sufijo,
}: DatosTarjeta) {
  const hayValor = typeof valor === "number";

  const contenido = (
    <>
      <span className={TEXTOS}>
        <span className={FILA_ETIQUETA}>
          <span className="text-[0.9375rem] text-tinta sm:text-tenue">{etiqueta}</span>
          {href ? (
            <ArrowUpRight
              aria-hidden="true"
              size={16}
              className="mt-0.5 hidden shrink-0 text-tenue transition-[transform,color] duration-150 ease-salida group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-tinta motion-reduce:transform-none sm:block"
            />
          ) : null}
        </span>
        <span className={`${FILA_DETALLE} text-sm text-tenue`}>
          <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${PUNTOS[tono]}`} />
          {detalle}
        </span>
      </span>
      <span className={`cifras ${CIFRA} text-3xl font-medium leading-none tracking-tight sm:text-4xl`}>
        {hayValor ? formatear(valor, decimales) : SIN_DATO}
        {hayValor && sufijo ? (
          <span className="ml-1 text-lg leading-none font-normal tracking-normal text-tenue sm:text-xl sm:leading-none">
            {sufijo}
          </span>
        ) : null}
      </span>
    </>
  );

  if (!href) {
    return <div className={BASE}>{contenido}</div>;
  }

  return (
    <Link
      href={href}
      className={`group ${BASE} select-none transition-[transform,background-color] duration-150 ease-salida hover:bg-superficie-alta active:scale-[0.98]`}
    >
      {contenido}
    </Link>
  );
}

export function EsqueletoTarjeta() {
  return (
    <div aria-hidden="true" className={`${BASE} motion-safe:animate-pulse`}>
      <span className={TEXTOS}>
        <span className={`${FILA_ETIQUETA} h-[1.40625rem] items-center`}>
          <span className="h-3.5 w-32 max-w-full rounded-full bg-superficie-alta" />
        </span>
        <span className={`${FILA_DETALLE} h-5`}>
          <span className="h-3 w-24 rounded-full bg-superficie-alta" />
        </span>
      </span>
      <span className={`${CIFRA} h-[1.875rem] w-12 rounded-[8px] bg-superficie-alta sm:h-9 sm:w-16`} />
    </div>
  );
}
```

## Paso 5. Página del panel

La página es un componente de servidor sin estado. Cada sección es una función asíncrona dentro de su propio `<Suspense>` con un esqueleto del mismo tamaño. `Pendientes`, `Indicadores` y `Seguimiento` comparten una sola llamada a `/api/panel/resumen`; `Actividad` hace las suyas en paralelo.

Archivo: `web/src/app/portal/page.tsx`

```tsx
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Bienvenida, EsqueletoBienvenida } from "@/components/portal/Bienvenida";
import { EsqueletoSemaforo, SemaforoClubes } from "@/components/portal/SemaforoClubes";
import {
  EsqueletoTarjeta,
  TarjetaMetrica,
  type DatosTarjeta,
  type TonoMetrica,
} from "@/components/portal/TarjetaMetrica";
import {
  obtenerActividadPanel,
  obtenerResumenPanel,
  type ActividadPanel,
  type ResumenPanel,
} from "@/lib/api/panel";

export const metadata: Metadata = {
  title: "Panel principal",
};

type EstadoSeguimiento = NonNullable<NonNullable<ActividadPanel["indicadores"]>["estado"]>;

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const FORMATO_HORAS = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });
const FORMATO_FECHA = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const FORMATO_HORA = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Guayaquil",
});

const REJILLA = "grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4";
const TITULO_SECCION = "text-lg font-medium";
const SIN_PERIODO = "Sin datos del período";

const CUMPLIMIENTO: Record<EstadoSeguimiento, { detalle: string; tono: TonoMetrica }> = {
  ADECUADO: { detalle: "Adecuado", tono: "exito" },
  EN_RIESGO: { detalle: "En riesgo", tono: "aviso" },
  CRITICO: { detalle: "Crítico", tono: "error" },
  SIN_DATOS: { detalle: "Sin sesiones exigibles todavía", tono: "neutro" },
};

function pendiente(
  valor: number | undefined,
  conPendientes: string,
): Pick<DatosTarjeta, "detalle" | "tono"> {
  if (typeof valor !== "number") {
    return { detalle: "Sin dato", tono: "neutro" };
  }
  return valor > 0 ? { detalle: conPendientes, tono: "aviso" } : { detalle: "Al día", tono: "exito" };
}

function tarjetasDePendientes(resumen: ResumenPanel): DatosTarjeta[] {
  const pendientes = resumen.pendientes;
  return [
    {
      etiqueta: "Sesiones sin registrar",
      valor: pendientes?.sesionesSinEjecucion,
      href: "/portal/actividades",
      ...pendiente(pendientes?.sesionesSinEjecucion, "Falta registrar su ejecución"),
    },
    {
      etiqueta: "Sesiones próximas",
      valor: pendientes?.sesionesProximosSieteDias,
      detalle: "En los próximos 7 días",
      href: "/portal/actividades",
    },
    {
      etiqueta: "Solicitudes de inscripción",
      valor: pendientes?.solicitudesInscripcionPorResolver,
      href: "/portal/solicitudes",
      ...pendiente(pendientes?.solicitudesInscripcionPorResolver, "Por resolver"),
    },
    {
      etiqueta: "Solicitudes de retiro",
      valor: pendientes?.solicitudesRetiroPorResolver,
      href: "/portal/retiros",
      ...pendiente(pendientes?.solicitudesRetiroPorResolver, "Por resolver"),
    },
  ];
}

function tarjetasDeActividad(actividad: ActividadPanel): DatosTarjeta[] {
  const indicadores = actividad.indicadores;
  const exigibles = indicadores?.exigibles;
  const horasPlanificadas = indicadores?.horasPlanificadas;
  const inscripciones = actividad.inscripcionesActivas;
  const cumplimiento = indicadores?.estado ? CUMPLIMIENTO[indicadores.estado] : null;

  return [
    {
      etiqueta: "Sesiones ejecutadas",
      valor: indicadores?.ejecutadas,
      detalle:
        typeof exigibles === "number"
          ? `De ${FORMATO_NUMERO.format(exigibles)} exigibles a la fecha`
          : SIN_PERIODO,
      href: "/portal/actividades",
    },
    {
      etiqueta: "Horas de trabajo",
      valor: indicadores?.horasEjecutadas,
      decimales: 1,
      sufijo: "h",
      detalle:
        typeof horasPlanificadas === "number"
          ? `De ${FORMATO_HORAS.format(horasPlanificadas)} planificadas`
          : SIN_PERIODO,
      href: "/portal/seguimiento",
    },
    {
      etiqueta: "Cumplimiento",
      valor: indicadores?.porcentajeCumplimiento,
      sufijo: "%",
      detalle: cumplimiento?.detalle ?? SIN_PERIODO,
      tono: cumplimiento?.tono ?? "neutro",
      href: "/portal/seguimiento",
    },
    {
      etiqueta: "Estudiantes activos",
      valor: actividad.estudiantesActivos,
      detalle:
        typeof inscripciones === "number"
          ? `${FORMATO_NUMERO.format(inscripciones)} ${inscripciones === 1 ? "inscripción activa" : "inscripciones activas"}`
          : "Sin dato de inscripciones",
      href: "/portal/estudiantes",
    },
  ];
}

function tarjetasDeIndicadores(resumen: ResumenPanel): DatosTarjeta[] {
  const indicadores = resumen.indicadores;
  const activos = indicadores?.clubesActivos;
  const tarjetas: DatosTarjeta[] = [];

  if (resumen.alcanceGlobal) {
    tarjetas.push({
      etiqueta: "Instituciones",
      valor: indicadores?.instituciones,
      detalle: "Adheridas al proyecto",
      href: "/portal/instituciones",
    });
  }

  tarjetas.push(
    {
      etiqueta: "Clubes",
      valor: indicadores?.clubes,
      detalle:
        typeof activos === "number"
          ? `${FORMATO_NUMERO.format(activos)} ${activos === 1 ? "activo" : "activos"}`
          : "Registrados",
      tono: typeof activos === "number" && activos > 0 ? "exito" : "neutro",
      href: "/portal/clubes",
    },
    {
      etiqueta: "Docentes activos",
      valor: indicadores?.docentesActivos,
      detalle: "Habilitados",
      href: "/portal/docentes",
    },
  );

  if (typeof indicadores?.usuariosActivos === "number") {
    tarjetas.push({
      etiqueta: "Usuarios activos",
      valor: indicadores.usuariosActivos,
      detalle: "En todo el sistema",
      href: "/portal/usuarios",
    });
  }

  return tarjetas;
}

function contextoDe(resumen: ResumenPanel): string {
  const alcance = resumen.alcanceGlobal
    ? "todas las instituciones"
    : (resumen.institucionNombre ?? "tu institución");
  const periodo = resumen.periodoActivo?.nombre
    ? `en el período ${resumen.periodoActivo.nombre}`
    : "sin período académico activo";
  const corte = resumen.fechaCorte
    ? `, con corte al ${FORMATO_FECHA.format(new Date(`${resumen.fechaCorte}T00:00:00Z`))}`
    : "";
  return `Datos de ${alcance} ${periodo}${corte}.`;
}

function Seccion({
  id,
  titulo,
  nota,
  children,
}: {
  id: string;
  titulo: string;
  nota?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className={TITULO_SECCION}>
        {titulo}
      </h2>
      {nota ? <p className="mt-1 max-w-[70ch] text-[0.9375rem] text-tenue">{nota}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rejilla({ tarjetas }: { tarjetas: DatosTarjeta[] }) {
  return (
    <ul className={REJILLA}>
      {tarjetas.map((tarjeta) => (
        <li key={tarjeta.etiqueta}>
          <TarjetaMetrica {...tarjeta} />
        </li>
      ))}
    </ul>
  );
}

async function Pendientes() {
  const resumen = await obtenerResumenPanel();

  if (!resumen) {
    return (
      <div role="alert" className="mt-10 max-w-[60ch] rounded-pieza bg-superficie p-6">
        <h2 className={TITULO_SECCION}>No pudimos leer el resumen</h2>
        <p className="mt-2 text-tenue">
          El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada: recarga la
          página en unos minutos.
        </p>
      </div>
    );
  }

  return (
    <Seccion id="titulo-pendientes" titulo="Pendientes" nota={contextoDe(resumen)}>
      <Rejilla tarjetas={tarjetasDePendientes(resumen)} />
    </Seccion>
  );
}

async function Actividad() {
  const actividad = await obtenerActividadPanel();
  return (
    <Seccion id="titulo-actividad" titulo="Actividad del período">
      <Rejilla tarjetas={tarjetasDeActividad(actividad)} />
    </Seccion>
  );
}

async function Indicadores() {
  const resumen = await obtenerResumenPanel();
  if (!resumen) {
    return null;
  }
  return (
    <Seccion id="titulo-indicadores" titulo="Indicadores">
      <Rejilla tarjetas={tarjetasDeIndicadores(resumen)} />
    </Seccion>
  );
}

async function Seguimiento() {
  const resumen = await obtenerResumenPanel();
  if (!resumen) {
    return null;
  }
  return (
    <>
      <Seccion id="titulo-seguimiento" titulo="Seguimiento de clubes">
        <SemaforoClubes seguimiento={resumen.seguimiento} />
      </Seccion>
      {resumen.generadoEn ? (
        <p className="mt-6 text-sm text-tenue">
          Calculado a las {FORMATO_HORA.format(new Date(resumen.generadoEn))}.
        </p>
      ) : null}
    </>
  );
}

function EsqueletoSeccion({
  titulo,
  tarjetas,
  conNota = false,
}: {
  titulo: string;
  tarjetas: number;
  conNota?: boolean;
}) {
  return (
    <div aria-busy="true" className="mt-10">
      <p className="sr-only" role="status">
        Cargando {titulo.toLowerCase()}.
      </p>
      <div aria-hidden="true">
        <p className={TITULO_SECCION}>{titulo}</p>
        {conNota ? (
          <div className="mt-1 flex h-[1.40625rem] items-center motion-safe:animate-pulse">
            <div className="h-3.5 w-[28rem] max-w-full rounded-full bg-superficie" />
          </div>
        ) : null}
        <div className={`mt-4 ${REJILLA}`}>
          {Array.from({ length: tarjetas }, (_, indice) => (
            <EsqueletoTarjeta key={indice} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EsqueletoSeguimiento() {
  return (
    <div aria-hidden="true" className="mt-10">
      <p className={TITULO_SECCION}>Seguimiento de clubes</p>
      <div className="mt-4">
        <EsqueletoSemaforo />
      </div>
    </div>
  );
}

export default function PaginaPortal() {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Suspense fallback={<EsqueletoBienvenida />}>
        <Bienvenida />
      </Suspense>
      <Suspense fallback={<EsqueletoSeccion titulo="Pendientes" tarjetas={4} conNota />}>
        <Pendientes />
      </Suspense>
      <Suspense fallback={<EsqueletoSeccion titulo="Actividad del período" tarjetas={4} />}>
        <Actividad />
      </Suspense>
      <Suspense fallback={<EsqueletoSeccion titulo="Indicadores" tarjetas={3} />}>
        <Indicadores />
      </Suspense>
      <Suspense fallback={<EsqueletoSeguimiento />}>
        <Seguimiento />
      </Suspense>
    </div>
  );
}
```

## Paso 6. Compilar

Desde la carpeta `web`:

```bash
npm run lint
```

```bash
npm run tipos
```

```bash
npm run build
```

Los tres terminaron sin errores en tu equipo.

## Paso 7. Probar

Con Spring Boot en el puerto 8080 y `npm run dev` en el 3000:

1. Entra como administrador y abre `http://localhost:3000/portal`. El saludo usa tu nombre y dice que entraste como Administrador, con los accesos Usuarios, Instituciones y Períodos académicos.
2. Observa la carga: aparecen primero los pendientes y los indicadores, y un momento después las cuatro tarjetas de Actividad del período.
3. Compara las cifras con el sistema actual: sesiones ejecutadas y cumplimiento deben coincidir con la pantalla de seguimiento.
4. Entra como docente. El saludo cambia, los accesos son Actividades y sesiones, Asistencia y Evidencias, y las cifras son solo las de su alcance.

## Qué verifiqué y cómo

| Caso | Resultado | Contra qué |
|---|---|---|
| Saludo, rol y accesos rápidos para administrador, docente y consulta | Correcto | API simulada |
| Tarjetas de actividad con sesiones, horas con un decimal y porcentaje | Correcto | API simulada |
| Estado del cumplimiento según el backend: Adecuado para el administrador y En riesgo para el docente | Correcto | API simulada |
| Seguimiento con error: tres tarjetas con raya y el resto del panel intacto | Correcto | API simulada |
| Pendientes e indicadores visibles mientras la actividad sigue cargando | Correcto | Compilación de producción |
| Sin salto al cargar: el título Indicadores queda en el mismo píxel antes y después | Correcto, medido | Navegador a 1440 px |
| Las diez tarjetas del administrador miden lo mismo, 147 px | Correcto, medido | Navegador a 1440 px |
| Sin desbordamiento horizontal a 375 y 1440 px | Correcto | Navegador |
| Sin errores de consola | Correcto | Navegador |
| Cookie inválida en `/portal` redirige al login | Correcto | Spring Boot real |

**Sigue sin probarse contra tu backend real con datos verdaderos.** Probé con una API simulada que responde con los contratos exactos de `PanelResumenResponse`, `ResumenSeguimientoResponse` y los listados paginados. Los pasos 1 y 3 de la lista anterior lo confirman en un par de minutos.

## Paso 8. Guardar en Git

Desde la raíz del repositorio, en tu rama `main`:

```bash
git status
```

```bash
git add .
```

```bash
git commit -m "Paso 3 (B4): métricas de actividad del período, bienvenida por rol con accesos rápidos y carga independiente por sección en el panel principal, con guía"
```

```bash
git push origin main
```

`git status` debe listar cinco archivos de `web/src` y esta guía, `docs/guias/paso3-bloque4.md`.

## Notas

- El panel se calcula en cada visita y no guarda copia.
- Las tarjetas enlazan a secciones que hoy son páginas provisionales.
- El sistema anterior en `frontend/` sigue funcionando igual.

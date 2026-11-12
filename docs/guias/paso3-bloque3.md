# PASO 3 · Bloque 3: navegación del portal y panel principal

Este bloque reemplaza el esqueleto del portal por la interfaz interna: un menú lateral que cambia según el rol, un layout que se adapta al teléfono y un panel principal con tarjetas que leen `GET /api/panel/resumen`.

Todo está en tu rama `main`. No creé ramas ni hice commits ni push. Los comandos de Git están al final.

## Qué se construyó

| Parte | Resultado |
|---|---|
| Menú por rol | `src/lib/portal/menu.ts` define las 22 opciones y qué roles ven cada una; el servidor filtra y envía solo las permitidas |
| Menú lateral | `MenuLateral.tsx`, con iconos de `lucide-react`, opción activa marcada y animaciones tomadas de `motion.ts` |
| Teléfono | `MenuMovil.tsx`: botón de hamburguesa que abre el mismo menú en un cajón lateral |
| Layout | `app/portal/layout.tsx` con barra lateral fija desde 1024 px y la cabecera de siempre |
| Panel principal | `app/portal/page.tsx` con tarjetas de pendientes, indicadores y el semáforo de seguimiento |
| Secciones del menú | `app/portal/[modulo]/page.tsx`: una página provisional por opción, con comprobación de rol en el servidor |

## Cuatro decisiones que debes conocer

**1. El menú sale del sistema actual.** Tomé las secciones, las opciones y los roles de `frontend/js/menu.js`, que ya refleja los permisos del backend. Así el portal nuevo no promete nada que Spring Boot vaya a rechazar. Dos etiquetas cambian según el rol: el docente ve Mis clubes y Mi institución, y el responsable institucional ve Mi institución.

**2. El filtrado ocurre en el servidor.** El layout lee el rol de la sesión y llama a `seccionesParaRol`. Al navegador solo llegan las opciones de ese rol. Esto ordena la interfaz, pero la seguridad real sigue siendo la del backend, que valida cada petición.

**3. Las opciones del menú llevan a páginas provisionales.** Las pantallas de clubes, asistencia y las demás aún no existen en el portal nuevo. Para que ningún enlace termine en un error 404, cada opción abre una página que lo dice con claridad. Si alguien escribe a mano la dirección de una sección que su rol no puede ver, la página responde que no tiene acceso.

**4. En teléfono elegí hamburguesa y no barra inferior.** Un administrador tiene 22 opciones y una barra inferior admite cinco. El cajón usa la etiqueta nativa `<dialog>`, que ya trae el cierre con Escape, el foco atrapado dentro y el fondo bloqueado.

## Opciones por rol

| Sección | Administrador | Coordinador | Responsable | Docente | Consulta |
|---|---|---|---|---|---|
| Inicio (2 opciones) | Sí | Sí | Sí | Sí | Sí |
| Gestión institucional | 4 | 4 | 4 | 3, sin Períodos | 4 |
| Estudiantes (4) | Sí | Sí | Sí | Sí | Sí |
| Formación y logros (3) | Sí | Sí | Sí | Sí | Sí |
| Actividades del club (3) | Sí | Sí | Sí | Sí | Sí |
| Resultados y seguimiento (3) | Sí | Sí | Sí | Sí | Sí |
| Administración | Usuarios, Contenidos, Auditoría | No | No | No | Auditoría |
| Total | 22 | 19 | 19 | 18 | 20 |

## Cómo usé cada skill

**Impeccable, modo Operate.** El portal es una herramienta de trabajo, así que la estructura es la conocida: barra lateral, cabecera y contenido. El color solo marca estados: verde para lo que está al día, ámbar para lo pendiente y rojo para lo crítico, siempre junto a un texto y nunca solo. La opción activa usa un fondo más claro, texto principal y el icono en el color de acento; evité la barra de color en el borde izquierdo que su guía desaconseja. Pediste tarjetas de métricas y eso construí, con tres cuidados: cada tarjeta dice qué hacer con el número, las de pendientes llevan a la pantalla donde se resuelven y en teléfono se vuelven filas compactas.

**Emil Kowalski.** Las animaciones salen de `motion.ts`:

| Elemento | Decisión | Valores |
|---|---|---|
| Clic en una opción | Respuesta al pulsar con `pulsacion` | `scale(0.97)` en 140 ms |
| Puntero sobre una opción | El icono se desplaza 2 px con `empujeIcono` | Resorte `resorteFirme`, 0,22 s sin rebote |
| Cambio de opción activa | El fondo se desliza de una opción a otra | Resorte `resorteFirme` |
| Cajón del teléfono | Entra desde la izquierda con CSS | 240 ms con `cubic-bezier(0.32, 0.72, 0, 1)`; sale en 180 ms |
| Tarjetas con enlace | Cambio de fondo y respuesta al pulsar | 150 ms, `scale(0.98)` |
| Números del panel | No se animan: son datos que la persona lee | Ninguno |

No hay ningún `ease-in` y nada llega a 300 ms. Con movimiento reducido activado el cajón solo cambia de opacidad y las opciones no se desplazan.

**Taste.** Reutilicé el sistema del Bloque 1 sin decisiones nuevas: los mismos tokens OKLCH, la misma tipografía y los mismos radios.

## Suspense y esqueletos

El portal tiene cinco fronteras de `<Suspense>`. La página llega al navegador en milisegundos con la estructura y los esqueletos; cada parte se completa cuando Spring Boot responde.

| Parte | Espera a | Mientras tanto |
|---|---|---|
| Menú lateral | `GET /api/auth/me` | Filas grises con la forma del menú |
| Botón de menú en teléfono | `GET /api/auth/me` | El icono, sin acción |
| Nombre y rol en la cabecera | `GET /api/auth/me` | Dos líneas grises |
| Saludo | `GET /api/auth/me` | Una línea gris |
| Tarjetas y semáforo | `GET /api/panel/resumen` | Tarjetas grises del mismo tamaño que las reales |

Las cuatro primeras comparten una sola llamada, porque `leerSesion` está envuelta en `cache`. Medí la respuesta con el resumen retrasado tres segundos a propósito: el primer byte salió a los 6 ms y la página completa a los 3,3 s.

## Archivos nuevos y modificados

```text
web/src/
  app/
    globals.css                      modificado
    portal/layout.tsx                modificado
    portal/page.tsx                  modificado
    portal/[modulo]/page.tsx         nuevo
  components/
    portal/MenuLateral.tsx           nuevo
    portal/MenuMovil.tsx             nuevo
    portal/SemaforoClubes.tsx        nuevo
    portal/TarjetaMetrica.tsx        nuevo
    ui/Marca.tsx                     modificado
  lib/
    motion.ts                        modificado
    api/panel.ts                     nuevo
    portal/menu.ts                   nuevo
    sesion/usuario.ts                modificado
```

# Parte A. Menú lateral

## Paso 1. Nueva utilidad de movimiento

Se agrega `empujeIcono` a `motion.ts`. Es un par de estados, `reposo` y `sobre`, que mueven el icono 2 px con el resorte firme. Lo demás queda igual.

Archivo: `web/src/lib/motion.ts`

```typescript
import type { Transition, Variants } from "framer-motion";

export const CURVA_SALIDA = [0.23, 1, 0.32, 1] as const;
export const CURVA_MOVIMIENTO = [0.77, 0, 0.175, 1] as const;

export const DURACION = {
  pulsacion: 0.14,
  rapida: 0.16,
  normal: 0.22,
  maxima: 0.28,
} as const;

export const resorte: Transition = {
  type: "spring",
  visualDuration: DURACION.maxima,
  bounce: 0.18,
};

export const resorteFirme: Transition = {
  type: "spring",
  visualDuration: DURACION.normal,
  bounce: 0,
};

export const salida: Transition = {
  duration: DURACION.rapida,
  ease: CURVA_SALIDA,
};

export const ESCALONADO = 0.05;

export const entradaGrupo: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: ESCALONADO } },
  fuera: { transition: { staggerChildren: 0 } },
};

export const entradaPieza: Variants = {
  oculto: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: resorte },
  fuera: { opacity: 0, scale: 0.97, transition: salida },
};

export const empujeIcono: Variants = {
  reposo: { x: 0, transition: resorteFirme },
  sobre: { x: 2, transition: resorteFirme },
};

export const pulsacion = {
  scale: 0.97,
  transition: { duration: DURACION.pulsacion, ease: CURVA_SALIDA },
} as const;
```

## Paso 2. Definición del menú y de los roles

Este archivo no tiene interfaz: solo datos y funciones. `seccionesParaRol` devuelve las secciones que ve un rol, `buscarModulo` encuentra una sección por su identificador y `rolPuedeVer` responde si un rol tiene acceso. El tipo `IdOpcion` se deriva de la lista, así TypeScript avisa si a una opción le falta su icono.

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

## Paso 3. Componente MenuLateral

Es un componente cliente porque necesita saber en qué página está la persona (`usePathname`). Recibe las secciones ya filtradas. La opción activa lleva `aria-current="page"` y un fondo que se desliza al cambiar de página. `identificador` distingue el menú de escritorio del menú del teléfono para que sus animaciones no se mezclen.

Archivo: `web/src/components/portal/MenuLateral.tsx`

```tsx
"use client";

import { MotionConfig, motion } from "framer-motion";
import {
  Activity,
  Award,
  BookOpen,
  Bot,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  FolderKanban,
  GraduationCap,
  History,
  Images,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Presentation,
  ShieldCheck,
  Tags,
  TrendingUp,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { empujeIcono, pulsacion, resorteFirme } from "@/lib/motion";
import type { IdOpcion, SeccionMenu } from "@/lib/portal/menu";

const ICONOS: Record<IdOpcion, LucideIcon> = {
  panel: LayoutDashboard,
  catalogo: LayoutGrid,
  instituciones: Landmark,
  clubes: Bot,
  docentes: Presentation,
  periodos: CalendarRange,
  estudiantes: GraduationCap,
  historial: History,
  solicitudes: UserPlus,
  retiros: UserMinus,
  cursos: BookOpen,
  competencias: Trophy,
  certificados: Award,
  actividades: CalendarCheck,
  asistencia: ClipboardCheck,
  evidencias: Images,
  proyectos: FolderKanban,
  avances: TrendingUp,
  seguimiento: Activity,
  usuarios: Users,
  contenidos: Tags,
  auditoria: ShieldCheck,
};

const RUTA_PANEL = "/portal";

const EnlaceAnimado = motion.create(Link);

type Props = {
  secciones: SeccionMenu[];
  identificador: string;
  alNavegar?: () => void;
};

function estaActiva(ruta: string, href: string): boolean {
  if (href === RUTA_PANEL) {
    return ruta === RUTA_PANEL;
  }
  return ruta === href || ruta.startsWith(`${href}/`);
}

export function MenuLateral({ secciones, identificador, alNavegar }: Props) {
  const ruta = usePathname();

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label="Secciones del portal" className="flex-1 overflow-y-auto px-3 py-4">
        {secciones.map((seccion, indice) => {
          const idTitulo = `${identificador}-seccion-${indice}`;
          return (
            <section key={seccion.titulo} aria-labelledby={idTitulo} className="mb-5 last:mb-0">
              <h2 id={idTitulo} className="px-3 pb-1.5 text-xs font-medium text-tenue">
                {seccion.titulo}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {seccion.opciones.map((opcion) => {
                  const Icono = ICONOS[opcion.id];
                  const activa = estaActiva(ruta, opcion.href);
                  return (
                    <li key={opcion.id}>
                      <EnlaceAnimado
                        href={opcion.href}
                        onClick={alNavegar}
                        aria-current={activa ? "page" : undefined}
                        initial="reposo"
                        animate="reposo"
                        whileHover="sobre"
                        whileTap={pulsacion}
                        className={`relative flex h-10 select-none items-center gap-3 rounded-control px-3 text-[0.9375rem] transition-colors duration-150 ease-salida ${
                          activa
                            ? "font-medium text-tinta"
                            : "text-tenue hover:bg-superficie hover:text-tinta"
                        }`}
                      >
                        {activa ? (
                          <motion.span
                            layoutId={`${identificador}-activa`}
                            transition={resorteFirme}
                            className="absolute inset-0 rounded-control bg-superficie-alta"
                          />
                        ) : null}
                        <motion.span
                          variants={empujeIcono}
                          className={`relative grid shrink-0 place-items-center ${activa ? "text-acento" : ""}`}
                        >
                          <Icono aria-hidden="true" size={18} />
                        </motion.span>
                        <span className="relative truncate">{opcion.etiqueta}</span>
                      </EnlaceAnimado>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>
    </MotionConfig>
  );
}
```

## Paso 4. Estilos del cajón en globals.css

Dos cambios: la curva `--ease-cajon` dentro de `@theme` y el bloque `@layer components` con la clase `cajon`. La animación de entrada usa `@starting-style` y la de salida `transition-behavior: allow-discrete`, que permite animar un `<dialog>` al cerrarse. Mientras el cajón está abierto la página de fondo no se desplaza.

Archivo: `web/src/app/globals.css`

```css
@import "tailwindcss";

:root,
[data-theme="dark"] {
  color-scheme: dark;
  --fondo: oklch(15.9% 0.016 266.6);
  --superficie: oklch(21% 0.025 266.8);
  --superficie-alta: oklch(25.3% 0.032 265.9);
  --linea: oklch(31.9% 0.038 267.4);
  --tinta: oklch(94.5% 0.009 258.3);
  --tenue: oklch(65.5% 0.026 262.1);
  --acento: oklch(75.6% 0.132 242.1);
  --sobre-acento: oklch(15.9% 0.016 266.6);
  --exito: oklch(78.5% 0.134 160);
  --aviso: oklch(83.4% 0.141 85.4);
  --error: oklch(75.9% 0.144 26.1);
  --sombra: 0 18px 40px -18px oklch(0% 0 0 / 0.7);
}

[data-theme="light"] {
  color-scheme: light;
  --fondo: oklch(95.4% 0.005 258.3);
  --superficie: oklch(92.1% 0.008 260.7);
  --superficie-alta: oklch(89% 0.009 258.3);
  --linea: oklch(83.2% 0.014 262.4);
  --tinta: oklch(15.4% 0.005 264.4);
  --tenue: oklch(45.7% 0.014 269.4);
  --acento: oklch(45.5% 0.265 267.2);
  --sobre-acento: oklch(100% 0 0);
  --exito: oklch(46.7% 0.107 155.6);
  --aviso: oklch(47.1% 0.099 76.3);
  --error: oklch(50.1% 0.178 28.7);
  --sombra: 0 18px 40px -22px oklch(30% 0.05 265 / 0.45);
}

@theme inline {
  --color-fondo: var(--fondo);
  --color-superficie: var(--superficie);
  --color-superficie-alta: var(--superficie-alta);
  --color-linea: var(--linea);
  --color-tinta: var(--tinta);
  --color-tenue: var(--tenue);
  --color-acento: var(--acento);
  --color-sobre-acento: var(--sobre-acento);
  --color-exito: var(--exito);
  --color-aviso: var(--aviso);
  --color-error: var(--error);

  --font-sans: var(--fuente-texto), system-ui, sans-serif;
  --font-mono: var(--fuente-mono), ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --text-titular: clamp(2.5rem, 1.6rem + 2.4vw, 3.25rem);
  --text-titular--line-height: 1.04;
  --text-titular--letter-spacing: -0.036em;
  --text-seccion: clamp(1.875rem, 1.4rem + 1.6vw, 2.5rem);
  --text-seccion--line-height: 1.1;
  --text-seccion--letter-spacing: -0.028em;
  --text-cifra: clamp(2rem, 1.5rem + 1.4vw, 2.75rem);
  --text-cifra--line-height: 1;
  --text-cifra--letter-spacing: -0.03em;

  --radius-pieza: 14px;
  --radius-control: 10px;

  --shadow-pieza: var(--sombra);

  --ease-salida: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-movimiento: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-cajon: cubic-bezier(0.32, 0.72, 0, 1);
}

@layer base {
  html {
    scroll-behavior: smooth;
    scroll-padding-top: 5rem;
    scrollbar-color: var(--linea) var(--fondo);
  }

  body {
    background: var(--fondo);
    color: var(--tinta);
    font-family: var(--font-sans);
    text-rendering: optimizeLegibility;
  }

  h1,
  h2,
  h3 {
    font-weight: 500;
    font-stretch: 96%;
    text-wrap: balance;
  }

  p {
    text-wrap: pretty;
  }

  ::selection {
    background: var(--acento);
    color: var(--sobre-acento);
  }

  :focus-visible {
    outline: 2px solid var(--acento);
    outline-offset: 3px;
    border-radius: 6px;
  }

  a {
    text-underline-offset: 0.2em;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }
}

@layer components {
  .cajon {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(20rem, 86vw);
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    border-right: 1px solid var(--linea);
    background: var(--fondo);
    color: var(--tinta);
    transform: translateX(-100%);
    transition-property: transform, overlay, display;
    transition-duration: 180ms;
    transition-timing-function: var(--ease-salida);
    transition-behavior: allow-discrete;
  }

  .cajon[open] {
    transform: translateX(0);
    transition-duration: 240ms;
    transition-timing-function: var(--ease-cajon);

    @starting-style {
      transform: translateX(-100%);
    }
  }

  .cajon::backdrop {
    background: oklch(0% 0 0 / 0);
    transition-property: background-color, overlay, display;
    transition-duration: 180ms;
    transition-timing-function: var(--ease-salida);
    transition-behavior: allow-discrete;
  }

  .cajon[open]::backdrop {
    background: oklch(0% 0 0 / 0.55);

    @starting-style {
      background: oklch(0% 0 0 / 0);
    }
  }

  :root:has(.cajon[open]) {
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .cajon,
    .cajon[open] {
      transform: none;
      opacity: 0;
      transition-property: opacity, overlay, display;
      transition-duration: 160ms;
      transition-timing-function: ease;

      @starting-style {
        transform: none;
        opacity: 0;
      }
    }

    .cajon[open] {
      opacity: 1;
    }
  }
}

@utility contenedor {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: 1.5rem;
}

@utility cifras {
  font-variant-numeric: tabular-nums lining-nums;
}

@utility entrada-titular {
  transition:
    opacity 260ms var(--ease-salida),
    transform 260ms var(--ease-salida);

  @starting-style {
    opacity: 0;
    transform: scale(0.96);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 200ms ease;

    @starting-style {
      opacity: 0;
      transform: none;
    }
  }
}

@utility entrada-mensaje {
  transition:
    opacity 180ms var(--ease-salida),
    transform 180ms var(--ease-salida);

  @starting-style {
    opacity: 0;
    transform: translateY(-0.25rem);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 180ms ease;

    @starting-style {
      opacity: 0;
      transform: none;
    }
  }
}
```

## Paso 5. Marca con acción al pulsar

Se agrega la propiedad opcional `alPulsar`, que el cajón usa para cerrarse cuando se pulsa la marca.

Archivo: `web/src/components/ui/Marca.tsx`

```tsx
import Link from "next/link";

type Props = {
  href?: string;
  etiqueta?: string;
  alPulsar?: () => void;
};

export function Marca({ href = "/", etiqueta, alPulsar }: Props) {
  return (
    <Link
      href={href}
      onClick={alPulsar}
      className="flex items-baseline gap-2 text-lg font-medium tracking-tight"
    >
      TIPI
      <span className="font-mono text-sm text-tenue">3.0</span>
      {etiqueta ? (
        <span className="ml-2 border-l border-linea pl-3 text-[0.9375rem] font-normal text-tenue">
          {etiqueta}
        </span>
      ) : null}
    </Link>
  );
}
```

## Paso 6. Componente MenuMovil

Dibuja el botón de hamburguesa y el cajón. El cajón se cierra con su botón, con la tecla Escape, al pulsar fuera y al elegir una opción.

Archivo: `web/src/components/portal/MenuMovil.tsx`

```tsx
"use client";

import { Menu, X } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { Marca } from "@/components/ui/Marca";
import type { SeccionMenu } from "@/lib/portal/menu";
import { MenuLateral } from "./MenuLateral";

const BOTON_ICONO =
  "grid size-11 shrink-0 select-none place-items-center rounded-control text-tenue transition-[transform,background-color,color] duration-150 ease-salida hover:bg-superficie hover:text-tinta active:scale-[0.97]";

export function MenuMovil({ secciones }: { secciones: SeccionMenu[] }) {
  const refCajon = useRef<HTMLDialogElement>(null);

  function abrir() {
    refCajon.current?.showModal();
  }

  function cerrar() {
    refCajon.current?.close();
  }

  function alPulsarFondo(evento: MouseEvent<HTMLDialogElement>) {
    if (evento.target === evento.currentTarget) {
      cerrar();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Abrir el menú"
        aria-haspopup="dialog"
        className={BOTON_ICONO}
      >
        <Menu aria-hidden="true" size={20} />
      </button>
      <dialog ref={refCajon} aria-label="Menú del portal" onClick={alPulsarFondo} className="cajon">
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-linea pl-6 pr-3">
            <Marca href="/portal" etiqueta="Portal" alPulsar={cerrar} />
            <button type="button" onClick={cerrar} aria-label="Cerrar el menú" className={BOTON_ICONO}>
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          <MenuLateral secciones={secciones} identificador="telefono" alNavegar={cerrar} />
        </div>
      </dialog>
    </>
  );
}
```

# Parte B. Layout del portal

## Paso 7. Layout responsivo

Desde 1024 px de ancho la barra lateral queda fija a la izquierda, con 272 px. Por debajo de ese ancho desaparece y la cabecera muestra el botón de hamburguesa. La cabecera conserva el nombre, el rol, el selector de tema y el botón Salir. Cada parte que depende de la sesión va en su propio `<Suspense>`.

Archivo: `web/src/app/portal/layout.tsx`

```tsx
import { Menu } from "lucide-react";
import { Suspense } from "react";
import { BotonCerrarSesion } from "@/components/portal/BotonCerrarSesion";
import { MenuLateral } from "@/components/portal/MenuLateral";
import { MenuMovil } from "@/components/portal/MenuMovil";
import { Marca } from "@/components/ui/Marca";
import { SelectorTema } from "@/components/ui/SelectorTema";
import { seccionesParaRol } from "@/lib/portal/menu";
import { exigirSesion, nombreDeRol } from "@/lib/sesion/usuario";

async function MenuDeEscritorio() {
  const usuario = await exigirSesion();
  return <MenuLateral secciones={seccionesParaRol(usuario?.rol)} identificador="escritorio" />;
}

async function MenuDeTelefono() {
  const usuario = await exigirSesion();
  return <MenuMovil secciones={seccionesParaRol(usuario?.rol)} />;
}

async function UsuarioEnCabecera() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return <p className="hidden text-sm text-aviso sm:block">Sesión sin verificar</p>;
  }

  return (
    <div className="hidden min-w-0 text-right leading-tight sm:block">
      <p className="max-w-[16rem] truncate text-[0.9375rem] font-medium">
        {usuario.nombres} {usuario.apellidos}
      </p>
      <p className="max-w-[16rem] truncate text-sm text-tenue">{nombreDeRol(usuario.rol)}</p>
    </div>
  );
}

function EsqueletoUsuario() {
  return (
    <div aria-hidden="true" className="hidden flex-col items-end gap-1.5 sm:flex">
      <span className="h-3.5 w-36 rounded-full bg-superficie-alta" />
      <span className="h-3 w-24 rounded-full bg-superficie" />
    </div>
  );
}

function EsqueletoMenu() {
  return (
    <div aria-hidden="true" className="flex-1 px-3 py-4 motion-safe:animate-pulse">
      {[4, 3, 4, 3].map((filas, grupo) => (
        <div key={grupo} className="mb-6">
          <div className="mx-3 mb-3 h-3 w-24 rounded-full bg-superficie" />
          {Array.from({ length: filas }, (_, fila) => (
            <div key={fila} className="flex h-10 items-center gap-3 px-3">
              <span className="size-[18px] rounded-[5px] bg-superficie-alta" />
              <span className="h-3.5 w-32 rounded-full bg-superficie-alta" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BotonMenuEnEspera() {
  return (
    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center text-tenue">
      <Menu size={20} />
    </span>
  );
}

export default function LayoutPortal({ children }: LayoutProps<"/portal">) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col border-r border-linea lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-linea px-6">
          <Marca href="/portal" etiqueta="Portal" />
        </div>
        <Suspense fallback={<EsqueletoMenu />}>
          <MenuDeEscritorio />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-linea bg-fondo/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-3 sm:px-6 lg:px-10">
            <div className="flex items-center gap-2 lg:hidden">
              <Suspense fallback={<BotonMenuEnEspera />}>
                <MenuDeTelefono />
              </Suspense>
              <Marca href="/portal" />
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <Suspense fallback={<EsqueletoUsuario />}>
                <UsuarioEnCabecera />
              </Suspense>
              <SelectorTema className="sm:ml-2" />
              <BotonCerrarSesion />
            </div>
          </div>
        </header>
        <main id="contenido" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
```

## Paso 8. Página provisional de cada sección

La carpeta se llama `[modulo]`, con los corchetes: es una ruta dinámica. `generateStaticParams` le entrega a Next.js las 21 secciones para que las prepare al compilar. Si el identificador no existe, responde con la página 404. La comprobación del rol ocurre en el servidor.

Archivo: `web/src/app/portal/[modulo]/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { MODULOS_DEL_PORTAL, buscarModulo, rolPuedeVer, type ModuloPortal } from "@/lib/portal/menu";
import { exigirSesion } from "@/lib/sesion/usuario";

export function generateStaticParams() {
  return MODULOS_DEL_PORTAL.map((modulo) => ({ modulo: modulo.id }));
}

export async function generateMetadata({ params }: PageProps<"/portal/[modulo]">): Promise<Metadata> {
  const { modulo } = await params;
  return { title: buscarModulo(modulo)?.etiqueta ?? "Página no encontrada" };
}

async function EstadoDelModulo({ modulo }: { modulo: ModuloPortal }) {
  const usuario = await exigirSesion();

  if (usuario && !rolPuedeVer(modulo, usuario.rol)) {
    return (
      <p role="alert" className="mt-4 max-w-[60ch] text-tenue">
        Tu rol no tiene acceso a esta sección. Si crees que es un error, avisa a la coordinación de
        TIPI 3.0.
      </p>
    );
  }

  return (
    <p className="mt-4 max-w-[60ch] text-tenue">
      Esta pantalla del nuevo portal se construye en un bloque posterior. Mientras tanto, la misma
      función sigue disponible en el sistema actual.
    </p>
  );
}

function EsqueletoEstado() {
  return (
    <div
      aria-hidden="true"
      className="mt-5 h-4 w-[26rem] max-w-full rounded-full bg-superficie motion-safe:animate-pulse"
    />
  );
}

export default async function PaginaModulo({ params }: PageProps<"/portal/[modulo]">) {
  const { modulo: id } = await params;
  const modulo = buscarModulo(id);

  if (!modulo) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-medium tracking-tight">{modulo.etiqueta}</h1>
      <Suspense fallback={<EsqueletoEstado />}>
        <EstadoDelModulo modulo={modulo} />
      </Suspense>
      <Link
        href="/portal"
        className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
      >
        <ArrowLeft
          aria-hidden="true"
          size={16}
          className="transition-transform duration-150 ease-salida group-hover:-translate-x-0.5 motion-reduce:transform-none"
        />
        Volver al panel principal
      </Link>
    </div>
  );
}
```

# Parte C. Panel principal

## Paso 9. Lectura del token reutilizable

Se extrae `leerToken` para que el panel y las futuras pantallas lean la cookie de un solo lugar.

Archivo: `web/src/lib/sesion/usuario.ts`

```typescript
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api, type Esquemas } from "@/lib/api/cliente";
import { COOKIE_SESION, RUTA_SESION_EXPIRADA } from "./cookie";

export type UsuarioSesion = Esquemas["UsuarioResumen"];

export type ResultadoSesion =
  | { estado: "activa"; usuario: UsuarioSesion }
  | { estado: "ausente" }
  | { estado: "sin-servicio" };

const ESPERA_MAXIMA_MS = 6000;

export async function leerToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_SESION)?.value;
}

export const leerSesion = cache(async (): Promise<ResultadoSesion> => {
  const token = await leerToken();
  if (!token) {
    return { estado: "ausente" };
  }

  try {
    const { data, response } = await api.GET("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    if (data) {
      return { estado: "activa", usuario: data };
    }
    if (response.status === 401 || response.status === 403) {
      return { estado: "ausente" };
    }
    return { estado: "sin-servicio" };
  } catch {
    return { estado: "sin-servicio" };
  }
});

export async function exigirSesion(): Promise<UsuarioSesion | null> {
  const sesion = await leerSesion();
  if (sesion.estado === "ausente") {
    redirect(RUTA_SESION_EXPIRADA);
  }
  return sesion.estado === "activa" ? sesion.usuario : null;
}

const NOMBRES_ROL: Record<string, string> = {
  ADMIN: "Administrador",
  COORDINADOR: "Coordinador TIPI 3.0",
  RESP_INSTITUCIONAL: "Responsable institucional",
  DOCENTE: "Docente coordinador",
  CONSULTA: "Consulta",
};

export function nombreDeRol(codigo?: string): string {
  return (codigo && NOMBRES_ROL[codigo]) || "Sin rol";
}
```

## Paso 10. Consulta del resumen del panel

`obtenerResumenPanel` llama a `GET /api/panel/resumen` con `openapi-fetch` y el JWT de la cookie. Si Spring Boot responde 401, redirige al login. Si no responde, devuelve `null` y el panel muestra un aviso. El backend ya filtra los datos por rol e institución, así que aquí no se repite esa lógica.

Archivo: `web/src/lib/api/panel.ts`

```typescript
import "server-only";
import { redirect } from "next/navigation";
import { RUTA_SESION_EXPIRADA } from "@/lib/sesion/cookie";
import { leerToken } from "@/lib/sesion/usuario";
import { api, type Esquemas } from "./cliente";

export type ResumenPanel = Esquemas["PanelResumenResponse"];

const ESPERA_MAXIMA_MS = 10000;

async function pedirResumen(token: string) {
  try {
    const { data, response } = await api.GET("/api/panel/resumen", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    return { resumen: data ?? null, estado: response.status };
  } catch {
    return { resumen: null, estado: 0 };
  }
}

export async function obtenerResumenPanel(): Promise<ResumenPanel | null> {
  const token = await leerToken();
  if (!token) {
    redirect(RUTA_SESION_EXPIRADA);
  }

  const { resumen, estado } = await pedirResumen(token);
  if (estado === 401) {
    redirect(RUTA_SESION_EXPIRADA);
  }
  return resumen;
}
```

## Paso 11. Tarjeta de métrica

Muestra una etiqueta, un número y un detalle con un punto de color. Si recibe `href`, toda la tarjeta es un enlace. En teléfono se vuelve una fila con el número a la derecha. `EsqueletoTarjeta` ocupa exactamente el mismo espacio.

Archivo: `web/src/components/portal/TarjetaMetrica.tsx`

```tsx
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export type TonoMetrica = "neutro" | "exito" | "aviso" | "error";

type Props = {
  etiqueta: string;
  valor?: number;
  detalle: string;
  tono?: TonoMetrica;
  href?: string;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
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

export function TarjetaMetrica({ etiqueta, valor, detalle, tono = "neutro", href }: Props) {
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
        {typeof valor === "number" ? FORMATO_NUMERO.format(valor) : SIN_DATO}
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

## Paso 12. Semáforo de seguimiento

Una barra dividida en proporción a los clubes adecuados, en riesgo, críticos y sin datos, con su leyenda y sus números. La barra tiene una descripción para lectores de pantalla. Si no hay período activo, lo explica en lugar de mostrar ceros.

Archivo: `web/src/components/portal/SemaforoClubes.tsx`

```tsx
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Esquemas } from "@/lib/api/cliente";

type Seguimiento = Esquemas["SeguimientoPanel"];

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");

const ESTADOS = [
  { clave: "clubesAdecuados", etiqueta: "Adecuados", color: "bg-exito" },
  { clave: "clubesEnRiesgo", etiqueta: "En riesgo", color: "bg-aviso" },
  { clave: "clubesCriticos", etiqueta: "Críticos", color: "bg-error" },
  { clave: "clubesSinDatos", etiqueta: "Sin datos", color: "bg-tenue" },
] as const satisfies readonly { clave: keyof Seguimiento; etiqueta: string; color: string }[];

const BASE = "rounded-pieza bg-superficie p-5 sm:p-6";

export function SemaforoClubes({ seguimiento }: { seguimiento?: Seguimiento }) {
  if (!seguimiento) {
    return (
      <div className={BASE}>
        <p className="max-w-[60ch] text-tenue">
          No hay un período académico activo, así que todavía no se calcula el seguimiento de los
          clubes.
        </p>
      </div>
    );
  }

  const total = seguimiento.totalClubes ?? 0;
  const filas = ESTADOS.map((estado) => ({ ...estado, cantidad: seguimiento[estado.clave] ?? 0 }));
  const descripcion = filas
    .map((fila) => `${fila.cantidad} ${fila.etiqueta.toLowerCase()}`)
    .join(", ");

  return (
    <div className={BASE}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-[0.9375rem] text-tenue">
          <span className="cifras text-2xl font-medium tracking-tight text-tinta">
            {FORMATO_NUMERO.format(total)}
          </span>{" "}
          {total === 1 ? "club evaluado" : "clubes evaluados"} en el período
        </p>
        <Link
          href="/portal/seguimiento"
          className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-acento"
        >
          Ver el seguimiento
          <ArrowUpRight
            aria-hidden="true"
            size={16}
            className="transition-transform duration-150 ease-salida group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
          />
        </Link>
      </div>

      {total > 0 ? (
        <div
          role="img"
          aria-label={`Distribución de los clubes: ${descripcion}.`}
          className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        >
          {filas
            .filter((fila) => fila.cantidad > 0)
            .map((fila) => (
              <span key={fila.clave} className={fila.color} style={{ flexGrow: fila.cantidad }} />
            ))}
        </div>
      ) : (
        <div aria-hidden="true" className="mt-5 h-2.5 rounded-full bg-superficie-alta" />
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {filas.map((fila) => (
          <div key={fila.clave}>
            <dt className="flex items-center gap-2 text-sm text-tenue">
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${fila.color}`} />
              {fila.etiqueta}
            </dt>
            <dd className="cifras mt-1 text-xl font-medium">{FORMATO_NUMERO.format(fila.cantidad)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function EsqueletoSemaforo() {
  return (
    <div aria-hidden="true" className={`${BASE} motion-safe:animate-pulse`}>
      <div className="flex h-8 items-center">
        <div className="h-5 w-56 max-w-full rounded-full bg-superficie-alta" />
      </div>
      <div className="mt-5 h-2.5 rounded-full bg-superficie-alta" />
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((columna) => (
          <div key={columna} className="h-[3.25rem] rounded-[8px] bg-superficie-alta" />
        ))}
      </div>
    </div>
  );
}
```

## Paso 13. Página del panel principal

Tiene dos fronteras de `<Suspense>`: el saludo, que llega rápido, y el resumen, que puede tardar porque el backend hace varias consultas. La tarjeta de instituciones solo aparece para quien ve todas las instituciones, y la de usuarios activos solo para el administrador, porque el backend solo envía ese dato a ese rol.

Archivo: `web/src/app/portal/page.tsx`

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoSemaforo, SemaforoClubes } from "@/components/portal/SemaforoClubes";
import {
  EsqueletoTarjeta,
  TarjetaMetrica,
  type TonoMetrica,
} from "@/components/portal/TarjetaMetrica";
import { obtenerResumenPanel, type ResumenPanel } from "@/lib/api/panel";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Panel principal",
};

type Tarjeta = {
  etiqueta: string;
  valor?: number;
  detalle: string;
  tono?: TonoMetrica;
  href?: string;
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
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

const REJILLA = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";
const TITULO_SECCION = "text-lg font-medium";

function pendiente(valor: number | undefined, conPendientes: string): Pick<Tarjeta, "detalle" | "tono"> {
  if (typeof valor !== "number") {
    return { detalle: "Sin dato", tono: "neutro" };
  }
  return valor > 0 ? { detalle: conPendientes, tono: "aviso" } : { detalle: "Al día", tono: "exito" };
}

function tarjetasDePendientes(resumen: ResumenPanel): Tarjeta[] {
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

function tarjetasDeIndicadores(resumen: ResumenPanel): Tarjeta[] {
  const indicadores = resumen.indicadores;
  const activos = indicadores?.clubesActivos;
  const tarjetas: Tarjeta[] = [];

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
  return `Resumen de ${alcance} ${periodo}${corte}.`;
}

function Rejilla({ tarjetas }: { tarjetas: Tarjeta[] }) {
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

async function Saludo() {
  const usuario = await exigirSesion();
  return (
    <h1 className="text-3xl font-medium tracking-tight">
      {usuario?.nombres ? `Hola, ${usuario.nombres}` : "Panel principal"}
    </h1>
  );
}

async function Resumen() {
  const resumen = await obtenerResumenPanel();

  if (!resumen) {
    return (
      <div role="alert" className="mt-8 max-w-[60ch] rounded-pieza bg-superficie p-6">
        <h2 className={TITULO_SECCION}>No pudimos leer el resumen</h2>
        <p className="mt-2 text-tenue">
          El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada: recarga la
          página en unos minutos.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mt-3 max-w-[70ch] text-tenue">{contextoDe(resumen)}</p>

      <section aria-labelledby="titulo-pendientes" className="mt-10">
        <h2 id="titulo-pendientes" className={TITULO_SECCION}>
          Pendientes
        </h2>
        <div className="mt-4">
          <Rejilla tarjetas={tarjetasDePendientes(resumen)} />
        </div>
      </section>

      <section aria-labelledby="titulo-indicadores" className="mt-10">
        <h2 id="titulo-indicadores" className={TITULO_SECCION}>
          Indicadores
        </h2>
        <div className="mt-4">
          <Rejilla tarjetas={tarjetasDeIndicadores(resumen)} />
        </div>
      </section>

      <section aria-labelledby="titulo-seguimiento" className="mt-10">
        <h2 id="titulo-seguimiento" className={TITULO_SECCION}>
          Seguimiento de clubes
        </h2>
        <div className="mt-4">
          <SemaforoClubes seguimiento={resumen.seguimiento} />
        </div>
      </section>

      {resumen.generadoEn ? (
        <p className="mt-6 text-sm text-tenue">
          Calculado a las {FORMATO_HORA.format(new Date(resumen.generadoEn))}.
        </p>
      ) : null}
    </>
  );
}

function EsqueletoResumen() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Cargando el resumen del panel.
      </p>
      <div aria-hidden="true">
        <div className="mt-3 flex h-6 items-center motion-safe:animate-pulse">
          <div className="h-4 w-[30rem] max-w-full rounded-full bg-superficie" />
        </div>
        {[
          { titulo: "Pendientes", tarjetas: 4 },
          { titulo: "Indicadores", tarjetas: 3 },
        ].map((grupo) => (
          <div key={grupo.titulo} className="mt-10">
            <p className={TITULO_SECCION}>{grupo.titulo}</p>
            <div className={`mt-4 ${REJILLA}`}>
              {Array.from({ length: grupo.tarjetas }, (_, indice) => (
                <EsqueletoTarjeta key={indice} />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-10">
          <p className={TITULO_SECCION}>Seguimiento de clubes</p>
          <div className="mt-4">
            <EsqueletoSemaforo />
          </div>
        </div>
      </div>
    </div>
  );
}

function EsqueletoSaludo() {
  return <div aria-hidden="true" className="h-9 w-64 max-w-full rounded-[10px] bg-superficie-alta" />;
}

export default function PaginaPortal() {
  return (
    <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Suspense fallback={<EsqueletoSaludo />}>
        <Saludo />
      </Suspense>
      <Suspense fallback={<EsqueletoResumen />}>
        <Resumen />
      </Suspense>
    </div>
  );
}
```

# Parte D. Comprobar y guardar

## Paso 14. Compilar

Desde la carpeta `web`. Como hay una ruta nueva, primero se regeneran los tipos de rutas; si tienes `npm run dev` abierto, ese paso ya ocurrió solo.

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

Los cuatro terminaron sin errores en tu equipo. La compilación lista ahora las secciones del portal:

```text
├ ◐ /portal
└   /portal/[modulo]
  ├ ◐ /portal/[modulo]
  ├ ◐ /portal/catalogo
  ├ ◐ /portal/instituciones
  └ ◐ [+19 more paths]

ƒ Proxy (Middleware)
```

## Paso 15. Probar

Con Spring Boot en el puerto 8080 y `npm run dev` en el 3000:

1. Entra como administrador. El menú muestra las siete secciones y el panel carga las tarjetas después de un instante de esqueletos.
2. Pulsa una opción del menú. El fondo de la opción activa se desliza hasta ella y aparece la página provisional.
3. Entra como docente. No aparecen Períodos académicos ni la sección Administración, y el menú dice Mis clubes.
4. Con la sesión del docente, escribe `http://localhost:3000/portal/usuarios` en la barra de direcciones. La página responde que el rol no tiene acceso.
5. Reduce la ventana por debajo de 1024 px o abre las herramientas del navegador en modo teléfono. Aparece el botón de hamburguesa; el cajón se cierra con Escape, al pulsar fuera y al elegir una opción.
6. Cambia el tema con el selector y revisa el panel en claro y en oscuro.

## Qué verifiqué y cómo

| Caso | Resultado | Contra qué |
|---|---|---|
| Administrador ve 22 opciones | Correcto | API simulada |
| Docente ve 18, sin Períodos ni Administración, con Mis clubes y Mi institución | Correcto | API simulada |
| La opción activa cambia al navegar | Correcto | API simulada |
| Sección prohibida para el rol muestra el aviso | Correcto | API simulada |
| Dirección inexistente bajo `/portal` muestra la página 404 | Correcto | Compilación de producción |
| El cajón abre y cierra con Escape, fondo y navegación | Correcto | Navegador a 375 px |
| Sin desbordamiento horizontal a 375 y 1440 px | Correcto | Navegador |
| Tarjetas y esqueletos con la misma altura en escritorio | Correcto, medido en píxeles | Navegador |
| Primer byte a los 6 ms con el resumen retrasado 3 s | Correcto | Compilación de producción |
| Cookie inválida en `/portal` y en una sección redirige al login | Correcto | Spring Boot real |
| Tema claro y oscuro | Correcto | Navegador |

**Lo que falta comprobar contra tu backend real es el panel con datos verdaderos.** Sigo sin una contraseña válida en este equipo, así que probé con una API simulada que responde con el contrato exacto de `PanelResumenResponse`. El paso 1 de la lista anterior lo confirma en un minuto.

## Paso 16. Guardar en Git

Tu commit "Guardar cambios locales antes de reescribir el historial" ya incluyó los 13 archivos de código de este bloque y está subido a `main`. Lo único que falta guardar es esta guía. Desde la raíz del repositorio:

```bash
git status
```

```bash
git add .
```

```bash
git commit -m "Paso 3 (B3): guía del menú lateral por rol, el layout responsivo del portal y el panel principal con tarjetas y esqueletos"
```

```bash
git push origin main
```

El primer comando solo muestra qué va a entrar: debe aparecer `docs/guias/paso3-bloque3.md` y nada más.

## Notas

- Las tarjetas de pendientes enlazan a las secciones donde se resuelven. Hoy esas secciones son páginas provisionales.
- El panel se calcula en cada visita; no guarda copia. El pie del panel muestra la hora del cálculo.
- El sistema anterior en `frontend/` sigue funcionando igual.

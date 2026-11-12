# PASO 3 · Bloque 2: ajustes al Bloque 1, autenticación con cookie httpOnly y rutas protegidas

Este bloque aplica los dos ajustes pedidos sobre el Bloque 1 (título oficial y selector de tema) y reemplaza el acceso provisional por un inicio de sesión real. El navegador ya no recibe el token: Next.js lo guarda en una cookie `httpOnly` y solo el servidor de Next.js habla con Spring Boot.

Todo está aplicado en tu carpeta `web`. No hice ningún commit, rama ni push: los cambios están sin confirmar para que los revises y los subas tú.

## Qué se construyó

| Parte | Resultado |
|---|---|
| Título oficial | Una sola constante en `src/lib/proyecto.ts`, usada por los metadatos y por el pie |
| Tema claro y oscuro | `next-themes` 0.4.6, tokens por `data-theme` en `globals.css` y el botón `SelectorTema` |
| Inicio de sesión | `POST /api/auth/iniciar-sesion` en Next.js llama a `POST /api/auth/login` de Spring Boot y guarda el JWT en la cookie `tipi_sesion` |
| Cierre de sesión | `POST /api/auth/cerrar-sesion` revoca el token en Spring Boot y vence la cookie |
| Rutas protegidas | `src/proxy.ts` redirige a `/login` todo lo que esté bajo `/portal` si no hay cookie |
| Formulario | `/login` con validación por campo, mensaje de error estable y botón con estado de carga |
| Portal | `/portal` con cabecera que muestra el usuario leído de `GET /api/auth/me` |

## Cuatro decisiones que debes conocer

**1. El archivo se llama `proxy.ts`, no `middleware.ts`.** Pediste `middleware.ts`, pero la documentación de Next.js 16 que viene instalada en el proyecto (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`) declara obsoleta esa convención: desde la versión 16 el archivo se llama `proxy.ts` y la función exportada `proxy`. Hace exactamente lo mismo y vive en el mismo sitio, `src/`. La compilación lo confirma con la línea `ƒ Proxy (Middleware)`.

**2. El proxy solo comprueba que la cookie exista.** No puede validar la firma del JWT porque la clave secreta es del backend. La validación real ocurre en Spring Boot cada vez que el portal pide `GET /api/auth/me`. Si el token está vencido o revocado, el portal redirige a `/login?sesion=expirada` y el formulario avisa que la sesión terminó.

**3. Entrar y salir recargan la página completa.** Tras iniciar o cerrar sesión uso `window.location.replace` en lugar del enrutador de Next.js. Así el navegador descarta todo lo que tenía en memoria del usuario anterior y el botón Atrás no regresa a una pantalla del portal.

**4. La cookie es `Secure` solo en producción.** En desarrollo (`npm run dev`) viaja por `http://localhost`. En producción (`npm run start`) lleva `Secure`, así que el sitio debe servirse por HTTPS; `localhost` es la única excepción que aceptan los navegadores.

## Atributos de la cookie

| Atributo | Valor | Para qué |
|---|---|---|
| Nombre | `tipi_sesion` | Identifica la sesión |
| `HttpOnly` | siempre | JavaScript no puede leerla, ni siquiera con un XSS |
| `Secure` | en producción | Solo viaja por HTTPS |
| `SameSite` | `Strict` | No se envía en peticiones que vienen de otros sitios |
| `Path` | `/` | Disponible para todo el sitio |
| `Max-Age` | `expiresInSeconds` del backend, hoy 1800 | Vence junto con el JWT, a los 30 minutos |

Además los dos manejadores comparan la cabecera `Origin` con el anfitrión y rechazan con 403 las peticiones de otro origen. También reenvían `X-Forwarded-For` a Spring Boot para que la auditoría registre la IP de la persona y no la del servidor de Next.js.

## Cómo usé cada skill

**Impeccable, modo Operate.** El formulario y el portal son superficies de trabajo, así que apliqué su regla de familiaridad: controles estándar, etiquetas visibles encima de cada campo, todos los estados (reposo, foco, error, carga) y esqueletos en lugar de indicadores giratorios mientras llega el usuario. Los titulares del portal usan tamaño fijo en lugar de fluido. Su cargador de contexto no se ejecutó porque necesita descargar un programa; leí sus guías `craft-floor.md` y `operate.md` directamente.

**Taste.** Seguí sus reglas de formulario: cada error aparece debajo de su propio campo, las etiquetas siempre se ven y el texto nombra el problema y cómo resolverlo. No ejecuté sus repartidores ni su verificador porque el sistema de diseño ya quedó decidido en el Bloque 1 y aquí solo se reutiliza.

**Emil Kowalski.** Cada animación pasó por su secuencia de decisiones:

| Elemento | Decisión | Valores |
|---|---|---|
| Icono del selector de tema | Cambia de estado; el sol y la luna se cruzan | Entrada con resorte de 0,22 s sin rebote desde `scale(0.9)` y giro de 40°, salida de 140 ms |
| Cambio de colores del tema | No se anima: `disableTransitionOnChange` evita que unos elementos cambien antes que otros | Ninguno |
| Botón al enviar | El texto y el indicador de carga se cruzan con un desenfoque de 2 px | 150 ms, `cubic-bezier(0.23, 1, 0.32, 1)` |
| Indicador de carga | Gira rápido para que la espera se sienta corta | 600 ms por vuelta |
| Mensajes de error | Entran con `@starting-style`; el mismo mensaje no vuelve a animarse | 180 ms desde opacidad 0 y 4 px arriba |
| Botones | Respuesta al pulsar | `scale(0.97)` en 150 ms |

No hay ningún `ease-in` y nada supera los 300 ms. Con movimiento reducido activado quedan solo los cambios de opacidad.

**Sin parpadeos.** El formulario reserva el espacio de los mensajes, así que nada salta cuando aparece un error. El error general va debajo del botón y se mantiene visible mientras se reintenta. Si el servidor rechaza las credenciales muy rápido, el estado de carga dura al menos 400 ms para que el botón no destelle; un inicio de sesión correcto no espera nada.

## Archivos nuevos y modificados

```text
web/
  package.json                          modificado
  src/
    proxy.ts                            nuevo
    app/
      globals.css                       modificado
      layout.tsx                        modificado
      login/page.tsx                    modificado
      portal/layout.tsx                 nuevo
      portal/page.tsx                   nuevo
      api/auth/iniciar-sesion/route.ts  nuevo
      api/auth/cerrar-sesion/route.ts   nuevo
    components/
      acceso/FormularioAcceso.tsx       nuevo
      landing/Navegacion.tsx            modificado
      landing/Pie.tsx                   modificado
      portal/BotonCerrarSesion.tsx      nuevo
      ui/Boton.tsx                      nuevo
      ui/Campo.tsx                      nuevo
      ui/EnlaceBoton.tsx                modificado
      ui/Marca.tsx                      nuevo
      ui/SelectorTema.tsx               nuevo
      ui/estilos-boton.ts               nuevo
    lib/
      proyecto.ts                       nuevo
      sesion/cookie.ts                  nuevo
      sesion/peticion.ts                nuevo
      sesion/usuario.ts                 nuevo
```

# Parte A. Ajustes al Bloque 1

## Paso 1. Instalar next-themes

Desde la carpeta `web`:

```bash
npm install next-themes@0.4.6
```

Es la biblioteca estándar para temas en Next.js: guarda la elección en `localStorage`, respeta el tema del sistema mientras la persona no elija y aplica el tema antes de pintar la página, así no hay destello. El archivo `package.json` queda así:

Archivo: `web/package.json`

```json
{
  "name": "tipi-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "tipos": "tsc --noEmit",
    "api:tipos": "npm --prefix ../herramientas/tipos-api run tipos"
  },
  "dependencies": {
    "framer-motion": "^14.12.0",
    "lucide-react": "^1.72.0",
    "next": "16.4.6",
    "next-themes": "^0.4.6",
    "openapi-fetch": "^0.17.0",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@tailwindcss/turbopack": "4.3.3",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.4.6",
    "tailwindcss": "4.3.3",
    "typescript": "^5"
  }
}
```

## Paso 2. Título oficial en una sola constante

El título vive en un solo lugar para que los metadatos y el pie nunca queden distintos.

Archivo: `web/src/lib/proyecto.ts`

```typescript
export const NOMBRE_CORTO = "TIPI 3.0";

export const TITULO_OFICIAL =
  "Diseño e implementación de un sistema web para la gestión multiinstitucional segura y trazabilidad de clubes de robótica y programación del proyecto TIPI 3.0";
```

## Paso 3. Metadatos y proveedor de tema en el layout

Dos cambios. El título por defecto de las páginas es ahora el título oficial, y las páginas con título propio siguen mostrando `Título · TIPI 3.0`. El `ThemeProvider` envuelve la aplicación y escribe `data-theme="light"` o `data-theme="dark"` en la etiqueta `html`. Como ese atributo lo pone un script antes de que React cargue, `html` lleva `suppressHydrationWarning`.

Archivo: `web/src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NOMBRE_CORTO, TITULO_OFICIAL } from "@/lib/proyecto";
import "./globals.css";

const fuenteTexto = Instrument_Sans({
  variable: "--fuente-texto",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const fuenteMono = DM_Mono({
  variable: "--fuente-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: NOMBRE_CORTO,
  title: {
    default: TITULO_OFICIAL,
    template: `%s · ${NOMBRE_CORTO}`,
  },
  description:
    "TIPI 3.0 registra instituciones, clubes, sesiones y evidencias de los clubes de robótica y programación de las unidades educativas fiscales de la Zona 8.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0d14" },
    { media: "(prefers-color-scheme: light)", color: "#eef0f3" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fuenteTexto.variable} ${fuenteMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="tipi-tema"
        >
          <a
            href="#contenido"
            className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-control focus-visible:bg-acento focus-visible:px-4 focus-visible:py-2 focus-visible:text-sobre-acento"
          >
            Saltar al contenido
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Paso 4. Título oficial en el pie

El pie muestra el título completo, tomado de la constante.

Archivo: `web/src/components/landing/Pie.tsx`

```tsx
import { TITULO_OFICIAL } from "@/lib/proyecto";

export function Pie() {
  return (
    <footer className="border-t border-linea py-10 text-sm text-tenue">
      <div className="contenedor flex flex-col gap-4 md:flex-row md:items-baseline md:justify-between md:gap-12">
        <p className="max-w-[62ch] font-medium text-tinta">{TITULO_OFICIAL}.</p>
        <p className="max-w-[40ch] md:text-right">
          Las fichas del inicio usan datos de ejemplo. Las cifras del tablero son reales.
        </p>
      </div>
    </footer>
  );
}
```

## Paso 5. Tokens por atributo en globals.css

El bloque `@media (prefers-color-scheme: light)` desaparece. Ahora el tema oscuro aplica a `:root` y a `[data-theme="dark"]`, y el claro a `[data-theme="light"]`. Los valores OKLCH son los mismos del Bloque 1. Al final hay una utilidad nueva, `entrada-mensaje`, que usan los mensajes de error del formulario.

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

## Paso 6. Componente SelectorTema

Es un botón de 44 px que alterna entre claro y oscuro. Muestra el sol cuando el tema es oscuro y la luna cuando es claro, y su etiqueta accesible nombra la acción. El servidor no conoce el tema, así que el icono se dibuja solo cuando el componente ya está en el navegador; eso evita errores de hidratación.

Archivo: `web/src/components/ui/SelectorTema.tsx`

```tsx
"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { CURVA_SALIDA, DURACION, resorteFirme } from "@/lib/motion";

const ICONO_OCULTO = { opacity: 0, scale: 0.9, rotate: -40 };
const ICONO_VISIBLE = { opacity: 1, scale: 1, rotate: 0, transition: resorteFirme };
const ICONO_FUERA = {
  opacity: 0,
  scale: 0.9,
  rotate: 40,
  transition: { duration: DURACION.pulsacion, ease: CURVA_SALIDA },
};

const sinSuscripcion = () => () => {};
const enCliente = () => true;
const enServidor = () => false;

export function SelectorTema({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useSyncExternalStore(sinSuscripcion, enCliente, enServidor);
  const [usado, setUsado] = useState(false);

  const oscuro = resolvedTheme !== "light";
  const Icono = oscuro ? Sun : Moon;
  const etiqueta = montado
    ? oscuro
      ? "Cambiar a tema claro"
      : "Cambiar a tema oscuro"
    : "Cambiar tema";

  function alternar() {
    setUsado(true);
    setTheme(oscuro ? "light" : "dark");
  }

  return (
    <MotionConfig reducedMotion="user">
      <button
        type="button"
        onClick={alternar}
        aria-label={etiqueta}
        title={etiqueta}
        className={`relative grid size-11 shrink-0 select-none place-items-center rounded-control text-tenue transition-[transform,background-color,color] duration-150 ease-salida hover:bg-superficie hover:text-tinta active:scale-[0.97] ${className}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {montado ? (
            <motion.span
              key={oscuro ? "sol" : "luna"}
              initial={usado ? ICONO_OCULTO : false}
              animate={ICONO_VISIBLE}
              exit={ICONO_FUERA}
              className="grid place-items-center"
            >
              <Icono aria-hidden="true" size={18} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>
    </MotionConfig>
  );
}
```

## Paso 7. Marca reutilizable

El texto TIPI 3.0 de la cabecera se repetía. Ahora es un componente que usan la landing, el login y el portal.

Archivo: `web/src/components/ui/Marca.tsx`

```tsx
import Link from "next/link";

type Props = {
  href?: string;
  etiqueta?: string;
};

export function Marca({ href = "/", etiqueta }: Props) {
  return (
    <Link href={href} className="flex items-baseline gap-2 text-lg font-medium tracking-tight">
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

## Paso 8. Selector de tema en la navegación

El selector queda a la izquierda del botón Entrar al portal.

Archivo: `web/src/components/landing/Navegacion.tsx`

```tsx
import Link from "next/link";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { Marca } from "@/components/ui/Marca";
import { SelectorTema } from "@/components/ui/SelectorTema";

const ENLACES = [
  { href: "#como-funciona", texto: "Cómo funciona" },
  { href: "#cifras", texto: "Cifras" },
  { href: "#acceso", texto: "Roles" },
] as const;

export function Navegacion() {
  return (
    <header className="sticky top-0 z-40 border-b border-linea bg-fondo/85 backdrop-blur-md">
      <div className="contenedor flex h-16 items-center justify-between gap-6">
        <Marca />
        <nav aria-label="Secciones de la página" className="hidden md:block">
          <ul className="flex items-center gap-8 text-[0.9375rem] text-tenue">
            {ENLACES.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  className="transition-colors duration-150 ease-salida hover:text-tinta"
                >
                  {enlace.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <SelectorTema />
          <EnlaceBoton href="/login" variante="secundario">
            Entrar al portal
          </EnlaceBoton>
        </div>
      </div>
    </header>
  );
}
```

# Parte B. Bloque 2: autenticación

## Paso 9. Estilos compartidos de botón

El botón de enlace del Bloque 1 y el botón nuevo comparten forma, tamaños y variantes desde un solo archivo.

Archivo: `web/src/components/ui/estilos-boton.ts`

```typescript
export const BASE_BOTON =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-medium transition-[transform,background-color,color] duration-150 ease-salida active:scale-[0.97]";

export const TAMANOS_BOTON = {
  normal: "h-11 px-5 text-[0.9375rem]",
  grande: "h-14 px-7 text-lg lg:h-16 lg:px-8 lg:text-xl",
} as const;

export const VARIANTES_BOTON = {
  primario: "bg-acento text-sobre-acento hover:bg-acento/90",
  secundario: "bg-superficie text-tinta hover:bg-superficie-alta",
} as const;

export type TamanoBoton = keyof typeof TAMANOS_BOTON;
export type VarianteBoton = keyof typeof VARIANTES_BOTON;
```

## Paso 10. EnlaceBoton usa los estilos compartidos

Se ve igual que antes; solo cambia de dónde toma las clases.

Archivo: `web/src/components/ui/EnlaceBoton.tsx`

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BASE_BOTON,
  TAMANOS_BOTON,
  VARIANTES_BOTON,
  type TamanoBoton,
  type VarianteBoton,
} from "./estilos-boton";

type Props = {
  href: string;
  children: ReactNode;
  tamano?: TamanoBoton;
  variante?: VarianteBoton;
  className?: string;
};

export function EnlaceBoton({
  href,
  children,
  tamano = "normal",
  variante = "primario",
  className = "",
}: Props) {
  return (
    <Link
      href={href}
      className={`${BASE_BOTON} ${TAMANOS_BOTON[tamano]} ${VARIANTES_BOTON[variante]} ${className}`}
    >
      {children}
    </Link>
  );
}
```

## Paso 11. Botón con estado de carga

Con `cargando` el botón cruza su texto con un indicador giratorio sin cambiar de ancho, porque las dos capas ocupan la misma celda. Mientras carga ignora los clics, pero conserva el foco del teclado.

Archivo: `web/src/components/ui/Boton.tsx`

```tsx
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import {
  BASE_BOTON,
  TAMANOS_BOTON,
  VARIANTES_BOTON,
  type TamanoBoton,
  type VarianteBoton,
} from "./estilos-boton";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  cargando?: boolean;
  textoCargando?: string;
  tamano?: TamanoBoton;
  variante?: VarianteBoton;
};

const CAPA =
  "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-[opacity,transform,filter] duration-150 ease-salida motion-reduce:transition-opacity";

const CAPA_OCULTA = "opacity-0 blur-[2px] motion-reduce:translate-y-0 motion-reduce:blur-none";

export function Boton({
  children,
  cargando = false,
  textoCargando = "Procesando",
  tamano = "normal",
  variante = "primario",
  className = "",
  type = "button",
  onClick,
  ...resto
}: Props) {
  function alPulsar(evento: MouseEvent<HTMLButtonElement>) {
    if (cargando) {
      evento.preventDefault();
      return;
    }
    onClick?.(evento);
  }

  return (
    <button
      {...resto}
      type={type}
      onClick={alPulsar}
      aria-busy={cargando}
      aria-disabled={cargando || undefined}
      className={`${BASE_BOTON} ${TAMANOS_BOTON[tamano]} ${VARIANTES_BOTON[variante]} disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress ${className}`}
    >
      <span className="grid">
        <span
          aria-hidden={cargando || undefined}
          className={`${CAPA} ${cargando ? `${CAPA_OCULTA} -translate-y-1.5` : ""}`}
        >
          {children}
        </span>
        <span
          aria-hidden={cargando ? undefined : true}
          className={`${CAPA} ${cargando ? "" : `${CAPA_OCULTA} translate-y-1.5`}`}
        >
          <LoaderCircle
            aria-hidden="true"
            size={18}
            className={cargando ? "animate-spin [animation-duration:600ms]" : ""}
          />
          {textoCargando}
        </span>
      </span>
    </button>
  );
}
```

## Paso 12. Campo de texto con etiqueta y error

Une la etiqueta, el campo y su mensaje de error. La línea del error siempre ocupa su espacio, así el formulario no salta. El texto mide 16 px para que el teléfono no haga zoom al enfocar.

Archivo: `web/src/components/ui/Campo.tsx`

```tsx
import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";

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
      <label htmlFor={id} className="block text-[0.9375rem] font-medium">
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <input
          {...resto}
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={`h-12 w-full rounded-control border border-linea bg-superficie px-3.5 text-base text-tinta transition-[border-color,background-color] duration-150 ease-salida placeholder:text-tenue hover:border-tenue focus-visible:border-acento focus-visible:outline-offset-0 aria-invalid:border-error ${accion ? "pr-12" : ""} ${className}`}
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

## Paso 13. Nombre y atributos de la cookie

Aquí se define la cookie una sola vez. Lo usan los manejadores de ruta, el proxy y el portal.

Archivo: `web/src/lib/sesion/cookie.ts`

```typescript
export const COOKIE_SESION = "tipi_sesion";

export const RUTA_LOGIN = "/login";
export const RUTA_PORTAL = "/portal";
export const RUTA_SESION_EXPIRADA = "/login?sesion=expirada";

const DURACION_PREDETERMINADA_S = 30 * 60;

export function opcionesCookieSesion(duracionSegundos?: number) {
  const duracion =
    duracionSegundos && duracionSegundos > 0
      ? Math.floor(duracionSegundos)
      : DURACION_PREDETERMINADA_S;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: duracion,
  };
}

export function opcionesCookieVencida() {
  return { ...opcionesCookieSesion(), maxAge: 0 };
}
```

## Paso 14. Comprobaciones de la petición

`esMismoOrigen` rechaza peticiones de otros sitios y `cabecerasDeCliente` reenvía la IP de la persona al backend.

Archivo: `web/src/lib/sesion/peticion.ts`

```typescript
import type { NextRequest } from "next/server";

export function esMismoOrigen(request: NextRequest): boolean {
  const origen = request.headers.get("origin");
  if (!origen) {
    return true;
  }
  const anfitrion = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origen).host === anfitrion;
  } catch {
    return false;
  }
}

export function cabecerasDeCliente(request: NextRequest): Record<string, string> {
  const ip = request.headers.get("x-forwarded-for");
  return ip ? { "X-Forwarded-For": ip } : {};
}
```

## Paso 15. Lectura del usuario en el servidor

`leerSesion` lee la cookie y pide `GET /api/auth/me` con el token. Devuelve uno de tres estados: sesión activa, sesión ausente o servidor sin respuesta. Está envuelta en `cache` de React, así la cabecera y la página comparten una sola llamada por visita. `exigirSesion` redirige al login cuando no hay sesión válida. La línea `import "server-only"` impide que este archivo termine en el navegador.

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

export const leerSesion = cache(async (): Promise<ResultadoSesion> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
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

## Paso 16. Manejador de inicio de sesión

Recibe `identificador` y `password`, llama a Spring Boot con `openapi-fetch` y, si todo sale bien, guarda el `accessToken` en la cookie. Al navegador solo le devuelve el resumen del usuario, nunca el token. Los errores llegan como `{ "mensaje": "..." }` con el estado 400, 401, 403, 502 o 503.

Archivo: `web/src/app/api/auth/iniciar-sesion/route.ts`

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api/cliente";
import { COOKIE_SESION, opcionesCookieSesion } from "@/lib/sesion/cookie";
import { cabecerasDeCliente, esMismoOrigen } from "@/lib/sesion/peticion";

const ESPERA_MAXIMA_MS = 8000;
const LONGITUD_MAXIMA = 200;

const MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos, o cuenta temporalmente no disponible.";
const MENSAJE_SIN_SERVICIO =
  "El servidor de TIPI 3.0 no responde. Vuelve a intentarlo en unos minutos.";

function respuestaError(estado: number, mensaje: string) {
  return NextResponse.json({ mensaje }, { status: estado });
}

function campoDeTexto(cuerpo: unknown, nombre: string): string {
  if (typeof cuerpo !== "object" || cuerpo === null) {
    return "";
  }
  const valor = (cuerpo as Record<string, unknown>)[nombre];
  return typeof valor === "string" ? valor : "";
}

export async function POST(request: NextRequest) {
  if (!esMismoOrigen(request)) {
    return respuestaError(403, "Origen no permitido.");
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const identificador = campoDeTexto(cuerpo, "identificador").trim();
  const password = campoDeTexto(cuerpo, "password");

  if (!identificador || !password) {
    return respuestaError(400, "Escribe tu usuario y tu contraseña.");
  }
  if (identificador.length > LONGITUD_MAXIMA || password.length > LONGITUD_MAXIMA) {
    return respuestaError(400, "El usuario o la contraseña son demasiado largos.");
  }

  try {
    const { data, error, response } = await api.POST("/api/auth/login", {
      body: { identificador, password },
      headers: cabecerasDeCliente(request),
      cache: "no-store",
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });

    if (!data?.accessToken) {
      if (response.status === 401) {
        return respuestaError(401, error?.detail ?? MENSAJE_CREDENCIALES);
      }
      if (response.status === 400) {
        return respuestaError(400, error?.detail ?? "Revisa los datos e inténtalo de nuevo.");
      }
      return respuestaError(502, MENSAJE_SIN_SERVICIO);
    }

    const respuesta = NextResponse.json({ usuario: data.usuario ?? null });
    respuesta.cookies.set(
      COOKIE_SESION,
      data.accessToken,
      opcionesCookieSesion(data.expiresInSeconds),
    );
    return respuesta;
  } catch {
    return respuestaError(503, MENSAJE_SIN_SERVICIO);
  }
}
```

## Paso 17. Manejador de cierre de sesión

Llama a `POST /api/auth/logout` para que Spring Boot revoque el token y luego vence la cookie. Si el backend no responde, la cookie se vence igual.

Archivo: `web/src/app/api/auth/cerrar-sesion/route.ts`

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api/cliente";
import { COOKIE_SESION, opcionesCookieVencida } from "@/lib/sesion/cookie";
import { cabecerasDeCliente, esMismoOrigen } from "@/lib/sesion/peticion";

const ESPERA_MAXIMA_MS = 5000;

export async function POST(request: NextRequest) {
  if (!esMismoOrigen(request)) {
    return NextResponse.json({ mensaje: "Origen no permitido." }, { status: 403 });
  }

  const token = request.cookies.get(COOKIE_SESION)?.value;

  if (token) {
    await api
      .POST("/api/auth/logout", {
        headers: { ...cabecerasDeCliente(request), Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
      })
      .catch(() => null);
  }

  const respuesta = new NextResponse(null, { status: 204 });
  respuesta.cookies.set(COOKIE_SESION, "", opcionesCookieVencida());
  return respuesta;
}
```

## Paso 18. Proxy de protección de rutas

Este es el archivo que en versiones anteriores se llamaba `middleware.ts`. Va en `src/`, al lado de la carpeta `app`. Hace tres cosas: manda a `/login` a quien entra a `/portal` sin cookie, recordando en `destino` la página que quería ver; manda a `/portal` a quien abre `/login` con sesión; y deja pasar `/login?sesion=expirada` para que una cookie vencida no cause un ciclo de redirecciones.

Archivo: `web/src/proxy.ts`

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, RUTA_LOGIN, RUTA_PORTAL } from "@/lib/sesion/cookie";

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const haySesion = request.cookies.has(COOKIE_SESION);

  if (pathname === RUTA_LOGIN) {
    if (haySesion && searchParams.get("sesion") !== "expirada") {
      return NextResponse.redirect(new URL(RUTA_PORTAL, request.url));
    }
    return NextResponse.next();
  }

  if (haySesion) {
    return NextResponse.next();
  }

  const destino = new URL(RUTA_LOGIN, request.url);
  if (pathname !== RUTA_PORTAL) {
    destino.searchParams.set("destino", `${pathname}${search}`);
  }
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/portal/:path*", "/login"],
};
```

## Paso 19. Formulario de inicio de sesión

Es un componente cliente que habla solo con `/api/auth/iniciar-sesion`. Valida los campos vacíos antes de enviar y lleva el foco al primero que falte. Si las credenciales fallan, deja la contraseña seleccionada para escribir encima. El parámetro `destino` solo se acepta si empieza por `/portal`, así nadie puede usar el login para redirigir a otro sitio.

Archivo: `web/src/components/acceso/FormularioAcceso.tsx`

```tsx
"use client";

import { ArrowRight, CircleAlert, Eye, EyeOff, Info } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { RUTA_PORTAL } from "@/lib/sesion/cookie";

const CARGA_MINIMA_MS = 400;
const DESTINO_VALIDO = /^\/portal(?:[/?]|$)/;

const MENSAJE_SIN_RED = "No hay conexión con el portal. Revisa tu red y vuelve a intentarlo.";
const MENSAJE_GENERICO = "No se pudo iniciar la sesión. Vuelve a intentarlo.";

type Errores = {
  identificador?: string;
  password?: string;
  general?: string;
};

const sinSuscripcion = () => () => {};
const sesionExpiradaEnCliente = () =>
  new URLSearchParams(window.location.search).get("sesion") === "expirada";
const sesionExpiradaEnServidor = () => false;

function destinoTrasEntrar(): string {
  const destino = new URLSearchParams(window.location.search).get("destino");
  return destino && DESTINO_VALIDO.test(destino) ? destino : RUTA_PORTAL;
}

function esperar(milisegundos: number) {
  return new Promise<void>((resolver) => setTimeout(resolver, milisegundos));
}

export function FormularioAcceso() {
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const refIdentificador = useRef<HTMLInputElement>(null);
  const refPassword = useRef<HTMLInputElement>(null);
  const sesionExpirada = useSyncExternalStore(
    sinSuscripcion,
    sesionExpiradaEnCliente,
    sesionExpiradaEnServidor,
  );

  function limpiarError(campo: "identificador" | "password") {
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: undefined } : previos));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) {
      return;
    }

    const datos = new FormData(evento.currentTarget);
    const identificador = String(datos.get("identificador") ?? "").trim();
    const password = String(datos.get("password") ?? "");

    if (!identificador || !password) {
      setErrores((previos) => ({
        general: previos.general,
        identificador: identificador ? undefined : "Escribe tu usuario o tu correo.",
        password: password ? undefined : "Escribe tu contraseña.",
      }));
      (identificador ? refPassword : refIdentificador).current?.focus();
      return;
    }

    setEnviando(true);
    setErrores((previos) => ({ general: previos.general }));
    const inicio = performance.now();
    let mensaje = MENSAJE_GENERICO;

    try {
      const respuesta = await fetch("/api/auth/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, password }),
      });

      if (respuesta.ok) {
        window.location.replace(destinoTrasEntrar());
        return;
      }

      const cuerpo: { mensaje?: string } | null = await respuesta.json().catch(() => null);
      mensaje = cuerpo?.mensaje ?? MENSAJE_GENERICO;
    } catch {
      mensaje = MENSAJE_SIN_RED;
    }

    const restante = CARGA_MINIMA_MS - (performance.now() - inicio);
    if (restante > 0) {
      await esperar(restante);
    }

    setErrores({ general: mensaje });
    setEnviando(false);
    refPassword.current?.focus();
    refPassword.current?.select();
  }

  return (
    <form onSubmit={enviar} noValidate aria-labelledby="titulo-acceso" className="w-full">
      <div className="flex flex-col gap-3">
        <Campo
          ref={refIdentificador}
          etiqueta="Usuario o correo"
          name="identificador"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={200}
          error={errores.identificador}
          onInput={() => limpiarError("identificador")}
        />
        <Campo
          ref={refPassword}
          etiqueta="Contraseña"
          name="password"
          type={passwordVisible ? "text" : "password"}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={200}
          error={errores.password}
          onInput={() => limpiarError("password")}
          accion={
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-pressed={passwordVisible}
              aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="grid size-10 select-none place-items-center rounded-[8px] text-tenue transition-[transform,color] duration-150 ease-salida hover:text-tinta active:scale-[0.97]"
            >
              {passwordVisible ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          }
        />
      </div>

      <Boton
        type="submit"
        cargando={enviando}
        textoCargando="Entrando"
        className="mt-3 h-12 w-full text-base"
      >
        Entrar al portal
        <ArrowRight aria-hidden="true" size={18} />
      </Boton>

      <div role="alert" className="mt-4 min-h-12 text-sm">
        {errores.general ? (
          <p key={errores.general} className="entrada-mensaje flex items-start gap-2 text-error">
            <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {errores.general}
          </p>
        ) : sesionExpirada ? (
          <p className="flex items-start gap-2 text-tenue">
            <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            Tu sesión terminó. Entra de nuevo para continuar.
          </p>
        ) : null}
      </div>
    </form>
  );
}
```

## Paso 20. Página de login

La página es un componente de servidor: pone el título, el texto de ayuda y coloca el formulario.

Archivo: `web/src/app/login/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormularioAcceso } from "@/components/acceso/FormularioAcceso";
import { Marca } from "@/components/ui/Marca";
import { SelectorTema } from "@/components/ui/SelectorTema";

export const metadata: Metadata = {
  title: "Acceso al portal",
};

export default function PaginaLogin() {
  return (
    <>
      <header className="border-b border-linea">
        <div className="contenedor flex h-16 items-center justify-between gap-6">
          <Marca />
          <SelectorTema />
        </div>
      </header>
      <main id="contenido" className="flex flex-1 items-center py-16 lg:py-24">
        <div className="contenedor grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-6">
          <div className="lg:col-span-5">
            <h1 id="titulo-acceso" className="text-seccion">
              Acceso al portal
            </h1>
            <p className="mt-5 max-w-[44ch] text-tenue">
              Entra con el usuario o el correo de tu cuenta. Si todavía no tienes una, pídela a la
              coordinación de TIPI 3.0 o al responsable de tu institución.
            </p>
            <Link
              href="/"
              className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
            >
              <ArrowLeft
                aria-hidden="true"
                size={16}
                className="transition-transform duration-150 ease-salida group-hover:-translate-x-0.5"
              />
              Volver al inicio
            </Link>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <FormularioAcceso />
          </div>
        </div>
      </main>
    </>
  );
}
```

## Paso 21. Botón de cierre de sesión

Llama al manejador de cierre y, cuando responde, recarga en `/login`.

Archivo: `web/src/components/portal/BotonCerrarSesion.tsx`

```tsx
"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { RUTA_LOGIN } from "@/lib/sesion/cookie";

export function BotonCerrarSesion() {
  const [saliendo, setSaliendo] = useState(false);

  async function cerrarSesion() {
    setSaliendo(true);
    const respuesta = await fetch("/api/auth/cerrar-sesion", { method: "POST" }).catch(() => null);
    if (respuesta?.ok) {
      window.location.replace(RUTA_LOGIN);
      return;
    }
    setSaliendo(false);
  }

  return (
    <Boton variante="secundario" cargando={saliendo} textoCargando="Saliendo" onClick={cerrarSesion}>
      <LogOut aria-hidden="true" size={16} />
      Salir
    </Boton>
  );
}
```

## Paso 22. Layout del portal

La cabecera muestra el nombre y el rol de la persona. La lectura de la cookie va dentro de `<Suspense>`, como pide Cache Components: la cabecera se pinta al instante con un esqueleto y el nombre llega en cuanto Spring Boot responde.

Archivo: `web/src/app/portal/layout.tsx`

```tsx
import { Suspense } from "react";
import { BotonCerrarSesion } from "@/components/portal/BotonCerrarSesion";
import { Marca } from "@/components/ui/Marca";
import { SelectorTema } from "@/components/ui/SelectorTema";
import { exigirSesion, nombreDeRol } from "@/lib/sesion/usuario";

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

export default function LayoutPortal({ children }: LayoutProps<"/portal">) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-linea bg-fondo/85 backdrop-blur-md">
        <div className="contenedor flex h-16 items-center justify-between gap-4">
          <Marca href="/portal" etiqueta="Portal" />
          <div className="flex min-w-0 items-center gap-2">
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
    </>
  );
}
```

## Paso 23. Página base del portal

Muestra los datos que devuelve `GET /api/auth/me` para comprobar que todo fluye. Si Spring Boot no responde, lo dice sin cerrar la sesión.

Archivo: `web/src/app/portal/page.tsx`

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirSesion, nombreDeRol } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Inicio del portal",
};

async function ResumenDeSesion() {
  const usuario = await exigirSesion();

  if (!usuario) {
    return (
      <div className="max-w-[60ch]">
        <h1 className="text-3xl font-medium tracking-tight">No se pudo verificar tu sesión</h1>
        <p className="mt-4 text-tenue">
          El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada: recarga la
          página en unos minutos.
        </p>
      </div>
    );
  }

  const datos = [
    { nombre: "Usuario", valor: usuario.username, codigo: true },
    { nombre: "Nombre", valor: `${usuario.nombres} ${usuario.apellidos}`, codigo: false },
    { nombre: "Rol", valor: nombreDeRol(usuario.rol), codigo: false },
    {
      nombre: "Institución",
      valor: usuario.institucionId ? `ID ${usuario.institucionId}` : "Todas las instituciones",
      codigo: Boolean(usuario.institucionId),
    },
    {
      nombre: "Contraseña",
      valor: usuario.debeCambiarPassword ? "Temporal, pendiente de cambio" : "Definida por ti",
      codigo: false,
    },
  ];

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">Hola, {usuario.nombres}</h1>
      <p className="mt-4 max-w-[60ch] text-tenue">
        Tu sesión está activa. Estos datos llegan del servidor con tu credencial, que el navegador
        guarda en una cookie que el código de la página no puede leer.
      </p>
      <dl className="mt-10 max-w-[44rem]">
        {datos.map((dato) => (
          <div
            key={dato.nombre}
            className="grid gap-1 border-t border-linea py-4 last:border-b sm:grid-cols-[12rem_1fr] sm:gap-6"
          >
            <dt className="text-tenue">{dato.nombre}</dt>
            <dd className={`break-words ${dato.codigo ? "font-mono text-[0.9375rem]" : ""}`}>
              {dato.valor}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function EsqueletoResumen() {
  return (
    <div aria-hidden="true">
      <div className="h-9 w-64 max-w-full rounded-full bg-superficie-alta" />
      <div className="mt-5 h-4 w-[28rem] max-w-full rounded-full bg-superficie" />
      <div className="mt-10 max-w-[44rem]">
        {[0, 1, 2, 3, 4].map((fila) => (
          <div key={fila} className="border-t border-linea py-4 last:border-b">
            <div className="h-5 w-48 max-w-full rounded-full bg-superficie" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaginaPortal() {
  return (
    <div className="contenedor py-12 lg:py-16">
      <Suspense fallback={<EsqueletoResumen />}>
        <ResumenDeSesion />
      </Suspense>
    </div>
  );
}
```

# Parte C. Comprobar que funciona

## Paso 24. Compilar

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

Los tres terminaron sin errores en tu equipo. La compilación lista estas rutas:

```text
┌ ◐ /
├ ○ /_not-found
├ ƒ /api/auth/cerrar-sesion
├ ƒ /api/auth/iniciar-sesion
├ ○ /icon.svg
├ ○ /login
└ ◐ /portal

ƒ Proxy (Middleware)
```

## Paso 25. Probar el flujo

Con Spring Boot en el puerto 8080 y `npm run dev` en el 3000:

1. Abre `http://localhost:3000/portal` sin haber entrado. Debe llevarte a `/login`.
2. Pulsa el botón del sol o la luna. El tema cambia y se conserva al recargar.
3. Envía el formulario vacío. Aparece un mensaje debajo de cada campo.
4. Escribe una contraseña incorrecta. El botón muestra Entrando y luego aparece el error debajo del botón.
5. Entra con una cuenta real. Llegas a `/portal` y la cabecera muestra tu nombre y tu rol.
6. Abre las herramientas del navegador, pestaña Aplicación, Cookies. La cookie `tipi_sesion` tiene marcadas `HttpOnly` y `SameSite Strict`. En la consola, `document.cookie` no la muestra.
7. Pulsa Salir. Vuelves a `/login` y `http://localhost:3000/portal` te redirige otra vez.

## Qué verifiqué y cómo

| Caso | Resultado | Contra qué |
|---|---|---|
| `/portal` sin cookie redirige a `/login` | Correcto, 307 | Tu servidor de desarrollo |
| `/portal/clubes?p=2` conserva el destino | Correcto | Tu servidor de desarrollo |
| Credenciales incorrectas devuelven 401 con el mensaje del backend | Correcto | Spring Boot real |
| Cuerpo vacío devuelve 400 y otro origen devuelve 403 | Correcto | Tu servidor de desarrollo |
| Cookie inválida lleva a `/login?sesion=expirada` | Correcto | Spring Boot real |
| Inicio de sesión correcto, cabecera con usuario y rol | Correcto | API simulada |
| Cookie con `Secure; HttpOnly; SameSite=strict; Max-Age=1800` | Correcto | Compilación de producción |
| Token revocado muestra el aviso de sesión terminada | Correcto | API simulada |
| Backend caído muestra el aviso sin cerrar la sesión | Correcto | API simulada |
| Cerrar sesión llama al backend y vence la cookie | Correcto | API simulada |
| Selector de tema, tema claro y vista de teléfono de 375 px | Correcto | Navegador |

**Lo que no pude probar contra tu backend real es el inicio de sesión correcto.** No tengo la contraseña de ninguna cuenta de este equipo y la contraseña inicial del administrador que trae `application.yml` ya no es válida aquí. Para no tocar tu base de datos, probé ese camino con una API simulada que responde con el mismo contrato de `LoginResponse` y `UsuarioResumen`. El paso 5 de la lista anterior es la comprobación que falta y te toma un minuto.

## Notas

- En la raíz del repositorio hay un `package-lock.json` vacío y sin seguimiento de Git, creado hoy. No lo generé yo. Hace que Next.js avise de varios archivos de bloqueo en cada arranque. Si no lo necesitas, bórralo.
- La sesión dura 30 minutos, lo que dura el JWT. No hay renovación automática: al vencer, el portal pide entrar de nuevo.
- El cambio de contraseña temporal y la recuperación de contraseña no están en este bloque. El portal ya muestra si la contraseña es temporal.
- El sistema anterior en `frontend/` sigue funcionando igual, con su propio inicio de sesión.

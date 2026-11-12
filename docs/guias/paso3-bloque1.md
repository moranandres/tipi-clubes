# PASO 3 · Bloque 1: proyecto Next.js, sistema de diseño y landing pública

Este bloque crea el nuevo frontend en la carpeta `web`, define el sistema de diseño y construye la página principal pública. La landing lee las cifras reales desde `GET /api/publico/estadisticas` con el cliente tipado del PASO 2. Todo está aplicado en tu equipo, en la rama `claude/project-thread-vr6pay`, y subido a GitHub.

## Qué se construyó

| Parte | Resultado |
|---|---|
| Proyecto | Next.js 16.4.6 con App Router, TypeScript y Tailwind CSS 4.3.3 en `web` |
| Dependencias pedidas | `framer-motion` 14, `openapi-fetch` 0.17 y `lucide-react` |
| Tipos de la API | `tipos-api.d.ts` movido a `web/src/lib/api`; `herramientas/tipos-api` ahora lo genera ahí |
| Sistema de diseño | Tokens OKLCH en `globals.css`, dos temas, Instrument Sans y DM Mono |
| Motion | Utilidades en `src/lib/motion.ts`: resortes, sin `ease-in`, todo por debajo de 300 ms |
| Landing | Hero, cómo funciona, tablero de cifras reales, roles y acceso al portal |
| Acceso | `/login` existe como página provisional; el inicio de sesión real es el siguiente bloque |

## Cómo usé cada skill

**Taste (design-taste-frontend).** Su regla es repartir las decisiones en lugar de elegirlas por gusto, así que ejecuté sus repartidores para una página de tipo software:

- Paleta: azul noche con acento celeste (`blue-black-cornflower`). Tomé también la segunda que repartió, gris frío con cobalto, como tema claro, porque comparte la misma familia de azul.
- Tipografía: Instrument Sans para todo el texto, con DM Mono solo para códigos (AMIE, códigos de estudiante y de certificado).
- Hero: el modelo de tres columnas, con el titular a la izquierda, un grupo de fichas que cambia en el centro y un botón grande a la derecha.

Taste trabaja con su propio kit de HTML estático y pide exportar el sitio como estático. No seguí esa parte: tu proyecto necesita Next.js con servidor para el portal interno. Apliqué sus reglas de diseño y de texto dentro de Tailwind y no ejecuté su verificador final, que revisa el marcado de ese kit.

**Impeccable, modo Persuade.** La página abre diciendo qué es el producto y con la acción a la vista. Seguí su lista de control: contraste AA medido, sin etiquetas sobre los titulares, sin texto con degradado, sin tarjetas iguales de icono y texto como estructura, y con la selección de texto, el foco y la barra de desplazamiento tomados de la paleta. Su cargador automático de contexto no se ejecutó porque necesita descargar un programa; leí sus guías directamente.

**Emil Kowalski (emil-design-eng y animate).** Cada animación pasó por su secuencia de decisiones:

| Elemento | Decisión | Valores |
|---|---|---|
| Fichas del hero | Entran una vez y al cambiar de grupo. Propósito: explicar el producto | Resorte de 0,28 s con rebote 0,18, desde `scale(0.9)` y opacidad 0, escalonado de 50 ms |
| Salida de las fichas | Más rápida que la entrada | 160 ms con `cubic-bezier(0.23, 1, 0.32, 1)` |
| Titular y botón del hero | Entrada con CSS `@starting-style`, visible aunque no cargue JavaScript | 260 ms, curva de salida, desde `scale(0.96)` |
| Botones | Respuesta al pulsar | `scale(0.97)` en 150 ms |
| Enlaces y eslabones | Solo cambio de color | 150 ms |
| Tablero de cifras | No se anima: son datos que la persona lee | Ninguno |

No hay ningún `ease-in`, ninguna duración llega a 300 ms y nada parte de `scale(0)`. Con movimiento reducido activado las fichas solo cambian de opacidad y dejan de rotar. En teléfono tampoco rotan. La rotación tiene un botón de pausa.

## Estructura de la carpeta `web`

```text
web/
  .env.example
  next.config.ts
  package.json
  src/
    app/
      globals.css
      icon.svg
      layout.tsx
      page.tsx
      login/page.tsx
    components/
      landing/  Navegacion, Hero, Collage, ComoFunciona, Cifras, Acceso, Pie
      ui/       EnlaceBoton
    lib/
      motion.ts
      api/      cliente.ts, estadisticas.ts, tipos-api.d.ts
```

## Paso 1. Cambiar a la rama

```bash
git checkout claude/project-thread-vr6pay
```

## Paso 2. Crear el proyecto Next.js

Ya está creado en tu equipo. Este es el comando que usé, desde la raíz del repositorio:

```bash
npx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes
```

La versión 16 trae activados Cache Components y Partial Prefetching. Eso cambia cómo se leen datos: una consulta que no se guarda en caché debe ir dentro de `<Suspense>`. El paso del tablero de cifras lo aplica.

## Paso 3. Instalar las dependencias

Desde la carpeta `web`:

```bash
npm install framer-motion openapi-fetch lucide-react
```

## Paso 4. Paquete del proyecto

Archivo: `web/package.json`

Dos guiones nuevos: `tipos` comprueba TypeScript sin compilar y `api:tipos` regenera los tipos de la API desde `herramientas/tipos-api`.

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

## Paso 5. Configuración de Next.js

Archivo: `web/next.config.ts`

Es la que genera el instalador, sin los comentarios.

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

## Paso 6. Configuración de ESLint

Archivo: `web/eslint.config.mjs`

Se excluye el archivo de tipos generado.

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/lib/api/tipos-api.d.ts",
  ]),
]);

export default eslintConfig;
```

## Paso 7. Variables de entorno

Archivo: `web/.env.example`

Copia este archivo como `web/.env.local` si tu backend no está en el puerto 8080. Para que git lo acepte agregué la línea `!.env.example` debajo de `.env*` en `web/.gitignore`.

```properties
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Paso 8. Generador de tipos

Archivo: `herramientas/tipos-api/package.json`

El guion `generar` ahora escribe en `web/src/lib/api/tipos-api.d.ts`. El archivo `tipos-api.d.ts` se movió a esa carpeta, y `ejemplo.ts` y `tsconfig.json` se eliminaron de la herramienta porque el proyecto real ya usa los tipos.

```json
{
  "name": "tipi-tipos-api",
  "version": "1.1.0",
  "private": true,
  "type": "module",
  "description": "Genera los tipos de TypeScript de la API de TIPI 3.0 a partir del documento OpenAPI",
  "scripts": {
    "descargar": "node descargar-openapi.mjs",
    "generar": "openapi-typescript openapi.json -o ../../web/src/lib/api/tipos-api.d.ts",
    "tipos": "npm run descargar && npm run generar"
  },
  "devDependencies": {
    "openapi-typescript": "7.13.0",
    "typescript": "5.9.3"
  }
}
```

## Paso 9. Cliente tipado de la API

Archivo: `web/src/lib/api/cliente.ts`

Un solo cliente de `openapi-fetch` para todo el proyecto. Las rutas, los parámetros y las respuestas salen de `tipos-api.d.ts`.

```typescript
import createClient from "openapi-fetch";
import type { components, paths } from "./tipos-api";

export type Esquemas = components["schemas"];

export const URL_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const api = createClient<paths>({ baseUrl: URL_API });
```

## Paso 10. Lectura de las cifras públicas

Archivo: `web/src/lib/api/estadisticas.ts`

Si el backend no responde en 4 segundos o falla, devuelve `null` y la página muestra el aviso en lugar de romperse.

```typescript
import { api, type Esquemas } from "./cliente";

export type EstadisticasPublicas = Esquemas["EstadisticasPublicasResponse"];

const ESPERA_MAXIMA_MS = 4000;

export async function obtenerEstadisticasPublicas(): Promise<EstadisticasPublicas | null> {
  try {
    const { data } = await api.GET("/api/publico/estadisticas", {
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    return data ?? null;
  } catch {
    return null;
  }
}
```

## Paso 11. Sistema de diseño

Archivo: `web/src/app/globals.css`

Tailwind 4 define los tokens en CSS con `@theme`, sin `tailwind.config.ts`. El tema oscuro es el de base y el claro se aplica cuando el dispositivo lo pide. Cada token genera sus clases: `bg-fondo`, `text-tenue`, `border-linea`, `text-titular`, `rounded-pieza`, `ease-salida`. Al final están tres utilidades propias: `contenedor` (bordes iguales), `cifras` (números tabulares) y `entrada-titular`.

```css
@import "tailwindcss";

:root {
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

@media (prefers-color-scheme: light) {
  :root {
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
```

Contraste medido con los colores de la paleta:

| Par | Tema oscuro | Tema claro | Mínimo AA |
|---|---|---|---|
| Texto sobre fondo | 16,5:1 | 17,1:1 | 4,5:1 |
| Texto tenue sobre fondo | 6,1:1 | 6,3:1 | 4,5:1 |
| Texto tenue sobre superficie | 5,6:1 | 5,7:1 | 4,5:1 |
| Texto tenue sobre superficie alta | 5,0:1 | 5,2:1 | 4,5:1 |
| Acento sobre fondo | 9,1:1 | 7,1:1 | 4,5:1 |
| Texto del botón sobre acento | 9,1:1 | 8,2:1 | 4,5:1 |

## Paso 12. Utilidades de motion

Archivo: `web/src/lib/motion.ts`

Aquí viven las reglas de animación para todo el proyecto: las dos curvas, las duraciones, los resortes y las variantes de entrada. Los componentes las importan en lugar de escribir valores sueltos.

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

export const pulsacion = {
  scale: 0.97,
  transition: { duration: DURACION.pulsacion, ease: CURVA_SALIDA },
} as const;
```

## Paso 13. Diseño raíz

Archivo: `web/src/app/layout.tsx`

Carga las dos fuentes con `next/font`, que las sirve desde tu propio dominio, define los metadatos y agrega el enlace para saltar al contenido.

```tsx
import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Sans } from "next/font/google";
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
  title: {
    default: "TIPI 3.0 · Gestión de clubes de robótica y programación",
    template: "%s · TIPI 3.0",
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
    <html lang="es" className={`${fuenteTexto.variable} ${fuenteMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenido"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-control focus-visible:bg-acento focus-visible:px-4 focus-visible:py-2 focus-visible:text-sobre-acento"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
```

## Paso 14. Icono del sitio

Archivo: `web/src/app/icon.svg`

Reemplaza el icono de fábrica del instalador.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#0a0d14" />
  <path d="M9 10h14v3.4h-5.2V23h-3.6v-9.6H9z" fill="#5ab9fc" />
</svg>
```

## Paso 15. Botón con forma de enlace

Archivo: `web/src/components/ui/EnlaceBoton.tsx`

Un solo estilo de botón para toda la página, en dos tamaños y dos variantes.

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  tamano?: "normal" | "grande";
  variante?: "primario" | "secundario";
  className?: string;
};

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-medium transition-[transform,background-color,color] duration-150 ease-salida active:scale-[0.97]";

const TAMANOS = {
  normal: "h-11 px-5 text-[0.9375rem]",
  grande: "h-14 px-7 text-lg lg:h-16 lg:px-8 lg:text-xl",
} as const;

const VARIANTES = {
  primario: "bg-acento text-sobre-acento hover:bg-acento/90",
  secundario: "bg-superficie text-tinta hover:bg-superficie-alta",
} as const;

export function EnlaceBoton({
  href,
  children,
  tamano = "normal",
  variante = "primario",
  className = "",
}: Props) {
  return (
    <Link href={href} className={`${BASE} ${TAMANOS[tamano]} ${VARIANTES[variante]} ${className}`}>
      {children}
    </Link>
  );
}
```

## Paso 16. Navegación

Archivo: `web/src/components/landing/Navegacion.tsx`

Barra fija con la marca, los enlaces a las secciones y el acceso al portal.

```tsx
import Link from "next/link";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";

const ENLACES = [
  { href: "#como-funciona", texto: "Cómo funciona" },
  { href: "#cifras", texto: "Cifras" },
  { href: "#acceso", texto: "Roles" },
] as const;

export function Navegacion() {
  return (
    <header className="sticky top-0 z-40 border-b border-linea bg-fondo/85 backdrop-blur-md">
      <div className="contenedor flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-baseline gap-2 text-lg font-medium tracking-tight">
          TIPI
          <span className="font-mono text-sm text-tenue">3.0</span>
        </Link>
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
        <EnlaceBoton href="/login" variante="secundario">
          Entrar al portal
        </EnlaceBoton>
      </div>
    </header>
  );
}
```

## Paso 17. Hero

Archivo: `web/src/components/landing/Hero.tsx`

Tres columnas en escritorio y una sola en teléfono. El titular se muestra sin depender de JavaScript.

```tsx
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { Collage } from "./Collage";

export function Hero() {
  return (
    <section
      aria-labelledby="titulo-principal"
      className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden py-12 lg:py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--acento)_16%,transparent),transparent)]"
      />
      <div className="contenedor relative grid items-center gap-10 lg:grid-cols-12 lg:gap-6">
        <div className="entrada-titular lg:col-span-4">
          <h1 id="titulo-principal" className="text-titular">
            Clubes de robótica escolar, al día
          </h1>
          <p className="mt-5 max-w-[36ch] text-tenue">
            TIPI 3.0 registra cada institución, club, sesión y evidencia de las unidades educativas
            fiscales de la Zona 8.
          </p>
          <Link
            href="#como-funciona"
            className="group mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-acento"
          >
            Ver cómo funciona
            <ArrowDown
              aria-hidden="true"
              size={16}
              className="transition-transform duration-150 ease-salida group-hover:translate-y-0.5"
            />
          </Link>
        </div>
        <div className="lg:col-span-5">
          <Collage />
        </div>
        <div className="entrada-titular flex flex-col gap-4 lg:col-span-3 lg:items-end lg:text-right">
          <EnlaceBoton href="/login" tamano="grande" className="w-full lg:w-auto">
            Entrar al portal
            <ArrowRight aria-hidden="true" size={20} />
          </EnlaceBoton>
          <p className="max-w-[26ch] text-sm text-tenue">
            Para docentes, responsables institucionales y coordinación del proyecto.
          </p>
        </div>
      </div>
    </section>
  );
}
```

## Paso 18. Fichas animadas del hero

Archivo: `web/src/components/landing/Collage.tsx`

Es el único componente de cliente. Muestra tres grupos de fichas (club, sesión y evidencia) con datos de ejemplo. Cambia de grupo cada 3,2 segundos solo en escritorio y sin movimiento reducido. Un lector de pantalla recibe una descripción en texto de cada grupo.

```tsx
"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Bot,
  CalendarCheck,
  Check,
  FileText,
  ImageIcon,
  Pause,
  Play,
  UserRound,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { entradaGrupo, entradaPieza } from "@/lib/motion";

const INTERVALO_MS = 3200;
const CONSULTA_ESCRITORIO = "(min-width: 1024px)";

const ARRIBA = "lg:right-0 lg:top-0 lg:w-[74%]";
const CENTRO = "lg:left-0 lg:top-[35%] lg:z-10 lg:w-[76%]";
const ABAJO = "lg:bottom-0 lg:right-0 lg:w-[70%]";

type Tono = "exito" | "aviso" | "error";

type Pieza = {
  id: string;
  posicion: string;
  elevada?: boolean;
  contenido: ReactNode;
};

type Conjunto = {
  id: string;
  descripcion: string;
  piezas: Pieza[];
};

const ASISTENCIA: { codigo: string; tono: Tono; texto: string }[] = [
  { codigo: "EST-0142", tono: "exito", texto: "Presente" },
  { codigo: "EST-0143", tono: "exito", texto: "Presente" },
  { codigo: "EST-0147", tono: "aviso", texto: "Justificado" },
  { codigo: "EST-0151", tono: "error", texto: "Ausente" },
];

function Estado({ tono, children }: { tono: Tono; children: ReactNode }) {
  const color = { exito: "bg-exito", aviso: "bg-aviso", error: "bg-error" }[tono];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-tinta">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${color}`} />
      {children}
    </span>
  );
}

function Icono({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-control bg-acento/15 text-acento"
    >
      {children}
    </span>
  );
}

const CONJUNTOS: Conjunto[] = [
  {
    id: "club",
    descripcion:
      "Ejemplo de un club: 18 de 20 cupos ocupados, horario de lunes y miércoles y su docente coordinador.",
    piezas: [
      {
        id: "club-ficha",
        posicion: ARRIBA,
        contenido: (
          <>
            <div className="flex items-start gap-3">
              <Icono>
                <Bot size={20} strokeWidth={1.75} />
              </Icono>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Club de Robótica</p>
                  <Estado tono="exito">Activo</Estado>
                </div>
                <p className="mt-0.5 text-sm text-tenue">
                  Unidad educativa fiscal · AMIE <span className="font-mono">09H00000</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-tenue">Cupos</span>
                <span className="cifras">18 de 20</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-linea">
                <div className="h-full w-[90%] rounded-full bg-acento" />
              </div>
            </div>
          </>
        ),
      },
      {
        id: "club-horario",
        posicion: CENTRO,
        elevada: true,
        contenido: (
          <>
            <p className="text-sm text-tenue">Horario del curso</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center justify-between gap-3">
                <span>Lunes</span>
                <span className="cifras text-tenue">14:00 a 16:00</span>
              </li>
              <li className="flex items-center justify-between gap-3 border-t border-linea pt-2">
                <span>Miércoles</span>
                <span className="cifras text-tenue">14:00 a 16:00</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "club-docente",
        posicion: ABAJO,
        contenido: (
          <div className="flex items-center gap-3">
            <Icono>
              <UserRound size={20} strokeWidth={1.75} />
            </Icono>
            <div>
              <p className="font-medium">Docente coordinador</p>
              <p className="text-sm text-tenue">2 clubes a su cargo</p>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "sesion",
    descripcion:
      "Ejemplo de una sesión ejecutada sobre sensores de línea, con la asistencia de cada estudiante: 17 de 18 presentes.",
    piezas: [
      {
        id: "sesion-ficha",
        posicion: ARRIBA,
        contenido: (
          <div className="flex items-start gap-3">
            <Icono>
              <CalendarCheck size={20} strokeWidth={1.75} />
            </Icono>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Sesión 12</p>
                <Estado tono="exito">Ejecutada</Estado>
              </div>
              <p className="mt-0.5 text-sm text-tenue">Sensores de línea · miércoles, 2 horas</p>
            </div>
          </div>
        ),
      },
      {
        id: "sesion-asistencia",
        posicion: "lg:left-0 lg:top-[24%] lg:z-10 lg:w-[76%]",
        elevada: true,
        contenido: (
          <>
            <p className="text-sm text-tenue">Asistencia</p>
            <ul className="mt-2">
              {ASISTENCIA.map((fila, indice) => (
                <li
                  key={fila.codigo}
                  className={`flex items-center justify-between gap-3 py-1.5 ${
                    indice > 0 ? "border-t border-linea" : ""
                  }`}
                >
                  <span className="font-mono text-sm">{fila.codigo}</span>
                  <Estado tono={fila.tono}>{fila.texto}</Estado>
                </li>
              ))}
            </ul>
          </>
        ),
      },
      {
        id: "sesion-resumen",
        posicion: ABAJO,
        contenido: (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-tenue">Presentes</span>
            <span className="cifras text-2xl font-medium tracking-tight">17 de 18</span>
          </div>
        ),
      },
    ],
  },
  {
    id: "evidencia",
    descripcion:
      "Ejemplo de evidencias de una sesión: una fotografía con autorización de imagen, un informe en PDF y un certificado verificable.",
    piezas: [
      {
        id: "evidencia-foto",
        posicion: ARRIBA,
        contenido: (
          <div className="flex items-start gap-3">
            <Icono>
              <ImageIcon size={20} strokeWidth={1.75} />
            </Icono>
            <div>
              <p className="font-medium">Fotografía del prototipo</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-tenue">
                <Check aria-hidden="true" size={15} className="shrink-0 text-exito" />
                Autorización de imagen comprobada
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "evidencia-informe",
        posicion: CENTRO,
        elevada: true,
        contenido: (
          <div className="flex items-start gap-3">
            <Icono>
              <FileText size={20} strokeWidth={1.75} />
            </Icono>
            <div>
              <p className="font-medium">Informe de sesión.pdf</p>
              <p className="mt-0.5 text-sm text-tenue">
                <span className="cifras">64 kB</span> · ligado a la sesión 12
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "evidencia-certificado",
        posicion: ABAJO,
        contenido: (
          <div className="flex items-start gap-3">
            <Icono>
              <Award size={20} strokeWidth={1.75} />
            </Icono>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Certificado</p>
                <Estado tono="exito">Válido</Estado>
              </div>
              <p className="mt-0.5 font-mono text-sm text-tenue">TIPI-7F3K-92QX</p>
            </div>
          </div>
        ),
      },
    ],
  },
];

function suscribirEscritorio(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_ESCRITORIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

function leerEscritorio() {
  return window.matchMedia(CONSULTA_ESCRITORIO).matches;
}

export function Collage() {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const reducir = useReducedMotion();
  const escritorio = useSyncExternalStore(suscribirEscritorio, leerEscritorio, () => false);
  const rota = escritorio && !reducir;

  useEffect(() => {
    if (!rota || pausado) {
      return;
    }
    const temporizador = window.setInterval(() => {
      setIndice((actual) => (actual + 1) % CONJUNTOS.length);
    }, INTERVALO_MS);
    return () => window.clearInterval(temporizador);
  }, [rota, pausado]);

  const conjunto = CONJUNTOS[indice];

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative lg:h-[27rem]">
        <p className="sr-only">{conjunto.descripcion}</p>
        <AnimatePresence mode="wait" initial>
          <motion.div
            key={conjunto.id}
            aria-hidden="true"
            variants={entradaGrupo}
            initial="oculto"
            animate="visible"
            exit="fuera"
            className="flex flex-col gap-3 lg:absolute lg:inset-0 lg:block"
          >
            {conjunto.piezas.map((pieza) => (
              <motion.div
                key={pieza.id}
                variants={entradaPieza}
                className={`rounded-pieza p-5 shadow-pieza lg:absolute ${pieza.posicion} ${
                  pieza.elevada ? "bg-superficie-alta" : "bg-superficie"
                }`}
              >
                {pieza.contenido}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        {rota ? (
          <button
            type="button"
            onClick={() => setPausado((valor) => !valor)}
            aria-pressed={pausado}
            aria-label={pausado ? "Reanudar el cambio de ejemplos" : "Pausar el cambio de ejemplos"}
            className="absolute -bottom-5 -right-5 z-20 flex size-11 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-pieza transition-[transform,background-color] duration-150 ease-salida hover:bg-acento/90 active:scale-[0.97]"
          >
            {pausado ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
    </MotionConfig>
  );
}
```

## Paso 19. Cómo funciona

Archivo: `web/src/components/landing/ComoFunciona.tsx`

La cadena institución, club, sesión y evidencia, en horizontal en escritorio y en vertical en teléfono.

```tsx
import { Bot, CalendarCheck, FileCheck2, School, type LucideIcon } from "lucide-react";

type Eslabon = {
  icono: LucideIcon;
  nombre: string;
  descripcion: string;
  registro: string;
};

const CADENA: Eslabon[] = [
  {
    icono: School,
    nombre: "Institución",
    descripcion:
      "Cada unidad educativa entra con su código AMIE, que no se puede repetir, y con un responsable institucional.",
    registro: "Código AMIE único",
  },
  {
    icono: Bot,
    nombre: "Club",
    descripcion:
      "Cada club tiene un docente coordinador, cursos por nivel, horarios y un número de cupos.",
    registro: "Docente, cursos y cupos",
  },
  {
    icono: CalendarCheck,
    nombre: "Sesión",
    descripcion:
      "El docente planifica la sesión, la ejecuta y pasa asistencia estudiante por estudiante.",
    registro: "Asistencia sin duplicados",
  },
  {
    icono: FileCheck2,
    nombre: "Evidencia",
    descripcion:
      "Fotografías, informes y enlaces quedan ligados a la sesión, con la autorización de imagen comprobada.",
    registro: "Archivo con su sesión",
  },
];

export function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="titulo-como-funciona"
      className="flex min-h-svh items-center border-t border-linea py-24"
    >
      <div className="contenedor">
        <div className="max-w-[44rem]">
          <h2 id="titulo-como-funciona" className="text-seccion">
            De la institución a la evidencia
          </h2>
          <p className="mt-5 max-w-[62ch] text-tenue">
            Todo lo que pasa en un club queda encadenado. Cada registro apunta al anterior, así que
            un informe siempre puede volver hasta la sesión, el club y la institución de donde
            salió.
          </p>
        </div>
        <ol className="mt-16 grid gap-10 lg:grid-cols-4 lg:gap-6">
          {CADENA.map((eslabon, indice) => (
            <li key={eslabon.nombre} className="group relative flex gap-5 lg:block">
              <div className="flex flex-col items-center lg:flex-row">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-linea bg-superficie text-acento transition-[background-color,color,border-color] duration-150 ease-salida group-hover:border-acento group-hover:bg-acento group-hover:text-sobre-acento">
                  <eslabon.icono aria-hidden="true" size={22} strokeWidth={1.75} />
                </span>
                {indice < CADENA.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="mt-3 w-px flex-1 bg-linea lg:ml-3 lg:mt-0 lg:h-px lg:w-auto lg:-mr-6"
                  />
                ) : null}
              </div>
              <div className="pb-2 lg:mt-6 lg:pr-6">
                <h3 className="text-xl">{eslabon.nombre}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-tenue">
                  {eslabon.descripcion}
                </p>
                <p className="mt-4 text-sm font-medium">{eslabon.registro}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-16 max-w-[62ch] border-t border-linea pt-6 text-tenue">
          Con esos registros el sistema calcula la asistencia, el avance por competencias, el
          semáforo de seguimiento de cada club y los certificados que cualquiera puede verificar.
        </p>
      </div>
    </section>
  );
}
```

## Paso 20. Tablero de cifras reales

Archivo: `web/src/components/landing/Cifras.tsx`

El tablero se agrupa con los mismos cuatro eslabones de la sección anterior. `TableroEnVivo` consulta el backend en cada visita y va dentro de `<Suspense>`: el resto de la página se entrega de inmediato y las cifras llegan en cuanto el servidor responde. El backend ya guarda el cálculo cinco minutos, así que la consulta es barata.

```tsx
import { Suspense } from "react";
import {
  obtenerEstadisticasPublicas,
  type EstadisticasPublicas,
} from "@/lib/api/estadisticas";

type Fila = { clave: keyof EstadisticasPublicas; etiqueta: string };

type Grupo = {
  titulo: string;
  principal: Fila;
  secundarias: Fila[];
};

const GRUPOS: Grupo[] = [
  {
    titulo: "Instituciones",
    principal: { clave: "instituciones", etiqueta: "adheridas al proyecto" },
    secundarias: [{ clave: "institucionesConClubes", etiqueta: "Con clubes en marcha" }],
  },
  {
    titulo: "Clubes",
    principal: { clave: "clubes", etiqueta: "registrados" },
    secundarias: [
      { clave: "clubesActivos", etiqueta: "Activos" },
      { clave: "docentesActivos", etiqueta: "Docentes activos" },
    ],
  },
  {
    titulo: "Sesiones",
    principal: { clave: "sesionesEjecutadas", etiqueta: "ejecutadas" },
    secundarias: [
      { clave: "horasEjecutadas", etiqueta: "Horas de trabajo" },
      { clave: "estudiantesParticipantes", etiqueta: "Estudiantes participantes" },
    ],
  },
  {
    titulo: "Evidencias",
    principal: { clave: "evidenciasRegistradas", etiqueta: "registradas" },
    secundarias: [
      { clave: "proyectos", etiqueta: "Proyectos de estudiantes" },
      { clave: "certificadosEmitidos", etiqueta: "Certificados emitidos" },
    ],
  },
];

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");
const FORMATO_HORA = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Guayaquil",
});
const SIN_DATO = "—";

function valor(cifras: EstadisticasPublicas | null, clave: keyof EstadisticasPublicas): string {
  const dato = cifras?.[clave];
  return typeof dato === "number" ? FORMATO_NUMERO.format(dato) : SIN_DATO;
}

function notaDe(cifras: EstadisticasPublicas | null, cargando: boolean): string {
  if (cargando) {
    return "Leyendo las cifras del servidor.";
  }
  if (!cifras) {
    return "No pudimos leer las cifras en este momento. Vuelve a intentarlo en unos minutos.";
  }
  const periodo = cifras.periodoActivo
    ? `Período académico ${cifras.periodoActivo}.`
    : "Todavía no hay un período académico activo.";
  const hora = cifras.actualizadoEn
    ? ` Calculadas a las ${FORMATO_HORA.format(new Date(cifras.actualizadoEn))}.`
    : "";
  return `${periodo}${hora}`;
}

function Tablero({
  cifras,
  cargando = false,
}: {
  cifras: EstadisticasPublicas | null;
  cargando?: boolean;
}) {
  return (
    <div aria-busy={cargando} className="mt-14 rounded-pieza bg-superficie p-6 sm:p-8 lg:p-10">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {GRUPOS.map((grupo) => (
          <section key={grupo.titulo} aria-label={grupo.titulo}>
            <h3 className="text-sm font-medium text-tenue">{grupo.titulo}</h3>
            <p className="cifras mt-3 text-cifra font-medium">
              {valor(cifras, grupo.principal.clave)}
            </p>
            <p className="mt-1 text-[0.9375rem] text-tenue">{grupo.principal.etiqueta}</p>
            <dl className="mt-6 text-[0.9375rem]">
              {grupo.secundarias.map((fila) => (
                <div
                  key={fila.clave}
                  className="flex items-baseline justify-between gap-4 border-t border-linea py-2.5"
                >
                  <dt className="text-tenue">{fila.etiqueta}</dt>
                  <dd className="cifras font-medium">{valor(cifras, fila.clave)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p role="status" className="mt-8 border-t border-linea pt-5 text-sm text-tenue">
        {notaDe(cifras, cargando)}
      </p>
    </div>
  );
}

async function TableroEnVivo() {
  const cifras = await obtenerEstadisticasPublicas();
  return <Tablero cifras={cifras} />;
}

export function Cifras() {
  return (
    <section
      id="cifras"
      aria-labelledby="titulo-cifras"
      className="flex min-h-svh items-center border-t border-linea py-24"
    >
      <div className="contenedor">
        <div className="max-w-[44rem]">
          <h2 id="titulo-cifras" className="text-seccion">
            Las cifras del proyecto hoy
          </h2>
          <p className="mt-5 max-w-[62ch] text-tenue">
            Salen de la misma base de datos que usa el portal y se recalculan cada cinco minutos.
            Son conteos generales: no incluyen nombres ni datos de estudiantes.
          </p>
        </div>
        <Suspense fallback={<Tablero cifras={null} cargando />}>
          <TableroEnVivo />
        </Suspense>
      </div>
    </section>
  );
}
```

## Paso 21. Roles y acceso

Archivo: `web/src/components/landing/Acceso.tsx`

Los cuatro roles y lo que ve cada uno, con el botón de acceso.

```tsx
import { ArrowRight } from "lucide-react";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";

const ROLES = [
  {
    nombre: "Administrador",
    alcance: "Registra instituciones, usuarios, períodos académicos y parámetros del sistema.",
  },
  {
    nombre: "Coordinador TIPI 3.0",
    alcance: "Sigue el avance de todos los clubes y revisa sus resultados.",
  },
  {
    nombre: "Responsable institucional",
    alcance: "Gestiona los clubes, cursos, inscripciones y certificados de su institución.",
  },
  {
    nombre: "Docente coordinador",
    alcance: "Planifica las sesiones de sus clubes, pasa asistencia y carga las evidencias.",
  },
] as const;

export function Acceso() {
  return (
    <section
      id="acceso"
      aria-labelledby="titulo-acceso"
      className="flex min-h-svh items-center border-t border-linea py-24"
    >
      <div className="contenedor grid gap-14 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5">
          <h2 id="titulo-acceso" className="text-seccion">
            Cada rol ve solo lo suyo
          </h2>
          <p className="mt-5 max-w-[46ch] text-tenue">
            Cada persona entra al portal con su cuenta. Un docente nunca consulta estudiantes de
            otra institución: el servidor aplica ese límite en cada petición.
          </p>
          <EnlaceBoton href="/login" tamano="grande" className="mt-10 w-full sm:w-auto">
            Entrar al portal
            <ArrowRight aria-hidden="true" size={20} />
          </EnlaceBoton>
        </div>
        <dl className="lg:col-span-6 lg:col-start-7">
          {ROLES.map((rol) => (
            <div
              key={rol.nombre}
              className="grid gap-1 border-t border-linea py-6 last:border-b sm:grid-cols-[14rem_1fr] sm:gap-6"
            >
              <dt className="text-lg font-medium">{rol.nombre}</dt>
              <dd className="text-tenue">{rol.alcance}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
```

## Paso 22. Pie de página

Archivo: `web/src/components/landing/Pie.tsx`

Aclara que las fichas del inicio usan datos de ejemplo y que el tablero es real.

```tsx
export function Pie() {
  return (
    <footer className="border-t border-linea py-10 text-sm text-tenue">
      <div className="contenedor flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
        <p>
          <span className="font-medium text-tinta">TIPI 3.0</span> · Sistema de información para la
          gestión de clubes de robótica y programación.
        </p>
        <p>Las fichas del inicio usan datos de ejemplo. Las cifras del tablero son reales.</p>
      </div>
    </footer>
  );
}
```

## Paso 23. Página de inicio

Archivo: `web/src/app/page.tsx`

Ensambla las secciones.

```tsx
import { Acceso } from "@/components/landing/Acceso";
import { Cifras } from "@/components/landing/Cifras";
import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { Hero } from "@/components/landing/Hero";
import { Navegacion } from "@/components/landing/Navegacion";
import { Pie } from "@/components/landing/Pie";

export default function PaginaInicio() {
  return (
    <>
      <Navegacion />
      <main id="contenido" className="flex-1">
        <Hero />
        <ComoFunciona />
        <Cifras />
        <Acceso />
      </main>
      <Pie />
    </>
  );
}
```

## Paso 24. Página provisional de acceso

Archivo: `web/src/app/login/page.tsx`

Existe para que el botón "Entrar al portal" tenga destino. El formulario real llega en el siguiente bloque.

```tsx
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";

export const metadata: Metadata = {
  title: "Acceso al portal",
};

export default function PaginaLogin() {
  return (
    <main id="contenido" className="flex flex-1 items-center py-24">
      <div className="contenedor">
        <div className="max-w-[34rem]">
          <h1 className="text-seccion">Acceso al portal</h1>
          <p className="mt-5 text-tenue">
            El inicio de sesión del nuevo portal se construye en el siguiente bloque. Mientras
            tanto, el sistema actual sigue funcionando en su dirección habitual.
          </p>
          <EnlaceBoton href="/" variante="secundario" className="mt-10">
            <ArrowLeft aria-hidden="true" size={18} />
            Volver al inicio
          </EnlaceBoton>
        </div>
      </div>
    </main>
  );
}
```

## Paso 25. Levantar el backend

En una terminal, desde la carpeta `backend`:

```bash
./mvnw spring-boot:run
```

## Paso 26. Levantar la landing

En otra terminal, desde la carpeta `web`:

```bash
npm run dev
```

Abre http://localhost:3000. Si aparece el aviso "No pudimos leer las cifras en este momento", el backend no está encendido o corre en otro puerto.

## Paso 27. Comprobar el proyecto

Desde `web`:

```bash
npm run tipos
```

```bash
npm run lint
```

```bash
npm run build
```

Los tres deben terminar sin errores. En la compilación, la ruta `/` aparece como Partial Prerender: la página es estática y solo el tablero se transmite desde el servidor.

## Paso 28. Regenerar los tipos cuando cambie la API

Con el backend encendido, desde `web`:

```bash
npm run api:tipos
```

Actualiza `herramientas/tipos-api/openapi.json` y `web/src/lib/api/tipos-api.d.ts`. La primera vez ejecuta antes `npm install` dentro de `herramientas/tipos-api`.

## Resultado de mis comprobaciones

| Comprobación | Resultado |
|---|---|
| `npm run tipos` | Sin errores |
| `npm run lint` | Sin errores |
| `npm run build` | Correcto; `/` como Partial Prerender y `/login` estática |
| Página con el backend en el puerto 8081 | Muestra 7 instituciones y el resto en 0, que es lo que hay en la base de este equipo |
| Página sin backend | Muestra el aviso y guiones en lugar de cifras |
| Escritorio a 1440 px | 4 secciones, una por pantalla, sin desplazamiento horizontal |
| Teléfono a 390 px | Una columna, botones a todo el ancho, sin desplazamiento horizontal |
| Tema claro y tema oscuro | Revisados los dos |
| Consola del navegador | Sin errores |

No pude juzgar desde el código cómo se siente el rebote de las fichas. Míralo a velocidad normal y, si lo notas brusco, baja `bounce` de 0,18 a 0,1 en `src/lib/motion.ts`.

## Lo que conviene que sepas

- **Cifras en cero.** La base de datos de este equipo solo tiene 7 instituciones, sin clubes ni período activo. El tablero es fiel a eso. Con la base del laboratorio mostrará las cifras completas.
- **Sin nombre de la universidad ni logotipos.** No puse marcas institucionales porque no las tengo como material. Si quieres que aparezcan, pásame los logotipos y el texto exacto.
- **Datos de ejemplo en el hero.** Las fichas usan un club y códigos inventados, y el pie de página lo aclara.
- **Rol de consulta.** El backend tiene un quinto rol, Consulta, que no aparece en la sección de roles porque el documento de requisitos nombra cuatro.

## Lo que sigue

El siguiente bloque natural es el acceso: formulario de inicio de sesión, cookie `httpOnly` emitida por Next.js y protección de las rutas internas, como quedó planteado en el diagnóstico.


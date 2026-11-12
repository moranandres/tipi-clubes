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

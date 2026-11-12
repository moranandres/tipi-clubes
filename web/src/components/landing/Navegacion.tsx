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

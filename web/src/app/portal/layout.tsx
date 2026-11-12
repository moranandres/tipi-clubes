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

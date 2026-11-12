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

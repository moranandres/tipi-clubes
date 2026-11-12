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

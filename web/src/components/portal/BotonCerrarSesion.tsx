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

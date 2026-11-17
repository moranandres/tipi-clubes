"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Boton } from "@/components/ui/Boton";

export function BotonRecargar() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  return (
    <Boton
      variante="secundario"
      cargando={pendiente}
      textoCargando="Reintentando"
      onClick={() => iniciar(() => router.refresh())}
    >
      <RotateCw aria-hidden="true" size={16} />
      Reintentar
    </Boton>
  );
}

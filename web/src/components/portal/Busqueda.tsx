"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useMemo, useTransition, type ReactNode } from "react";
import { Boton } from "@/components/ui/Boton";

type OpcionesDeNavegacion = {
  reemplazar?: boolean;
  conservarPosicion?: boolean;
};

type Busqueda = {
  pendiente: boolean;
  navegar: (ruta: string, opciones?: OpcionesDeNavegacion) => void;
  recargar: () => void;
};

const ContextoDeBusqueda = createContext<Busqueda | null>(null);

export function ProveedorDeBusqueda({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();

  const navegar = useCallback(
    (ruta: string, opciones: OpcionesDeNavegacion = {}) => {
      const desplazamiento = { scroll: !opciones.conservarPosicion };
      iniciarTransicion(() => {
        if (opciones.reemplazar) {
          router.replace(ruta, desplazamiento);
        } else {
          router.push(ruta, desplazamiento);
        }
      });
    },
    [router],
  );

  const recargar = useCallback(() => {
    iniciarTransicion(() => router.refresh());
  }, [router]);

  const valor = useMemo(() => ({ pendiente, navegar, recargar }), [pendiente, navegar, recargar]);

  return <ContextoDeBusqueda value={valor}>{children}</ContextoDeBusqueda>;
}

export function useBusqueda(): Busqueda {
  const busqueda = use(ContextoDeBusqueda);
  if (!busqueda) {
    throw new Error("useBusqueda necesita un ProveedorDeBusqueda");
  }
  return busqueda;
}

export function ZonaDeResultados({ children }: { children: ReactNode }) {
  const { pendiente } = useBusqueda();
  return (
    <div
      aria-busy={pendiente}
      className={`transition-opacity duration-150 ease-salida ${pendiente ? "opacity-55" : ""}`}
    >
      {children}
    </div>
  );
}

export function BotonReintentar() {
  const { pendiente, recargar } = useBusqueda();
  return (
    <Boton variante="secundario" cargando={pendiente} textoCargando="Reintentando" onClick={recargar}>
      <RotateCw aria-hidden="true" size={16} />
      Reintentar
    </Boton>
  );
}

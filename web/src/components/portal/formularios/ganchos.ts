"use client";

import { unstable_rethrow, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import {
  MENSAJE_SIN_CONEXION,
  accionFallida,
  type ErroresDeCampos,
  type ResultadoDeAccion,
} from "@/lib/acciones/resultado";

export type Aviso = {
  tipo: "exito" | "error";
  texto: string;
  detalles: string[];
  clave: number;
};

export function useAlOcultar(limpiar: () => void) {
  const vigente = useRef(limpiar);

  useEffect(() => {
    vigente.current = limpiar;
  });

  useLayoutEffect(() => {
    return () => {
      vigente.current();
    };
  }, []);
}

export function useCampos<D extends Record<string, string>>(
  iniciales: D,
  vinculados: readonly (readonly (keyof D)[])[] = [],
) {
  const [valores, setValores] = useState(iniciales);
  const [errores, setErrores] = useState<Partial<Record<keyof D, string>>>({});

  function cambiar(campo: keyof D, valor: string) {
    const afectados = [
      campo,
      ...vinculados.filter((grupo) => grupo.includes(campo)).flat(),
    ];
    setValores((previos) => ({ ...previos, [campo]: valor }));
    setErrores((previos) => {
      if (!afectados.some((afectado) => previos[afectado])) {
        return previos;
      }
      const siguientes = { ...previos };
      for (const afectado of afectados) {
        siguientes[afectado] = undefined;
      }
      return siguientes;
    });
  }

  return { valores, errores, cambiar, setValores, setErrores };
}

export function useEnvio() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useAlOcultar(() => setAviso(null));

  function enviar(
    tarea: () => Promise<ResultadoDeAccion>,
    alTerminar: (resultado: ResultadoDeAccion) => void,
  ) {
    iniciar(async () => {
      let resultado: ResultadoDeAccion;
      try {
        resultado = await tarea();
      } catch (error) {
        unstable_rethrow(error);
        resultado = accionFallida(MENSAJE_SIN_CONEXION);
      }
      alTerminar(resultado);
    });
  }

  function navegar(destino: string) {
    iniciar(() => {
      router.push(destino);
    });
  }

  function avisar(tipo: Aviso["tipo"], texto: string, detalles: string[] = []) {
    setAviso({ tipo, texto, detalles, clave: Date.now() });
  }

  function limpiarAviso() {
    setAviso(null);
  }

  return { pendiente, aviso, enviar, navegar, avisar, limpiarAviso };
}

export function useReinicioTrasCrear(reiniciar: () => void) {
  const marcado = useRef(false);

  useAlOcultar(() => {
    if (marcado.current) {
      marcado.current = false;
      reiniciar();
    }
  });

  return function marcar() {
    marcado.current = true;
  };
}

export function repartirErrores<C extends string>(
  errores: ErroresDeCampos,
  camposVisibles: readonly C[],
): { deCampos: Partial<Record<C, string>>; ajenos: string[] } {
  const deCampos: Partial<Record<C, string>> = {};
  const ajenos: string[] = [];

  for (const [campo, mensaje] of Object.entries(errores)) {
    if (camposVisibles.includes(campo as C)) {
      deCampos[campo as C] = mensaje;
    } else {
      ajenos.push(mensaje);
    }
  }

  return { deCampos, ajenos };
}

export function enfocarPrimerInvalido(contenedor: HTMLElement | null) {
  requestAnimationFrame(() => {
    contenedor?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}

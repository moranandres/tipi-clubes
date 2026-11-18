"use client";

import { CircleAlert, CircleCheck, FileSearch } from "lucide-react";
import { useId, useRef, useState, useTransition, type ChangeEvent } from "react";
import { Boton } from "@/components/ui/Boton";

type Props = {
  huella: string;
};

type Comparacion =
  | { estado: "coincide"; archivo: string }
  | { estado: "distinto"; archivo: string; calculada: string }
  | { estado: "error"; mensaje: string };

const TAMANO_MAXIMO_EN_BYTES = 10 * 1024 * 1024;

async function huellaDe(archivo: File): Promise<string> {
  const contenido = await archivo.arrayBuffer();
  const resumen = await crypto.subtle.digest("SHA-256", contenido);
  return Array.from(new Uint8Array(resumen), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function ComprobarArchivo({ huella }: Props) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [comparacion, setComparacion] = useState<Comparacion | null>(null);
  const [calculando, iniciar] = useTransition();

  function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) {
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_EN_BYTES) {
      setComparacion({
        estado: "error",
        mensaje: "El archivo supera los 10 MB; no parece un certificado de TIPI 3.0.",
      });
      return;
    }
    iniciar(async () => {
      try {
        const calculada = await huellaDe(archivo);
        setComparacion(
          calculada === huella.toLowerCase()
            ? { estado: "coincide", archivo: archivo.name }
            : { estado: "distinto", archivo: archivo.name, calculada },
        );
      } catch {
        setComparacion({
          estado: "error",
          mensaje: "Tu navegador no pudo leer el archivo. Prueba con otro navegador.",
        });
      }
    });
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="rounded-pieza border border-linea p-5">
      <h2 id={`${id}-titulo`} className="text-lg font-medium">
        Comprueba tu PDF
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        Elige el PDF que recibiste para confirmar que es el mismo que se emitió y que nadie lo
        modificó. El archivo no sale de tu equipo: la comparación se hace en tu navegador.
      </p>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        onChange={alElegir}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <Boton
        variante="secundario"
        className="mt-4 w-full"
        cargando={calculando}
        textoCargando="Comparando"
        onClick={() => entrada.current?.click()}
      >
        <FileSearch aria-hidden="true" size={16} />
        Elegir el PDF del certificado
      </Boton>
      <div role="status" className="mt-3 min-h-6 text-sm">
        {comparacion?.estado === "coincide" ? (
          <p className="entrada-mensaje flex items-start gap-2 text-exito">
            <CircleCheck aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">
              «{comparacion.archivo}» coincide con el certificado emitido.
            </span>
          </p>
        ) : null}
        {comparacion?.estado === "distinto" ? (
          <div className="entrada-mensaje text-error">
            <p className="flex items-start gap-2">
              <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">
                «{comparacion.archivo}» no coincide: es otro documento o fue modificado después de
                emitirse.
              </span>
            </p>
            <p className="cifras mt-2 break-all text-xs text-tenue">
              Huella calculada: {comparacion.calculada}
            </p>
          </div>
        ) : null}
        {comparacion?.estado === "error" ? (
          <p className="entrada-mensaje flex items-start gap-2 text-error">
            <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0">{comparacion.mensaje}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

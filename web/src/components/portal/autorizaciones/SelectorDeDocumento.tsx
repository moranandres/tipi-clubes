"use client";

import { FileText, Paperclip, X } from "lucide-react";
import { useId, useRef, type ChangeEvent } from "react";
import { ETIQUETA_CONTROL, MENSAJE_CONTROL } from "@/components/ui/estilos-control";
import { BASE_BOTON, TAMANOS_BOTON, VARIANTES_BOTON } from "@/components/ui/estilos-boton";
import {
  ACEPTA_DOCUMENTO,
  LONGITUD_DE_FIRMA,
  TEXTO_DE_FORMATOS,
  errorDeArchivo,
  formatoPorFirma,
  tamanoLegible,
} from "@/lib/portal/reglas-autorizaciones";

export type FormatosDeArchivo = {
  acepta: string;
  texto: string;
  revisar: (archivo: File) => Promise<string | undefined>;
};

type Props = {
  etiqueta: string;
  archivo: File | null;
  error?: string;
  reemplaza: boolean;
  deshabilitado: boolean;
  formatos?: FormatosDeArchivo;
  ayuda?: string;
  alElegir: (archivo: File | null, error?: string) => void;
};

const MENSAJE_FIRMA_INVALIDA =
  "El contenido del archivo no corresponde a un PDF, JPG o PNG. Vuelve a exportarlo o escanearlo.";

async function revisarDocumento(archivo: File): Promise<string | undefined> {
  const error = errorDeArchivo({ nombre: archivo.name, tipo: archivo.type, tamano: archivo.size });
  if (error) {
    return error;
  }
  try {
    const firma = new Uint8Array(await archivo.slice(0, LONGITUD_DE_FIRMA).arrayBuffer());
    return formatoPorFirma(firma) ? undefined : MENSAJE_FIRMA_INVALIDA;
  } catch {
    return "No se pudo leer el archivo. Vuelve a elegirlo.";
  }
}

const FORMATOS_DE_DOCUMENTO: FormatosDeArchivo = {
  acepta: ACEPTA_DOCUMENTO,
  texto: TEXTO_DE_FORMATOS,
  revisar: revisarDocumento,
};

export function SelectorDeDocumento({
  etiqueta,
  archivo,
  error,
  reemplaza,
  deshabilitado,
  formatos = FORMATOS_DE_DOCUMENTO,
  ayuda: ayudaPropia,
  alElegir,
}: Props) {
  const id = useId();
  const idMensaje = `${id}-mensaje`;
  const entrada = useRef<HTMLInputElement>(null);

  async function alCambiar(evento: ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0] ?? null;
    if (!elegido) {
      return;
    }
    const problema = await formatos.revisar(elegido);
    if (problema) {
      evento.target.value = "";
      alElegir(null, problema);
      return;
    }
    alElegir(elegido);
  }

  function quitar() {
    if (entrada.current) {
      entrada.current.value = "";
      entrada.current.focus();
    }
    alElegir(null);
  }

  const ayuda =
    ayudaPropia ??
    (reemplaza
      ? `${formatos.texto}. Al guardar, reemplaza al documento actual.`
      : `${formatos.texto}. Puede ser el documento escaneado o una foto legible.`);

  return (
    <div className="min-w-0">
      <p className={ETIQUETA_CONTROL}>{etiqueta}</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={entrada}
          id={id}
          type="file"
          name="archivo"
          accept={formatos.acepta}
          disabled={deshabilitado}
          aria-label={etiqueta}
          aria-invalid={error ? true : undefined}
          aria-describedby={idMensaje}
          onChange={alCambiar}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          className={`${BASE_BOTON} ${TAMANOS_BOTON.normal} ${VARIANTES_BOTON.secundario} shrink-0 cursor-pointer border border-dashed peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento peer-disabled:cursor-not-allowed peer-disabled:opacity-55 ${
            error ? "border-error" : "border-linea"
          }`}
        >
          <Paperclip aria-hidden="true" size={16} />
          {archivo ? "Elegir otro archivo" : reemplaza ? "Elegir un documento nuevo" : "Elegir archivo"}
        </label>
        {archivo ? (
          <div className="entrada-mensaje flex min-w-0 flex-1 items-center gap-3 rounded-control bg-superficie py-1.5 pl-3 pr-1.5">
            <FileText aria-hidden="true" size={18} className="shrink-0 text-acento" />
            <p className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem]">{archivo.name}</span>
              <span className="cifras block text-sm text-tenue">{tamanoLegible(archivo.size)}</span>
            </p>
            <button
              type="button"
              onClick={quitar}
              disabled={deshabilitado}
              className="grid size-9 shrink-0 select-none place-items-center rounded-[8px] text-tenue transition-[transform,background-color,color] duration-150 ease-salida hover:bg-superficie-alta hover:text-tinta active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
            >
              <X aria-hidden="true" size={16} />
              <span className="sr-only">Quitar el archivo {archivo.name}</span>
            </button>
          </div>
        ) : (
          <p className="text-sm text-tenue">Ningún archivo elegido</p>
        )}
      </div>
      <p id={idMensaje} className={`${MENSAJE_CONTROL} ${error ? "text-error" : "text-tenue"}`}>
        {error ? (
          <span role="alert" className="entrada-mensaje inline-block">
            {error}
          </span>
        ) : (
          ayuda
        )}
      </p>
    </div>
  );
}

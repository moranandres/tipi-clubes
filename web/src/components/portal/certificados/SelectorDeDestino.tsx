"use client";

import { ArrowRight } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { enfocarPrimerInvalido, useEnvio } from "@/components/portal/formularios/ganchos";
import { Boton } from "@/components/ui/Boton";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";

type Props = {
  etiqueta: string;
  nombre: string;
  opciones: OpcionDeFormulario[];
  textoSinEleccion: string;
  ayuda: string;
  errorSinEleccion: string;
  textoDelBoton: string;
};

export function SelectorDeDestino({
  etiqueta,
  nombre,
  opciones,
  textoSinEleccion,
  ayuda,
  errorSinEleccion,
  textoDelBoton,
}: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const [elegido, setElegido] = useState("");
  const [error, setError] = useState<string | undefined>();
  const { pendiente, navegar } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }
    if (!elegido) {
      setError(errorSinEleccion);
      enfocarPrimerInvalido(formulario.current);
      return;
    }
    navegar(elegido);
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-label={`Elegir ${etiqueta.toLowerCase()}`}>
      <CampoSeleccion
        etiqueta={etiqueta}
        name={nombre}
        required
        opciones={opciones}
        textoSinEleccion={textoSinEleccion}
        value={elegido}
        error={error}
        ayuda={ayuda}
        onChange={(evento) => {
          setElegido(evento.target.value);
          setError(undefined);
        }}
      />
      <Boton type="submit" cargando={pendiente} textoCargando="Abriendo" className="mt-1 w-full sm:w-auto">
        {textoDelBoton}
        <ArrowRight aria-hidden="true" size={16} />
      </Boton>
    </form>
  );
}

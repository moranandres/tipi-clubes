"use client";

import { SearchCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";

type Props = {
  ruta: string;
  codigo: string;
};

const LONGITUD_MAXIMA = 40;

export function FormularioDeVerificacion({ ruta, codigo }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState(codigo);
  const [error, setError] = useState<string | undefined>();
  const [pendiente, iniciar] = useTransition();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }
    const limpio = texto.trim();
    if (!limpio) {
      setError("Escribe el código de verificación del certificado.");
      return;
    }
    setError(undefined);
    iniciar(() => {
      router.push(`${ruta}?codigo=${encodeURIComponent(limpio)}`);
    });
  }

  return (
    <form onSubmit={alEnviar} noValidate className="mt-8" aria-label="Verificar un certificado">
      <Campo
        etiqueta="Código de verificación"
        name="codigo"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={LONGITUD_MAXIMA}
        value={texto}
        error={error}
        placeholder="TIPI-XXXX-XXXX-XXXX"
        className="cifras uppercase tracking-wide placeholder:normal-case"
        ayuda="Está al pie del certificado, junto al código QR."
        onChange={(evento) => {
          setTexto(evento.target.value);
          setError(undefined);
        }}
      />
      <Boton
        type="submit"
        cargando={pendiente}
        textoCargando="Verificando"
        className="mt-2 w-full sm:w-auto"
      >
        <SearchCheck aria-hidden="true" size={16} />
        Verificar
      </Boton>
    </form>
  );
}

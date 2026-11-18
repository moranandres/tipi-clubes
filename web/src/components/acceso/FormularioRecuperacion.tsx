"use client";

import { Mail } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { enfocarPrimerInvalido, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { solicitarRecuperacion } from "@/lib/acciones/acceso";
import { LONGITUD_MAXIMA_DE_IDENTIFICADOR, errorDeIdentificador } from "@/lib/acceso/reglas-clave";

type Props = {
  idTitulo: string;
};

export function FormularioRecuperacion({ idTitulo }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const [identificador, setIdentificador] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [enviado, setEnviado] = useState(false);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrado = errorDeIdentificador(identificador);
    if (encontrado) {
      setError(encontrado);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => solicitarRecuperacion({ identificador }),
      (resultado) => {
        if (resultado.ok) {
          setEnviado(true);
          avisar("exito", resultado.mensaje);
          return;
        }
        if (resultado.errores.identificador) {
          setError(resultado.errores.identificador);
          enfocarPrimerInvalido(formulario.current);
        }
        avisar("error", resultado.mensaje);
      },
    );
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-labelledby={idTitulo} className="w-full">
      <Campo
        etiqueta="Usuario o correo"
        name="identificador"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={LONGITUD_MAXIMA_DE_IDENTIFICADOR}
        value={identificador}
        error={error}
        onChange={(evento) => {
          setIdentificador(evento.target.value);
          setError(undefined);
          setEnviado(false);
        }}
      />
      <Boton
        type="submit"
        cargando={pendiente}
        textoCargando="Enviando"
        className="mt-3 h-12 w-full text-base"
      >
        <Mail aria-hidden="true" size={18} />
        {enviado ? "Enviar otro enlace" : "Enviar enlace de recuperación"}
      </Boton>
      <ZonaDeAviso aviso={aviso} className="mt-4 min-h-12" />
    </form>
  );
}

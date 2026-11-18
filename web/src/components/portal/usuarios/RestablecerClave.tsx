"use client";

import { KeyRound } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { enfocarPrimerInvalido, useAlOcultar, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { restablecerClaveDeUsuario } from "@/lib/acciones/usuarios";
import { errorDeClaveTemporal } from "@/lib/portal/reglas-usuarios";
import { CampoDeClave } from "./CampoDeClave";

type Props = {
  usuarioId: number;
  esPropio: boolean;
};

export function RestablecerClave({ usuarioId, esPropio }: Props) {
  const idTitulo = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | undefined>();
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => {
    setClave("");
    setError(undefined);
  });

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente || esPropio) {
      return;
    }

    const encontrado = errorDeClaveTemporal(clave);
    if (encontrado) {
      setError(encontrado);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => restablecerClaveDeUsuario(usuarioId, clave),
      (resultado) => {
        if (resultado.ok) {
          avisar("exito", resultado.mensaje);
          return;
        }
        if (resultado.errores.passwordTemporal) {
          setError(resultado.errores.passwordTemporal);
          enfocarPrimerInvalido(formulario.current);
        }
        avisar("error", resultado.mensaje);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        Contraseña temporal
      </h2>
      {esPropio ? (
        <p className="mt-3 text-[0.9375rem] text-tenue">
          No puedes asignar una contraseña temporal a tu propia cuenta: cerraría tu sesión actual.
        </p>
      ) : (
        <>
          <p className="mt-2 text-[0.9375rem] text-tenue">
            Reemplaza la contraseña actual, desbloquea la cuenta si estaba bloqueada y cierra sus
            sesiones abiertas. Comunícasela a la persona por un medio seguro.
          </p>
          <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-4">
            <CampoDeClave
              etiqueta="Nueva contraseña temporal"
              valor={clave}
              error={error}
              ayuda="Mínimo 10 caracteres con mayúscula, minúscula y número."
              alCambiar={(valor) => {
                setClave(valor);
                setError(undefined);
              }}
            />
            <Boton
              type="submit"
              cargando={pendiente}
              textoCargando="Asignando"
              className="mt-4 w-full"
            >
              <KeyRound aria-hidden="true" size={16} />
              Asignar contraseña temporal
            </Boton>
          </form>
        </>
      )}
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}

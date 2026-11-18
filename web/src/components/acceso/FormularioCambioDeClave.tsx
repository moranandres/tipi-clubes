"use client";

import { KeyRound } from "lucide-react";
import { useRef, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { cambiarClavePropia } from "@/lib/acciones/acceso";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { AYUDA_DE_CLAVE, erroresDeClaveNueva } from "@/lib/acceso/reglas-clave";
import { RUTA_PORTAL } from "@/lib/sesion/cookie";
import { CampoDeContrasena } from "./CampoDeContrasena";

type Props = {
  idTitulo: string;
  usuario: string;
};

const INICIALES = { actual: "", nueva: "", confirmacion: "" };
const VINCULADOS = [["nueva", "confirmacion"]] as const;

export function FormularioCambioDeClave({ idTitulo, usuario }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setErrores } = useCampos(INICIALES, VINCULADOS);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = {
      actual: valores.actual ? undefined : "Escribe tu contraseña actual.",
      ...erroresDeClaveNueva(valores),
    };
    if (encontrados.actual || encontrados.nueva || encontrados.confirmacion) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => cambiarClavePropia(valores),
      (resultado) => {
        if (resultado.ok) {
          avisar("exito", resultado.mensaje);
          window.location.replace(resultado.destino ?? RUTA_PORTAL);
          return;
        }
        setErrores(resultado.errores);
        avisar("error", resultado.mensaje);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-labelledby={idTitulo} className="w-full">
      <input type="text" name="username" autoComplete="username" hidden readOnly value={usuario} />
      <div className="flex flex-col gap-3">
        <CampoDeContrasena
          etiqueta="Contraseña actual"
          nombre="actual"
          autocompletar="current-password"
          valor={valores.actual}
          error={errores.actual}
          alCambiar={(valor) => cambiar("actual", valor)}
        />
        <CampoDeContrasena
          etiqueta="Contraseña nueva"
          nombre="nueva"
          autocompletar="new-password"
          valor={valores.nueva}
          error={errores.nueva}
          ayuda={AYUDA_DE_CLAVE}
          alCambiar={(valor) => cambiar("nueva", valor)}
        />
        <CampoDeContrasena
          etiqueta="Repite la contraseña nueva"
          nombre="confirmacion"
          autocompletar="new-password"
          valor={valores.confirmacion}
          error={errores.confirmacion}
          alCambiar={(valor) => cambiar("confirmacion", valor)}
        />
      </div>
      <Boton type="submit" cargando={pendiente} textoCargando="Guardando" className="mt-3 h-12 w-full text-base">
        <KeyRound aria-hidden="true" size={18} />
        Guardar contraseña nueva
      </Boton>
      <ZonaDeAviso aviso={aviso} className="mt-4 min-h-12" />
    </form>
  );
}

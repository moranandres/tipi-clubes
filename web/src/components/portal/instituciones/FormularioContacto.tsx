"use client";

import { Save } from "lucide-react";
import { useRef, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { actualizarContactoDeInstitucion } from "@/lib/acciones/instituciones";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  CAMPOS_DE_CONTACTO,
  validarContacto,
  type DatosDeContacto,
} from "@/lib/portal/reglas-instituciones";
import { hayErrores } from "@/lib/portal/validacion";
import { CamposDeContacto } from "./CamposDeContacto";

type Props = {
  institucionId: number;
  iniciales: DatosDeContacto;
};

export function FormularioContacto({ institucionId, iniciales }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setErrores } = useCampos(iniciales);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarContacto(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => actualizarContactoDeInstitucion(institucionId, valores),
      (resultado) => {
        if (resultado.ok) {
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_CONTACTO);
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-label="Datos de contacto">
      <fieldset className="min-w-0">
        <legend className="text-lg font-medium">Contacto y autoridad</legend>
        <p className="mt-1.5 text-[0.9375rem] text-tenue">
          Mantén al día cómo comunicarse con tu institución. Los demás datos los actualiza la
          administración de TIPI 3.0.
        </p>
        <CamposDeContacto valores={valores} errores={errores} cambiar={cambiar} />
      </fieldset>
      <div className="mt-4">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          <Save aria-hidden="true" size={16} />
          Guardar contacto
        </Boton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

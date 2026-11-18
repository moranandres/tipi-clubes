"use client";

import { Save } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { actualizarParticipacion } from "@/lib/acciones/competencias";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  CAMPOS_DE_RESULTADO,
  validarResultado,
  type DatosDeResultado,
} from "@/lib/portal/reglas-competencias";
import { hayErrores } from "@/lib/portal/validacion";
import { CamposDeResultado } from "./CamposDeResultado";

type Props = {
  participacionId: number;
  iniciales: DatosDeResultado;
  inicioDeEdicion: string | null;
  hoy: string;
};

const CAMPOS_VINCULADOS: readonly (readonly (keyof DatosDeResultado)[])[] = [["puesto", "reconocimiento"]];

export function FormularioResultado({ participacionId, iniciales, inicioDeEdicion, hoy }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const [guardados, setGuardados] = useState(iniciales);
  const { valores, errores, cambiar, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();
  const inicioPendiente = inicioDeEdicion && inicioDeEdicion > hoy ? inicioDeEdicion : null;

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarResultado(valores, {
      inicioDeEdicion,
      hoy,
      anterior: { puesto: guardados.puesto, reconocimiento: guardados.reconocimiento },
    });
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    const enviados = { ...valores };
    enviar(
      () => actualizarParticipacion(participacionId, enviados),
      (resultado) => {
        if (resultado.ok) {
          setGuardados(enviados);
          avisar("exito", resultado.mensaje, resultado.avisos);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_RESULTADO);
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-labelledby="titulo-resultado">
      <h2 id="titulo-resultado" className="text-lg font-medium">
        Equipo y resultado
      </h2>
      <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-tenue">
        Actualiza el equipo, el puesto o el reconocimiento cuando se conozcan. Cada cambio queda en la
        auditoría.
      </p>
      <div className="mt-4">
        <CamposDeResultado
          valores={valores}
          errores={errores}
          inicioPendiente={inicioPendiente}
          cambiar={cambiar}
        />
      </div>
      <div className="mt-4">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          <Save aria-hidden="true" size={16} />
          Guardar resultado
        </Boton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

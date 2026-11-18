"use client";

import { Save } from "lucide-react";
import { useId, useRef, type FormEvent } from "react";
import { enfocarPrimerInvalido, repartirErrores, useCampos, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { actualizarParametros } from "@/lib/acciones/seguimiento";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  CAMPOS_DE_PARAMETROS,
  validarParametros,
  type DatosDeParametros,
} from "@/lib/portal/filtros-seguimiento";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  iniciales: DatosDeParametros;
  actualizacion: string | null;
};

const CAMPOS_VINCULADOS: readonly (readonly (keyof DatosDeParametros)[])[] = [["umbralAdecuado", "umbralMinimo"]];

export function FormularioParametros({ iniciales, actualizacion }: Props) {
  const idTitulo = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }
    const encontrados = validarParametros(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }
    limpiarAviso();
    enviar(
      () => actualizarParametros(valores),
      (resultado) => {
        if (resultado.ok) {
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_PARAMETROS);
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        Parámetros del semáforo
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        Un club es adecuado si cumple al menos el umbral adecuado, en riesgo si alcanza el mínimo y
        crítico por debajo.{actualizacion ? ` Última actualización: ${actualizacion}.` : ""}
      </p>
      <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-4" aria-label="Parámetros del semáforo">
        <Campo
          etiqueta="Días de gracia para registrar"
          name="diasGraciaRegistro"
          type="number"
          inputMode="numeric"
          required
          min={0}
          max={15}
          className="cifras"
          value={valores.diasGraciaRegistro}
          error={errores.diasGraciaRegistro}
          ayuda="De 0 a 15 días después de la sesión."
          onChange={(evento) => cambiar("diasGraciaRegistro", evento.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            etiqueta="Umbral adecuado (%)"
            name="umbralAdecuado"
            type="text"
            inputMode="decimal"
            required
            className="cifras"
            value={valores.umbralAdecuado}
            error={errores.umbralAdecuado}
            onChange={(evento) => cambiar("umbralAdecuado", evento.target.value)}
          />
          <Campo
            etiqueta="Umbral mínimo (%)"
            name="umbralMinimo"
            type="text"
            inputMode="decimal"
            required
            className="cifras"
            value={valores.umbralMinimo}
            error={errores.umbralMinimo}
            onChange={(evento) => cambiar("umbralMinimo", evento.target.value)}
          />
        </div>
        <Boton type="submit" variante="elevado" cargando={pendiente} textoCargando="Guardando" className="w-full">
          <Save aria-hidden="true" size={16} />
          Guardar parámetros
        </Boton>
      </form>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}

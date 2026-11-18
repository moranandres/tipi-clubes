"use client";

import { Flag } from "lucide-react";
import { useId, useRef, type FormEvent } from "react";
import { enfocarPrimerInvalido, repartirErrores, useCampos, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { finalizarProyecto } from "@/lib/acciones/proyectos";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { LIMITES_DE_PROYECTO, validarFinalizacion, type DatosDeFinalizacion } from "@/lib/portal/reglas-proyectos";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  proyectoId: number;
  inicio: string;
  hoy: string;
};

const CAMPOS: readonly (keyof DatosDeFinalizacion)[] = ["resultadoFinal", "fechaFinalizacion"];

export function FinalizarProyecto({ proyectoId, inicio, hoy }: Props) {
  const idTitulo = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setErrores } = useCampos<DatosDeFinalizacion>({
    resultadoFinal: "",
    fechaFinalizacion: hoy,
  });
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarFinalizacion(valores, inicio, hoy);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => finalizarProyecto(proyectoId, valores),
      (resultado) => {
        if (resultado.ok && resultado.destino) {
          navegar(resultado.destino);
          return;
        }
        if (!resultado.ok) {
          const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS);
          setErrores(deCampos);
          avisar("error", resultado.mensaje, ajenos);
          enfocarPrimerInvalido(formulario.current);
        }
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        Finalizar el proyecto
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        Registra lo que lograron. Su avance queda en 100 % y después solo se ajustan sus evidencias.
      </p>
      <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-4" aria-label="Finalización del proyecto">
        <CampoTextoLargo
          etiqueta="Resultado final"
          name="resultadoFinal"
          rows={4}
          required
          maxLength={LIMITES_DE_PROYECTO.resultadoFinal}
          value={valores.resultadoFinal}
          error={errores.resultadoFinal}
          ayuda={`${valores.resultadoFinal.trim().length} de ${LIMITES_DE_PROYECTO.resultadoFinal} caracteres.`}
          onChange={(evento) => cambiar("resultadoFinal", evento.target.value)}
        />
        <Campo
          etiqueta="Fecha de finalización"
          name="fechaFinalizacion"
          type="date"
          min={inicio}
          max={hoy}
          className="cifras"
          value={valores.fechaFinalizacion}
          error={errores.fechaFinalizacion}
          onChange={(evento) => cambiar("fechaFinalizacion", evento.target.value)}
        />
        <Boton type="submit" cargando={pendiente} textoCargando="Finalizando" className="w-full">
          <Flag aria-hidden="true" size={16} />
          Finalizar proyecto
        </Boton>
      </form>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}

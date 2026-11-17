"use client";

import { CircleCheckBig, Save } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { registrarEjecucion } from "@/lib/acciones/actividades";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  CAMPOS_CON_ERROR_DE_EJECUCION,
  LIMITES_DE_ACTIVIDAD,
  validarEjecucion,
  type CampoDeEjecucion,
  type ContenidoElegible,
  type DatosDeEjecucion,
  type ErroresDeEjecucion,
} from "@/lib/portal/reglas-actividades";
import { hayErrores } from "@/lib/portal/validacion";
import { SelectorDeContenidos } from "./SelectorDeContenidos";

type Props = {
  actividadId: number;
  iniciales: DatosDeEjecucion;
  contenidosIniciales: number[];
  contenidos: ContenidoElegible[];
  esCorreccion: boolean;
};

export function FormularioEjecucion({
  actividadId,
  iniciales,
  contenidosIniciales,
  contenidos,
  esCorreccion,
}: Props) {
  const idTitulo = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setErrores } = useCampos(iniciales);
  const [elegidos, setElegidos] = useState<number[]>(contenidosIniciales);
  const [errorDeContenidos, setErrorDeContenidos] = useState<string | undefined>();
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();

  function mostrarErrores(encontrados: ErroresDeEjecucion) {
    const { contenidoIds, ...deCampos } = encontrados;
    setErrores(deCampos);
    setErrorDeContenidos(contenidoIds);
    enfocarPrimerInvalido(formulario.current);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarEjecucion(valores, elegidos);
    if (hayErrores(encontrados)) {
      mostrarErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      return;
    }

    limpiarAviso();
    enviar(
      () => registrarEjecucion(actividadId, valores, elegidos, esCorreccion),
      (resultado) => {
        if (resultado.ok) {
          if (resultado.destino) {
            navegar(resultado.destino);
            return;
          }
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores<CampoDeEjecucion>(
          resultado.errores,
          CAMPOS_CON_ERROR_DE_EJECUCION,
        );
        mostrarErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="text-lg font-medium">
        {esCorreccion ? "Ejecución registrada" : "Registrar la ejecución"}
      </h2>
      <p className="mt-1.5 max-w-[65ch] text-[0.9375rem] text-tenue">
        {esCorreccion
          ? "Puedes corregir el resumen, las observaciones y los contenidos trabajados. Cada corrección queda en la auditoría."
          : "Cuéntanos qué se trabajó realmente. Al guardar, la sesión pasa a Ejecutada y se habilitan la asistencia y las evidencias."}
      </p>
      <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-4 flex flex-col gap-3">
        <CampoTextoLargo
          etiqueta="Resumen de lo impartido"
          name="resumen"
          rows={4}
          required
          maxLength={LIMITES_DE_ACTIVIDAD.resumen}
          value={valores.resumen}
          error={errores.resumen}
          onChange={(evento) => cambiar("resumen", evento.target.value)}
        />
        <CampoTextoLargo
          etiqueta="Observaciones (opcional)"
          name="observaciones"
          rows={3}
          maxLength={LIMITES_DE_ACTIVIDAD.observaciones}
          value={valores.observaciones}
          error={errores.observaciones}
          ayuda="Dificultades, logros destacados o pendientes para la próxima sesión."
          onChange={(evento) => cambiar("observaciones", evento.target.value)}
        />
        <SelectorDeContenidos
          etiqueta="Contenidos trabajados"
          contenidos={contenidos}
          elegidos={elegidos}
          error={errorDeContenidos}
          ayuda="Elige al menos uno."
          alCambiar={(ids) => {
            setElegidos(ids);
            setErrorDeContenidos(undefined);
          }}
        />
        <div>
          <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
            {esCorreccion ? (
              <Save aria-hidden="true" size={16} />
            ) : (
              <CircleCheckBig aria-hidden="true" size={16} />
            )}
            {esCorreccion ? "Guardar corrección" : "Registrar ejecución"}
          </Boton>
        </div>
      </form>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}

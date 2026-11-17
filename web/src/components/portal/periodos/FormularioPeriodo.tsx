"use client";

import { Save } from "lucide-react";
import { useRef, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
  useReinicioTrasCrear,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { actualizarPeriodo, crearPeriodo } from "@/lib/acciones/periodos";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  CAMPOS_DE_PERIODO,
  LONGITUD_MAXIMA_DE_PERIODO,
  RUTA_PERIODOS,
  validarPeriodo,
  type CampoDePeriodo,
  type DatosDePeriodo,
} from "@/lib/portal/reglas-periodos";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  periodoId: number | null;
  iniciales: DatosDePeriodo;
};

const CAMPOS_VINCULADOS: readonly (readonly CampoDePeriodo[])[] = [["fechaInicio", "fechaFin"]];

export function FormularioPeriodo({ periodoId, iniciales }: Props) {
  const esNuevo = periodoId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(
    iniciales,
    CAMPOS_VINCULADOS,
  );
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
  });

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarPeriodo(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNuevo ? crearPeriodo(valores) : actualizarPeriodo(periodoId, valores)),
      (resultado) => {
        if (resultado.ok) {
          if (resultado.destino) {
            reiniciarAlSalir();
            navegar(resultado.destino);
            return;
          }
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_PERIODO);
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <form
      ref={formulario}
      onSubmit={alEnviar}
      noValidate
      aria-label={esNuevo ? "Datos del nuevo período" : "Datos del período"}
    >
      <fieldset className="min-w-0">
        <legend className="text-lg font-medium">Datos del período</legend>
        <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Nombre"
              name="nombre"
              type="text"
              autoComplete="off"
              required
              maxLength={LONGITUD_MAXIMA_DE_PERIODO}
              placeholder="2026-2027 Sierra-Costa"
              value={valores.nombre}
              error={errores.nombre}
              ayuda="No puede repetirse con otro período."
              onChange={(evento) => cambiar("nombre", evento.target.value)}
            />
          </div>
          <Campo
            etiqueta="Fecha de inicio"
            name="fechaInicio"
            type="date"
            required
            className="cifras"
            value={valores.fechaInicio}
            error={errores.fechaInicio}
            onChange={(evento) => cambiar("fechaInicio", evento.target.value)}
          />
          <Campo
            etiqueta="Fecha de fin"
            name="fechaFin"
            type="date"
            required
            min={valores.fechaInicio || undefined}
            className="cifras"
            value={valores.fechaFin}
            error={errores.fechaFin}
            ayuda="Debe ser posterior a la fecha de inicio."
            onChange={(evento) => cambiar("fechaFin", evento.target.value)}
          />
        </div>
      </fieldset>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          <Save aria-hidden="true" size={16} />
          {esNuevo ? "Registrar período" : "Guardar cambios"}
        </Boton>
        <EnlaceBoton href={RUTA_PERIODOS} variante="secundario">
          {esNuevo ? "Cancelar" : "Volver a la lista"}
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

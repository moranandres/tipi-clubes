"use client";

import { Plus, Save } from "lucide-react";
import { useRef, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { guardarEdicion } from "@/lib/acciones/competencias";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  CAMPOS_DE_EDICION,
  LIMITES_DE_CATALOGO,
  validarEdicion,
  type CampoDeEdicion,
  type DatosDeEdicion,
} from "@/lib/portal/reglas-competencias";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  competenciaId: number;
  edicionId: number | null;
  iniciales: DatosDeEdicion;
};

const CAMPOS_VINCULADOS: readonly (readonly CampoDeEdicion[])[] = [["anio", "fechaInicio", "fechaFin"]];

export function FormularioEdicion({ competenciaId, edicionId, iniciales }: Props) {
  const esNueva = edicionId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarEdicion(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => guardarEdicion(competenciaId, edicionId, valores),
      (resultado) => {
        if (resultado.ok) {
          if (esNueva) {
            setValores(iniciales);
            setErrores({});
          }
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_EDICION);
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
      aria-label={esNueva ? "Datos de la nueva edición" : "Datos de la edición"}
    >
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Campo
          etiqueta="Nombre de la edición"
          name="nombre"
          type="text"
          autoComplete="off"
          required
          maxLength={LIMITES_DE_CATALOGO.nombreDeEdicion}
          placeholder="Final nacional"
          value={valores.nombre}
          error={errores.nombre}
          onChange={(evento) => cambiar("nombre", evento.target.value)}
        />
        <Campo
          etiqueta="Año"
          name="anio"
          type="number"
          inputMode="numeric"
          required
          min={LIMITES_DE_CATALOGO.anioMinimo}
          max={LIMITES_DE_CATALOGO.anioMaximo}
          className="cifras"
          value={valores.anio}
          error={errores.anio}
          onChange={(evento) => cambiar("anio", evento.target.value)}
        />
      </div>
      <div className="mt-1 grid gap-x-5 gap-y-3 sm:grid-cols-2">
        <Campo
          etiqueta="Fecha de inicio (opcional)"
          name="fechaInicio"
          type="date"
          className="cifras"
          value={valores.fechaInicio}
          error={errores.fechaInicio}
          ayuda="Desde esta fecha se registran resultados y certificados."
          onChange={(evento) => cambiar("fechaInicio", evento.target.value)}
        />
        <Campo
          etiqueta="Fecha de fin (opcional)"
          name="fechaFin"
          type="date"
          min={valores.fechaInicio || undefined}
          className="cifras"
          value={valores.fechaFin}
          error={errores.fechaFin}
          onChange={(evento) => cambiar("fechaFin", evento.target.value)}
        />
        <div className="sm:col-span-2">
          <Campo
            etiqueta="Sede (opcional)"
            name="sede"
            type="text"
            autoComplete="off"
            maxLength={LIMITES_DE_CATALOGO.sede}
            value={valores.sede}
            error={errores.sede}
            onChange={(evento) => cambiar("sede", evento.target.value)}
          />
        </div>
      </div>
      <div className="mt-1">
        <Boton type="submit" variante={esNueva ? "primario" : "elevado"} cargando={pendiente} textoCargando="Guardando">
          {esNueva ? <Plus aria-hidden="true" size={16} /> : <Save aria-hidden="true" size={16} />}
          {esNueva ? "Agregar edición" : "Guardar edición"}
        </Boton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </form>
  );
}

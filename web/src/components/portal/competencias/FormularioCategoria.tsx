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
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { guardarCategoria } from "@/lib/acciones/competencias";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { OPCIONES_DE_NIVEL } from "@/lib/portal/filtros-competencias";
import {
  CAMPOS_DE_CATEGORIA,
  LIMITES_DE_CATALOGO,
  validarCategoria,
  type DatosDeCategoria,
} from "@/lib/portal/reglas-competencias";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  competenciaId: number;
  categoriaId: number | null;
  iniciales: DatosDeCategoria;
  nivelFijo: boolean;
};

export function FormularioCategoria({ competenciaId, categoriaId, iniciales, nivelFijo }: Props) {
  const esNueva = categoriaId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarCategoria(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => guardarCategoria(competenciaId, categoriaId, valores),
      (resultado) => {
        if (resultado.ok) {
          if (esNueva) {
            setValores(iniciales);
            setErrores({});
          }
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_CATEGORIA);
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
      aria-label={esNueva ? "Datos de la nueva categoría" : "Datos de la categoría"}
    >
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <Campo
          etiqueta="Nombre de la categoría"
          name="nombre"
          type="text"
          autoComplete="off"
          required
          maxLength={LIMITES_DE_CATALOGO.nombreDeCategoria}
          placeholder="Seguidor de línea"
          value={valores.nombre}
          error={errores.nombre}
          onChange={(evento) => cambiar("nombre", evento.target.value)}
        />
        <CampoSeleccion
          etiqueta="Nivel"
          name="nivel"
          required
          opciones={OPCIONES_DE_NIVEL}
          textoSinEleccion="Elige"
          disabled={nivelFijo}
          value={valores.nivel}
          error={errores.nivel}
          ayuda={nivelFijo ? "Ya tiene participaciones." : undefined}
          onChange={(evento) => cambiar("nivel", evento.target.value)}
        />
        <div className="sm:col-span-2">
          <CampoTextoLargo
            etiqueta="Descripción (opcional)"
            name="descripcion"
            rows={2}
            maxLength={LIMITES_DE_CATALOGO.descripcionDeCategoria}
            value={valores.descripcion}
            error={errores.descripcion}
            onChange={(evento) => cambiar("descripcion", evento.target.value)}
          />
        </div>
      </div>
      <div className="mt-1">
        <Boton type="submit" variante={esNueva ? "primario" : "elevado"} cargando={pendiente} textoCargando="Guardando">
          {esNueva ? <Plus aria-hidden="true" size={16} /> : <Save aria-hidden="true" size={16} />}
          {esNueva ? "Agregar categoría" : "Guardar categoría"}
        </Boton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </form>
  );
}

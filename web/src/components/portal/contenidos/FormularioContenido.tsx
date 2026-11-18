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
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { actualizarContenido, crearContenido } from "@/lib/acciones/contenidos";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { TIPOS_DE_CONTENIDO } from "@/lib/portal/filtros-actividades";
import {
  DESCRIPCIONES_DE_TIPO,
  NOMBRE_DE_TIPO_EN_SINGULAR,
  RUTA_CONTENIDOS,
} from "@/lib/portal/filtros-contenidos";
import {
  CAMPOS_DE_CONTENIDO,
  LIMITES_DE_CONTENIDO,
  esTipoDeContenido,
  validarContenido,
  type DatosDeContenido,
} from "@/lib/portal/reglas-contenidos";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  contenidoId: number | null;
  iniciales: DatosDeContenido;
  actividades: number;
};

const OPCIONES_DE_TIPO = TIPOS_DE_CONTENIDO.map((tipo) => ({
  valor: tipo,
  texto: NOMBRE_DE_TIPO_EN_SINGULAR[tipo],
}));

function plural(cantidad: number): string {
  return cantidad === 1 ? "1 actividad" : `${cantidad} actividades`;
}

export function FormularioContenido({ contenidoId, iniciales, actividades }: Props) {
  const esNuevo = contenidoId === null;
  const tipoFijo = !esNuevo && actividades > 0;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
  });

  function ayudaDeTipo(): string {
    if (tipoFijo) {
      return `Se usa en ${plural(actividades)} y no puede cambiar de tipo. Desactívalo y crea uno nuevo si hace falta.`;
    }
    return esTipoDeContenido(valores.tipo)
      ? DESCRIPCIONES_DE_TIPO[valores.tipo]
      : "Define dónde aparece al planificar actividades y registrar avances.";
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarContenido(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNuevo ? crearContenido(valores) : actualizarContenido(contenidoId, valores)),
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
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_CONTENIDO);
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
      aria-label={esNuevo ? "Datos del nuevo contenido" : "Datos del contenido"}
    >
      <fieldset className="min-w-0">
        <legend className="text-lg font-medium">Datos del contenido</legend>
        <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <CampoSeleccion
            etiqueta="Tipo"
            name="tipo"
            required
            opciones={OPCIONES_DE_TIPO}
            textoSinEleccion="Elige un tipo"
            value={valores.tipo}
            disabled={tipoFijo}
            error={errores.tipo}
            ayuda={ayudaDeTipo()}
            onChange={(evento) => cambiar("tipo", evento.target.value)}
          />
          <Campo
            etiqueta="Nombre"
            name="nombre"
            type="text"
            autoComplete="off"
            required
            maxLength={LIMITES_DE_CONTENIDO.nombre}
            value={valores.nombre}
            error={errores.nombre}
            ayuda="No puede repetirse dentro del mismo tipo."
            onChange={(evento) => cambiar("nombre", evento.target.value)}
          />
          <div className="sm:col-span-2">
            <CampoTextoLargo
              etiqueta="Descripción (opcional)"
              name="descripcion"
              rows={3}
              maxLength={LIMITES_DE_CONTENIDO.descripcion}
              value={valores.descripcion}
              error={errores.descripcion}
              ayuda={`${valores.descripcion.trim().length} de ${LIMITES_DE_CONTENIDO.descripcion} caracteres.`}
              onChange={(evento) => cambiar("descripcion", evento.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          <Save aria-hidden="true" size={16} />
          {esNuevo ? "Agregar contenido" : "Guardar cambios"}
        </Boton>
        <EnlaceBoton href={RUTA_CONTENIDOS} variante="secundario">
          {esNuevo ? "Cancelar" : "Volver a la lista"}
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

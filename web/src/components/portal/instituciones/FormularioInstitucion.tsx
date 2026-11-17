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
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { actualizarInstitucion, crearInstitucion } from "@/lib/acciones/instituciones";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { OPCIONES_DE_ADHESION, RUTA_INSTITUCIONES } from "@/lib/portal/filtros-instituciones";
import {
  CAMPOS_DE_INSTITUCION,
  ESTADO_ADHERIDA,
  LIMITES_DE_INSTITUCION,
  validarInstitucion,
  type CampoDeInstitucion,
  type DatosDeInstitucion,
} from "@/lib/portal/reglas-instituciones";
import { hoyEnGuayaquil } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";
import { CamposDeContacto } from "./CamposDeContacto";

type Props = {
  institucionId: number | null;
  iniciales: DatosDeInstitucion;
};

const CAMPOS_VINCULADOS: readonly (readonly CampoDeInstitucion[])[] = [
  ["estadoAdhesion", "fechaAdhesion"],
];

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";

export function FormularioInstitucion({ institucionId, iniciales }: Props) {
  const esNueva = institucionId === null;
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

    const encontrados = validarInstitucion(valores, hoyEnGuayaquil());
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () =>
        esNueva ? crearInstitucion(valores) : actualizarInstitucion(institucionId, valores),
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
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_INSTITUCION);
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  const exigeFecha = valores.estadoAdhesion === ESTADO_ADHERIDA;

  return (
    <form
      ref={formulario}
      onSubmit={alEnviar}
      noValidate
      aria-label={esNueva ? "Datos de la nueva institución" : "Datos de la institución"}
    >
      <fieldset className="min-w-0">
        <legend className={LEYENDA}>Identificación</legend>
        <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <Campo
            etiqueta="Código AMIE"
            name="codigoAmie"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            maxLength={LIMITES_DE_INSTITUCION.codigoAmie}
            placeholder="09H00001"
            className="cifras uppercase"
            value={valores.codigoAmie}
            error={errores.codigoAmie}
            ayuda="Código único del Mineduc."
            onChange={(evento) => cambiar("codigoAmie", evento.target.value)}
          />
          <Campo
            etiqueta="Nombre"
            name="nombre"
            type="text"
            autoComplete="organization"
            required
            maxLength={LIMITES_DE_INSTITUCION.nombre}
            placeholder="Unidad Educativa Fiscal"
            value={valores.nombre}
            error={errores.nombre}
            onChange={(evento) => cambiar("nombre", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8 min-w-0">
        <legend className={LEYENDA}>Ubicación</legend>
        <div className={REJILLA}>
          <Campo
            etiqueta="Provincia"
            name="provincia"
            type="text"
            autoComplete="address-level1"
            required
            maxLength={LIMITES_DE_INSTITUCION.provincia}
            value={valores.provincia}
            error={errores.provincia}
            onChange={(evento) => cambiar("provincia", evento.target.value)}
          />
          <Campo
            etiqueta="Cantón"
            name="canton"
            type="text"
            autoComplete="address-level2"
            required
            maxLength={LIMITES_DE_INSTITUCION.canton}
            value={valores.canton}
            error={errores.canton}
            onChange={(evento) => cambiar("canton", evento.target.value)}
          />
          <Campo
            etiqueta="Zona (opcional)"
            name="zona"
            type="text"
            autoComplete="off"
            maxLength={LIMITES_DE_INSTITUCION.zona}
            value={valores.zona}
            error={errores.zona}
            onChange={(evento) => cambiar("zona", evento.target.value)}
          />
          <Campo
            etiqueta="Circuito (opcional)"
            name="circuito"
            type="text"
            autoComplete="off"
            maxLength={LIMITES_DE_INSTITUCION.circuito}
            placeholder="09D03C01"
            value={valores.circuito}
            error={errores.circuito}
            onChange={(evento) => cambiar("circuito", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8 min-w-0">
        <legend className={LEYENDA}>Contacto y autoridad</legend>
        <CamposDeContacto valores={valores} errores={errores} cambiar={cambiar} />
      </fieldset>

      <fieldset className="mt-8 min-w-0">
        <legend className={LEYENDA}>Adhesión a TIPI 3.0</legend>
        <div className={REJILLA}>
          <CampoSeleccion
            etiqueta="Estado de adhesión"
            name="estadoAdhesion"
            required
            opciones={OPCIONES_DE_ADHESION}
            textoSinEleccion="Elige el estado"
            value={valores.estadoAdhesion}
            error={errores.estadoAdhesion}
            onChange={(evento) => cambiar("estadoAdhesion", evento.target.value)}
          />
          <Campo
            etiqueta={exigeFecha ? "Fecha de adhesión" : "Fecha de adhesión (opcional)"}
            name="fechaAdhesion"
            type="date"
            required={exigeFecha}
            className="cifras"
            value={valores.fechaAdhesion}
            error={errores.fechaAdhesion}
            ayuda={
              exigeFecha
                ? "Obligatoria para una institución adherida. No puede ser futura."
                : "No puede ser futura."
            }
            onChange={(evento) => cambiar("fechaAdhesion", evento.target.value)}
          />
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          <Save aria-hidden="true" size={16} />
          {esNueva ? "Registrar institución" : "Guardar cambios"}
        </Boton>
        <EnlaceBoton href={RUTA_INSTITUCIONES} variante="secundario">
          {esNueva ? "Cancelar" : "Volver a la lista"}
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

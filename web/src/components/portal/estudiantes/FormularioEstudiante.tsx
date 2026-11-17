"use client";

import { Save, TriangleAlert, UserCheck } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { DatoFijo } from "@/components/portal/formularios/DatoFijo";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useAlOcultar,
  useCampos,
  useEnvio,
  useReinicioTrasCrear,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { actualizarEstudiante, crearEstudiante } from "@/lib/acciones/estudiantes";
import { MENSAJE_REVISAR_CAMPOS, type ResultadoDeAccion } from "@/lib/acciones/resultado";
import {
  OPCIONES_DE_CURSO_EDUCATIVO,
  RUTA_ESTUDIANTES,
} from "@/lib/portal/filtros-estudiantes";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_ESTUDIANTE,
  CAMPO_DE_HOMONIMO,
  LONGITUD_MAXIMA_DE_NOMBRE,
  validarEstudiante,
  type CampoDeEstudiante,
  type DatosDeEstudiante,
} from "@/lib/portal/reglas-estudiantes";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  estudianteId: number | null;
  iniciales: DatosDeEstudiante;
  instituciones: OpcionDeFormulario[] | null;
  institucionFija: string;
};

const CAMPOS_AL_EDITAR: readonly CampoDeEstudiante[] = CAMPOS_DE_ESTUDIANTE.filter(
  (campo) => campo !== "institucionId",
);

const CAMPOS_DE_IDENTIDAD: readonly CampoDeEstudiante[] = ["institucionId", "nombres", "apellidos"];

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";

export function FormularioEstudiante({
  estudianteId,
  iniciales,
  instituciones,
  institucionFija,
}: Props) {
  const esNuevo = estudianteId === null;
  const idHomonimo = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const confirmacion = useRef<HTMLDivElement>(null);
  const [homonimo, setHomonimo] = useState<string | null>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
    setHomonimo(null);
  });

  useAlOcultar(() => setHomonimo(null));

  useEffect(() => {
    if (homonimo) {
      confirmacion.current?.focus();
    }
  }, [homonimo]);

  function cambiarCampo(campo: CampoDeEstudiante, valor: string) {
    cambiar(campo, valor);
    if (CAMPOS_DE_IDENTIDAD.includes(campo)) {
      setHomonimo(null);
    }
  }

  function alTerminar(resultado: ResultadoDeAccion) {
    if (resultado.ok) {
      setHomonimo(null);
      if (resultado.destino) {
        reiniciarAlSalir();
        navegar(resultado.destino);
        return;
      }
      avisar("exito", resultado.mensaje);
      return;
    }

    const aviso = resultado.errores[CAMPO_DE_HOMONIMO];
    if (aviso) {
      setHomonimo(aviso);
      return;
    }

    const { deCampos, ajenos } = repartirErrores(
      resultado.errores,
      esNuevo ? CAMPOS_DE_ESTUDIANTE : CAMPOS_AL_EDITAR,
    );
    setErrores(deCampos);
    avisar("error", resultado.mensaje, ajenos);
    enfocarPrimerInvalido(formulario.current);
  }

  function guardar(confirmar: boolean) {
    limpiarAviso();
    enviar(
      () =>
        esNuevo
          ? crearEstudiante(valores, confirmar)
          : actualizarEstudiante(estudianteId, valores, confirmar),
      alTerminar,
    );
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarEstudiante(valores, esNuevo);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      setHomonimo(null);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    guardar(false);
  }

  function revisarDatos() {
    setHomonimo(null);
    requestAnimationFrame(() => {
      formulario.current?.querySelector<HTMLInputElement>('input[name="nombres"]')?.focus();
    });
  }

  return (
    <form
      ref={formulario}
      onSubmit={alEnviar}
      noValidate
      aria-label={esNuevo ? "Datos del nuevo estudiante" : "Datos del estudiante"}
    >
      <fieldset disabled={homonimo !== null} className="min-w-0">
        <legend className={LEYENDA}>Datos del estudiante</legend>
        <div className={REJILLA}>
          <div className="sm:col-span-2">
            {esNuevo && instituciones ? (
              <CampoSeleccion
                etiqueta="Institución"
                name="institucionId"
                required
                opciones={instituciones}
                textoSinEleccion="Elige una institución"
                value={valores.institucionId}
                error={errores.institucionId}
                ayuda="No se puede cambiar después del registro."
                onChange={(evento) => cambiarCampo("institucionId", evento.target.value)}
              />
            ) : (
              <DatoFijo etiqueta="Institución" valor={institucionFija} ayuda="No se puede cambiar." />
            )}
          </div>
          <Campo
            etiqueta="Nombres"
            name="nombres"
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            required
            maxLength={LONGITUD_MAXIMA_DE_NOMBRE}
            value={valores.nombres}
            error={errores.nombres}
            onChange={(evento) => cambiarCampo("nombres", evento.target.value)}
          />
          <Campo
            etiqueta="Apellidos"
            name="apellidos"
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            required
            maxLength={LONGITUD_MAXIMA_DE_NOMBRE}
            value={valores.apellidos}
            error={errores.apellidos}
            onChange={(evento) => cambiarCampo("apellidos", evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Curso educativo"
            name="curso"
            required
            opciones={OPCIONES_DE_CURSO_EDUCATIVO}
            textoSinEleccion="Elige el grado o curso"
            value={valores.curso}
            error={errores.curso}
            ayuda="Grado o año de bachillerato que cursa en su institución."
            onChange={(evento) => cambiarCampo("curso", evento.target.value)}
          />
        </div>
      </fieldset>

      {homonimo ? (
        <div
          ref={confirmacion}
          role="alertdialog"
          aria-labelledby={idHomonimo}
          tabIndex={-1}
          className="entrada-mensaje mt-4 rounded-pieza border border-aviso/60 bg-superficie p-5 outline-none"
        >
          <p id={idHomonimo} className="flex items-start gap-2.5 font-medium">
            <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-aviso" />
            <span className="min-w-0">{homonimo}</span>
          </p>
          <p className="mt-2 text-[0.9375rem] text-tenue">
            Busca primero a esa persona en la lista. Confirma solo si estás seguro de que es otro
            estudiante con el mismo nombre.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Boton
              cargando={pendiente}
              textoCargando="Registrando"
              onClick={() => guardar(true)}
            >
              <UserCheck aria-hidden="true" size={16} />
              {esNuevo ? "Es otro estudiante, registrar" : "Es otro estudiante, guardar"}
            </Boton>
            <Boton variante="secundario" textoCargando="" disabled={pendiente} onClick={revisarDatos}>
              Revisar los datos
            </Boton>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
            <Save aria-hidden="true" size={16} />
            {esNuevo ? "Registrar estudiante" : "Guardar cambios"}
          </Boton>
          <EnlaceBoton href={RUTA_ESTUDIANTES} variante="secundario">
            {esNuevo ? "Cancelar" : "Volver a la lista"}
          </EnlaceBoton>
        </div>
      )}
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

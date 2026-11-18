"use client";

import { FolderPlus, Save } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { SelectorDeEstudiantes, type CandidatoDeEvidencia } from "@/components/portal/evidencias/SelectorDeEstudiantes";
import { DatoFijo } from "@/components/portal/formularios/DatoFijo";
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
import { actualizarProyecto, registrarProyecto } from "@/lib/acciones/proyectos";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { OPCIONES_DE_TIPO_DE_PROYECTO, RUTA_PROYECTOS } from "@/lib/portal/filtros-proyectos";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_CON_ERROR_DE_PROYECTO,
  LIMITES_DE_PROYECTO,
  validarProyecto,
  type CampoDeProyecto,
  type DatosDeProyecto,
  type ErroresDeProyecto,
  type PeriodoDelClub,
} from "@/lib/portal/reglas-proyectos";
import { fechaCorta } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";

export type OpcionDeClubDeProyecto = OpcionDeFormulario & {
  docenteId: string;
  periodo: PeriodoDelClub | null;
  docentes: OpcionDeFormulario[];
  integrantes: CandidatoDeEvidencia[];
};

type Props = {
  proyectoId: number | null;
  iniciales: DatosDeProyecto;
  integrantesIniciales: number[];
  clubes: OpcionDeClubDeProyecto[];
  hoy: string;
};

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";
const CAMPOS_VINCULADOS: readonly (readonly (keyof DatosDeProyecto)[])[] = [["fechaInicio", "fechaFinPrevista"]];

export function FormularioProyecto({ proyectoId, iniciales, integrantesIniciales, clubes, hoy }: Props) {
  const esNuevo = proyectoId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const [integrantes, setIntegrantes] = useState<number[]>(integrantesIniciales);
  const [errorDeIntegrantes, setErrorDeIntegrantes] = useState<string | undefined>();
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setIntegrantes(integrantesIniciales);
    setErrores({});
    setErrorDeIntegrantes(undefined);
  });

  const club = clubes.find((opcion) => opcion.valor === valores.clubId) ?? null;
  const periodo = club?.periodo ?? null;

  function elegirClub(valor: string) {
    const elegido = clubes.find((opcion) => opcion.valor === valor);
    cambiar("clubId", valor);
    cambiar("docenteId", elegido?.docenteId ?? "");
    setIntegrantes([]);
    setErrorDeIntegrantes(undefined);
  }

  function mostrarErrores(encontrados: ErroresDeProyecto) {
    const { estudianteIds, ...deCampos } = encontrados;
    setErrores(deCampos);
    setErrorDeIntegrantes(estudianteIds);
    enfocarPrimerInvalido(formulario.current);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarProyecto(valores, integrantes, { periodo, hoy });
    if (hayErrores(encontrados)) {
      mostrarErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNuevo ? registrarProyecto(valores, integrantes) : actualizarProyecto(proyectoId, valores, integrantes)),
      (resultado) => {
        if (resultado.ok) {
          if (resultado.destino) {
            reiniciarAlSalir();
            navegar(resultado.destino);
            return;
          }
          avisar("exito", resultado.mensaje, resultado.avisos);
          return;
        }
        const { deCampos, ajenos } = repartirErrores<CampoDeProyecto>(resultado.errores, CAMPOS_CON_ERROR_DE_PROYECTO);
        mostrarErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
      },
    );
  }

  return (
    <form
      ref={formulario}
      onSubmit={alEnviar}
      noValidate
      aria-label={esNuevo ? "Datos del nuevo proyecto" : "Datos del proyecto"}
    >
      <fieldset className="min-w-0">
        <legend className={LEYENDA}>Proyecto</legend>
        <div className={REJILLA}>
          <div className="sm:col-span-2">
            {esNuevo ? (
              <CampoSeleccion
                etiqueta="Club"
                name="clubId"
                required
                opciones={clubes}
                textoSinEleccion="Elige un club"
                value={valores.clubId}
                error={errores.clubId}
                ayuda="Solo clubes activos."
                onChange={(evento) => elegirClub(evento.target.value)}
              />
            ) : (
              <DatoFijo etiqueta="Club" valor={club?.texto ?? "Club"} ayuda="No se puede cambiar." />
            )}
          </div>
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Título"
              name="titulo"
              type="text"
              autoComplete="off"
              required
              maxLength={LIMITES_DE_PROYECTO.titulo}
              placeholder="Brazo robótico clasificador"
              value={valores.titulo}
              error={errores.titulo}
              ayuda="No puede repetirse con otro proyecto vigente del club."
              onChange={(evento) => cambiar("titulo", evento.target.value)}
            />
          </div>
          <CampoSeleccion
            etiqueta="Tipo"
            name="tipo"
            required
            opciones={OPCIONES_DE_TIPO_DE_PROYECTO}
            textoSinEleccion="Elige el tipo"
            value={valores.tipo}
            error={errores.tipo}
            onChange={(evento) => cambiar("tipo", evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Docente tutor"
            name="docenteId"
            required
            opciones={club?.docentes ?? []}
            textoSinEleccion={club ? "Elige al tutor" : "Elige primero el club"}
            disabled={!club}
            value={valores.docenteId}
            error={errores.docenteId}
            ayuda="Docente activo de la institución del club."
            onChange={(evento) => cambiar("docenteId", evento.target.value)}
          />
          <Campo
            etiqueta="Fecha de inicio"
            name="fechaInicio"
            type="date"
            required
            min={periodo?.inicio}
            max={periodo ? (periodo.fin < hoy ? periodo.fin : hoy) : hoy}
            className="cifras"
            value={valores.fechaInicio}
            error={errores.fechaInicio}
            ayuda={periodo ? `Período del club: ${fechaCorta(periodo.inicio)} al ${fechaCorta(periodo.fin)}.` : undefined}
            onChange={(evento) => cambiar("fechaInicio", evento.target.value)}
          />
          <Campo
            etiqueta="Fin previsto (opcional)"
            name="fechaFinPrevista"
            type="date"
            min={valores.fechaInicio || undefined}
            max={periodo?.fin}
            className="cifras"
            value={valores.fechaFinPrevista}
            error={errores.fechaFinPrevista}
            ayuda="No puede pasar del fin del período."
            onChange={(evento) => cambiar("fechaFinPrevista", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 min-w-0">
        <legend className={LEYENDA}>Propósito</legend>
        <div className="mt-4 flex flex-col gap-3">
          <CampoTextoLargo
            etiqueta="Objetivo"
            name="objetivo"
            rows={3}
            required
            maxLength={LIMITES_DE_PROYECTO.objetivo}
            value={valores.objetivo}
            error={errores.objetivo}
            ayuda="Qué problema resuelve o qué quieren lograr."
            onChange={(evento) => cambiar("objetivo", evento.target.value)}
          />
          <CampoTextoLargo
            etiqueta="Descripción (opcional)"
            name="descripcion"
            rows={4}
            maxLength={LIMITES_DE_PROYECTO.descripcion}
            value={valores.descripcion}
            error={errores.descripcion}
            ayuda="Materiales, tecnologías y alcance previsto."
            onChange={(evento) => cambiar("descripcion", evento.target.value)}
          />
        </div>
      </fieldset>

      <div className="mt-6">
        <SelectorDeEstudiantes
          etiqueta="Integrantes del equipo"
          candidatos={club?.integrantes ?? []}
          elegidos={integrantes}
          soloAutorizados={false}
          error={errorDeIntegrantes}
          textoVacio={club ? "El club no tiene integrantes activos." : "Elige primero el club para ver a sus integrantes."}
          ayuda={`Integrantes activos del club, hasta ${LIMITES_DE_PROYECTO.integrantes}. Llevas ${integrantes.length}.`}
          alCambiar={(ids) => {
            setIntegrantes(ids);
            setErrorDeIntegrantes(undefined);
          }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          {esNuevo ? <FolderPlus aria-hidden="true" size={16} /> : <Save aria-hidden="true" size={16} />}
          {esNuevo ? "Registrar proyecto" : "Guardar cambios"}
        </Boton>
        {esNuevo ? (
          <EnlaceBoton href={RUTA_PROYECTOS} variante="secundario">
            Cancelar
          </EnlaceBoton>
        ) : null}
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

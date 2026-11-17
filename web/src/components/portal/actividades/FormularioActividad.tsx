"use client";

import { CalendarClock, Save } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
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
import { actualizarActividad, crearActividad } from "@/lib/acciones/actividades";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { RUTA_ACTIVIDADES } from "@/lib/portal/filtros-actividades";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_CON_ERROR_DE_ACTIVIDAD,
  LIMITES_DE_ACTIVIDAD,
  esReprogramacion,
  validarActividad,
  type CampoDeActividad,
  type ContenidoElegible,
  type DatosDeActividad,
  type ErroresDeActividad,
  type HorarioOriginal,
  type OpcionDeClubParaActividad,
  type OpcionDeCursoParaActividad,
} from "@/lib/portal/reglas-actividades";
import { fechaCorta } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";
import { SelectorDeContenidos } from "./SelectorDeContenidos";

type Props = {
  actividadId: number | null;
  iniciales: DatosDeActividad;
  contenidosIniciales: number[];
  contenidos: ContenidoElegible[];
  clubes: OpcionDeClubParaActividad[] | null;
  clubFijo: OpcionDeClubParaActividad | null;
  cursos: OpcionDeCursoParaActividad[];
  responsables: OpcionDeFormulario[] | null;
  responsableActual: string;
  original: HorarioOriginal | null;
  bloqueado: boolean;
};

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";
const CAMPOS_VINCULADOS: readonly (readonly (keyof DatosDeActividad)[])[] = [
  ["horaInicio", "horaFin"],
  ["fecha", "motivoReprogramacion"],
  ["horaInicio", "motivoReprogramacion"],
  ["horaFin", "motivoReprogramacion"],
];

export function FormularioActividad({
  actividadId,
  iniciales,
  contenidosIniciales,
  contenidos,
  clubes,
  clubFijo,
  cursos,
  responsables,
  responsableActual,
  original,
  bloqueado,
}: Props) {
  const esNueva = actividadId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(
    iniciales,
    CAMPOS_VINCULADOS,
  );
  const [elegidos, setElegidos] = useState<number[]>(contenidosIniciales);
  const [errorDeContenidos, setErrorDeContenidos] = useState<string | undefined>();
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setElegidos(contenidosIniciales);
    setErrores({});
    setErrorDeContenidos(undefined);
  });

  const club = clubes ? (clubes.find((opcion) => opcion.valor === valores.clubId) ?? null) : clubFijo;
  const cursosDelClub = club ? cursos.filter((curso) => curso.clubId === club.valor) : [];
  const reprograma = esReprogramacion(valores, original);

  function elegirClub(valor: string) {
    cambiar("clubId", valor);
    if (valores.cursoId && !cursos.some((curso) => curso.valor === valores.cursoId && curso.clubId === valor)) {
      cambiar("cursoId", "");
    }
  }

  function mostrarErrores(encontrados: ErroresDeActividad) {
    const { contenidoIds, ...deCampos } = encontrados;
    setErrores(deCampos);
    setErrorDeContenidos(contenidoIds);
    enfocarPrimerInvalido(formulario.current);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente || bloqueado) {
      return;
    }

    const encontrados = validarActividad(valores, elegidos, original);
    if (hayErrores(encontrados)) {
      mostrarErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      return;
    }

    const datos = { ...valores, motivoReprogramacion: reprograma ? valores.motivoReprogramacion : "" };
    limpiarAviso();
    enviar(
      () => (esNueva ? crearActividad(datos, elegidos) : actualizarActividad(actividadId, datos, elegidos)),
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
        const { deCampos, ajenos } = repartirErrores<CampoDeActividad>(
          resultado.errores,
          esNueva
            ? CAMPOS_CON_ERROR_DE_ACTIVIDAD
            : CAMPOS_CON_ERROR_DE_ACTIVIDAD.filter((campo) => campo !== "clubId"),
        );
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
      aria-label={esNueva ? "Datos de la nueva actividad" : "Datos de la actividad"}
    >
      <fieldset disabled={bloqueado} className="min-w-0">
        <legend className={LEYENDA}>Sesión</legend>
        <div className={REJILLA}>
          <div className="sm:col-span-2">
            {clubes ? (
              <CampoSeleccion
                etiqueta="Club"
                name="clubId"
                required
                opciones={clubes}
                textoSinEleccion="Elige un club"
                value={valores.clubId}
                error={errores.clubId}
                ayuda="Solo aparecen los clubes planificados o activos."
                onChange={(evento) => elegirClub(evento.target.value)}
              />
            ) : (
              <DatoFijo etiqueta="Club" valor={clubFijo?.texto ?? "Club"} ayuda="No se puede cambiar." />
            )}
          </div>
          <div className="sm:col-span-2">
            <CampoSeleccion
              etiqueta="Curso (opcional)"
              name="cursoId"
              opciones={cursosDelClub}
              textoSinEleccion={club ? "Todo el club" : "Elige primero el club"}
              disabled={!club || cursosDelClub.length === 0}
              value={valores.cursoId}
              error={errores.cursoId}
              ayuda={
                club && cursosDelClub.length === 0
                  ? "Este club no tiene cursos abiertos: la sesión es para todos sus integrantes."
                  : "Si eliges un curso, la asistencia se toma solo a sus inscritos."
              }
              onChange={(evento) => cambiar("cursoId", evento.target.value)}
            />
          </div>
          <Campo
            etiqueta="Fecha"
            name="fecha"
            type="date"
            required
            className="cifras"
            value={valores.fecha}
            error={errores.fecha}
            onChange={(evento) => cambiar("fecha", evento.target.value)}
          />
          <Campo
            etiqueta="Lugar (opcional)"
            name="lugar"
            type="text"
            autoComplete="off"
            maxLength={LIMITES_DE_ACTIVIDAD.lugar}
            placeholder={club?.lugar || undefined}
            value={valores.lugar}
            error={errores.lugar}
            ayuda={club?.lugar ? `Si lo dejas vacío se usa ${club.lugar}.` : "Aula, laboratorio o espacio."}
            onChange={(evento) => cambiar("lugar", evento.target.value)}
          />
          <Campo
            etiqueta="Hora de inicio"
            name="horaInicio"
            type="time"
            required
            className="cifras"
            value={valores.horaInicio}
            error={errores.horaInicio}
            onChange={(evento) => cambiar("horaInicio", evento.target.value)}
          />
          <Campo
            etiqueta="Hora de fin"
            name="horaFin"
            type="time"
            required
            className="cifras"
            value={valores.horaFin}
            error={errores.horaFin}
            ayuda="Una sesión dura como máximo 8 horas."
            onChange={(evento) => cambiar("horaFin", evento.target.value)}
          />
          {esNueva ? null : (
            <div className="sm:col-span-2">
              {responsables ? (
                <CampoSeleccion
                  etiqueta="Docente responsable"
                  name="responsableId"
                  required
                  opciones={responsables}
                  textoSinEleccion="Elige un docente"
                  value={valores.responsableId}
                  error={errores.responsableId}
                  ayuda="Docente activo de la institución que dirige la sesión."
                  onChange={(evento) => cambiar("responsableId", evento.target.value)}
                />
              ) : (
                <DatoFijo
                  etiqueta="Docente responsable"
                  valor={responsableActual || "Docente del club"}
                  ayuda="Lo cambia el responsable institucional."
                />
              )}
            </div>
          )}
        </div>
      </fieldset>

      {reprograma ? (
        <fieldset disabled={bloqueado} className="entrada-mensaje mt-6 min-w-0 rounded-pieza bg-superficie p-4 sm:p-5">
          <legend className="sr-only">Reprogramación</legend>
          <p className="flex items-start gap-2 text-[0.9375rem]">
            <CalendarClock aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-aviso" />
            <span>
              Estás reprogramando la sesión del {fechaCorta(original?.fecha)}, de{" "}
              <span className="cifras">
                {original?.horaInicio} a {original?.horaFin}
              </span>
              . El cambio queda en su historial.
            </span>
          </p>
          <div className="mt-3">
            <CampoTextoLargo
              etiqueta="Motivo de la reprogramación"
              name="motivoReprogramacion"
              rows={2}
              required
              maxLength={LIMITES_DE_ACTIVIDAD.motivo}
              value={valores.motivoReprogramacion}
              error={errores.motivoReprogramacion}
              ayuda="Por ejemplo: feriado, evento institucional o falta del laboratorio."
              onChange={(evento) => cambiar("motivoReprogramacion", evento.target.value)}
            />
          </div>
        </fieldset>
      ) : null}

      <fieldset disabled={bloqueado} className="mt-8 min-w-0">
        <legend className={LEYENDA}>Contenido</legend>
        <div className="mt-4 flex flex-col gap-3">
          <Campo
            etiqueta="Tema"
            name="tema"
            type="text"
            autoComplete="off"
            required
            maxLength={LIMITES_DE_ACTIVIDAD.tema}
            value={valores.tema}
            error={errores.tema}
            onChange={(evento) => cambiar("tema", evento.target.value)}
          />
          <CampoTextoLargo
            etiqueta="Objetivo"
            name="objetivo"
            rows={3}
            required
            maxLength={LIMITES_DE_ACTIVIDAD.objetivo}
            value={valores.objetivo}
            error={errores.objetivo}
            ayuda="Qué deben lograr los estudiantes al terminar la sesión."
            onChange={(evento) => cambiar("objetivo", evento.target.value)}
          />
          <CampoTextoLargo
            etiqueta="Descripción (opcional)"
            name="descripcion"
            rows={3}
            maxLength={LIMITES_DE_ACTIVIDAD.descripcion}
            value={valores.descripcion}
            error={errores.descripcion}
            ayuda="Actividades previstas, materiales o retos."
            onChange={(evento) => cambiar("descripcion", evento.target.value)}
          />
          <SelectorDeContenidos
            etiqueta="Contenidos previstos (opcional)"
            contenidos={contenidos}
            elegidos={elegidos}
            error={errorDeContenidos}
            ayuda="Herramientas, lenguajes, componentes o competencias que se trabajarán."
            alCambiar={(ids) => {
              setElegidos(ids);
              setErrorDeContenidos(undefined);
            }}
          />
        </div>
      </fieldset>

      {bloqueado ? null : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
            {reprograma ? (
              <CalendarClock aria-hidden="true" size={16} />
            ) : (
              <Save aria-hidden="true" size={16} />
            )}
            {esNueva ? "Planificar actividad" : reprograma ? "Reprogramar" : "Guardar cambios"}
          </Boton>
          <EnlaceBoton href={RUTA_ACTIVIDADES} variante="secundario">
            {esNueva ? "Cancelar" : "Volver a la lista"}
          </EnlaceBoton>
        </div>
      )}
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

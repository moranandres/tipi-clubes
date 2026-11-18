"use client";

import { NotebookPen, Save } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
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
import { MENSAJE_CONTROL } from "@/components/ui/estilos-control";
import { actualizarAvance, registrarAvance } from "@/lib/acciones/avances";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  ALCANCES_DE_AVANCE,
  DESCRIPCIONES_DE_ALCANCE,
  NOMBRES_DE_ALCANCE,
  OPCIONES_DE_NIVEL_DE_LOGRO,
  RUTA_AVANCES,
} from "@/lib/portal/filtros-avances";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_CON_ERROR_DE_AVANCE,
  LIMITES_DE_AVANCE,
  validarAvance,
  type CampoDeAvance,
  type CompetenciaEvaluada,
  type DatosDeAvance,
  type ErroresDeAvance,
} from "@/lib/portal/reglas-avances";
import type { PeriodoDelClub } from "@/lib/portal/reglas-proyectos";
import { fechaCorta } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";

export type OpcionConFecha = OpcionDeFormulario & {
  fecha: string;
  nombre: string;
};

export type OpcionDeClubDeAvance = OpcionDeFormulario & {
  periodo: PeriodoDelClub | null;
  estudiantes: OpcionDeFormulario[];
  proyectos: OpcionConFecha[];
  actividades: OpcionConFecha[];
};

type Props = {
  avanceId: number | null;
  iniciales: DatosDeAvance;
  competenciasIniciales: CompetenciaEvaluada[];
  clubes: OpcionDeClubDeAvance[];
  sujetoFijo: string | null;
  catalogo: OpcionDeFormulario[];
  hoy: string;
};

const LEYENDA = "text-lg font-medium";
const OPCIONES_DE_ALCANCE = ALCANCES_DE_AVANCE.map((alcance) => ({ valor: alcance, texto: NOMBRES_DE_ALCANCE[alcance] }));
const CAMPOS_VINCULADOS: readonly (readonly (keyof DatosDeAvance)[])[] = [
  ["fecha", "actividadId"],
  ["fecha", "proyectoId"],
];

export function FormularioAvance({
  avanceId,
  iniciales,
  competenciasIniciales,
  clubes,
  sujetoFijo,
  catalogo,
  hoy,
}: Props) {
  const esNuevo = avanceId === null;
  const idCompetencias = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const [niveles, setNiveles] = useState<Record<number, string>>(() =>
    Object.fromEntries(competenciasIniciales.map((competencia) => [competencia.contenidoId, competencia.nivel])),
  );
  const [errorDeCompetencias, setErrorDeCompetencias] = useState<string | undefined>();
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setNiveles({});
    setErrores({});
    setErrorDeCompetencias(undefined);
  });

  const club = clubes.find((opcion) => opcion.valor === valores.clubId) ?? null;
  const proyecto = club?.proyectos.find((opcion) => opcion.valor === valores.proyectoId) ?? null;
  const actividad = club?.actividades.find((opcion) => opcion.valor === valores.actividadId) ?? null;
  const alcance = valores.alcance;
  const evaluadas: CompetenciaEvaluada[] = Object.entries(niveles)
    .filter(([, nivel]) => Boolean(nivel))
    .map(([contenidoId, nivel]) => ({ contenidoId: Number(contenidoId), nivel }));

  function elegirClub(valor: string) {
    cambiar("clubId", valor);
    cambiar("estudianteId", "");
    cambiar("proyectoId", "");
    cambiar("actividadId", "");
  }

  function elegirAlcance(valor: string) {
    cambiar("alcance", valor);
    if (valor !== "PROYECTO") {
      cambiar("porcentajeAvance", "");
    }
    if (valor !== "ESTUDIANTE") {
      setNiveles({});
      setErrorDeCompetencias(undefined);
    }
  }

  function mostrarErrores(encontrados: ErroresDeAvance) {
    const { competencias, ...deCampos } = encontrados;
    setErrores(deCampos);
    setErrorDeCompetencias(competencias);
    enfocarPrimerInvalido(formulario.current);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarAvance(valores, evaluadas, {
      periodo: club?.periodo ?? null,
      hoy,
      inicioDelProyecto: proyecto ? { titulo: proyecto.nombre, fecha: proyecto.fecha } : null,
      actividad: actividad ? { tema: actividad.nombre, fecha: actividad.fecha } : null,
      exigeFecha: !esNuevo,
    });
    if (hayErrores(encontrados)) {
      mostrarErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNuevo ? registrarAvance(valores, evaluadas) : actualizarAvance(avanceId, valores, evaluadas)),
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
        const { deCampos, ajenos } = repartirErrores<CampoDeAvance>(resultado.errores, CAMPOS_CON_ERROR_DE_AVANCE);
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
      aria-label={esNuevo ? "Datos del nuevo avance" : "Datos del avance"}
    >
      <fieldset className="min-w-0">
        <legend className={LEYENDA}>Sujeto del avance</legend>
        <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          {esNuevo ? (
            <>
              <CampoSeleccion
                etiqueta="Club"
                name="clubId"
                required
                opciones={clubes}
                textoSinEleccion="Elige un club"
                value={valores.clubId}
                error={errores.clubId}
                ayuda="Clubes activos o suspendidos de tu alcance."
                onChange={(evento) => elegirClub(evento.target.value)}
              />
              <CampoSeleccion
                etiqueta="Alcance"
                name="alcance"
                required
                opciones={OPCIONES_DE_ALCANCE}
                textoSinEleccion="Elige el alcance"
                value={alcance}
                error={errores.alcance}
                ayuda={alcance in DESCRIPCIONES_DE_ALCANCE ? DESCRIPCIONES_DE_ALCANCE[alcance as keyof typeof DESCRIPCIONES_DE_ALCANCE] : undefined}
                onChange={(evento) => elegirAlcance(evento.target.value)}
              />
              {alcance === "ESTUDIANTE" ? (
                <div className="sm:col-span-2">
                  <CampoSeleccion
                    etiqueta="Estudiante"
                    name="estudianteId"
                    required
                    opciones={club?.estudiantes ?? []}
                    textoSinEleccion={club ? "Elige al estudiante" : "Elige primero el club"}
                    disabled={!club}
                    value={valores.estudianteId}
                    error={errores.estudianteId}
                    ayuda="Integrantes activos del club."
                    onChange={(evento) => cambiar("estudianteId", evento.target.value)}
                  />
                </div>
              ) : null}
              {alcance === "PROYECTO" ? (
                <div className="sm:col-span-2">
                  <CampoSeleccion
                    etiqueta="Proyecto"
                    name="proyectoId"
                    required
                    opciones={club?.proyectos ?? []}
                    textoSinEleccion={club ? "Elige el proyecto" : "Elige primero el club"}
                    disabled={!club}
                    value={valores.proyectoId}
                    error={errores.proyectoId}
                    ayuda="Proyectos en desarrollo del club."
                    onChange={(evento) => cambiar("proyectoId", evento.target.value)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <DatoFijo etiqueta="Club" valor={club?.texto ?? "Club"} ayuda="No se puede cambiar." />
              <DatoFijo etiqueta={NOMBRES_DE_ALCANCE[alcance as keyof typeof NOMBRES_DE_ALCANCE] ?? "Sujeto"} valor={sujetoFijo ?? "—"} ayuda="No se puede cambiar." />
            </>
          )}
          <Campo
            etiqueta={esNuevo ? "Fecha (opcional)" : "Fecha"}
            name="fecha"
            type="date"
            required={!esNuevo}
            min={club?.periodo?.inicio}
            max={club?.periodo && club.periodo.fin < hoy ? club.periodo.fin : hoy}
            className="cifras"
            value={valores.fecha}
            error={errores.fecha}
            ayuda={esNuevo ? "Si la dejas vacía se usa la fecha de la sesión o la de hoy." : undefined}
            onChange={(evento) => cambiar("fecha", evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Sesión relacionada (opcional)"
            name="actividadId"
            opciones={club?.actividades ?? []}
            textoSinEleccion={club ? "Sin sesión" : "Elige primero el club"}
            disabled={!club}
            value={valores.actividadId}
            error={errores.actividadId}
            ayuda="Solo sesiones ejecutadas del club."
            onChange={(evento) => cambiar("actividadId", evento.target.value)}
          />
          {alcance === "PROYECTO" ? (
            <Campo
              etiqueta="Porcentaje de avance"
              name="porcentajeAvance"
              type="number"
              inputMode="numeric"
              required
              min={0}
              max={100}
              step={1}
              className="cifras"
              value={valores.porcentajeAvance}
              error={errores.porcentajeAvance}
              ayuda={proyecto ? `El proyecto empezó el ${fechaCorta(proyecto.fecha)}.` : "De 0 a 100."}
              onChange={(evento) => cambiar("porcentajeAvance", evento.target.value)}
            />
          ) : null}
        </div>
      </fieldset>

      <fieldset className="mt-6 min-w-0">
        <legend className={LEYENDA}>Resultados</legend>
        <div className="mt-4 flex flex-col gap-3">
          <CampoTextoLargo
            etiqueta="Resultados obtenidos"
            name="resultados"
            rows={4}
            required
            maxLength={LIMITES_DE_AVANCE.resultados}
            value={valores.resultados}
            error={errores.resultados}
            onChange={(evento) => cambiar("resultados", evento.target.value)}
          />
          <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
            <CampoTextoLargo
              etiqueta="Logros (opcional)"
              name="logros"
              rows={3}
              maxLength={LIMITES_DE_AVANCE.logros}
              value={valores.logros}
              error={errores.logros}
              onChange={(evento) => cambiar("logros", evento.target.value)}
            />
            <CampoTextoLargo
              etiqueta="Dificultades (opcional)"
              name="dificultades"
              rows={3}
              maxLength={LIMITES_DE_AVANCE.dificultades}
              value={valores.dificultades}
              error={errores.dificultades}
              onChange={(evento) => cambiar("dificultades", evento.target.value)}
            />
          </div>
          <CampoTextoLargo
            etiqueta="Próximos pasos (opcional)"
            name="proximosPasos"
            rows={2}
            maxLength={LIMITES_DE_AVANCE.proximosPasos}
            value={valores.proximosPasos}
            error={errores.proximosPasos}
            onChange={(evento) => cambiar("proximosPasos", evento.target.value)}
          />
        </div>
      </fieldset>

      {alcance === "ESTUDIANTE" ? (
        <fieldset className="mt-6 min-w-0" aria-describedby={idCompetencias}>
          <legend className={LEYENDA}>Competencias evaluadas (opcional)</legend>
          {catalogo.length === 0 ? (
            <p className="mt-2 text-[0.9375rem] text-tenue">El catálogo no tiene competencias activas para evaluar.</p>
          ) : (
            <div className="mt-4 grid gap-x-5 sm:grid-cols-2 xl:grid-cols-3">
              {catalogo.map((competencia) => (
                <CampoSeleccion
                  key={competencia.valor}
                  etiqueta={competencia.texto}
                  name={`competencia-${competencia.valor}`}
                  opciones={OPCIONES_DE_NIVEL_DE_LOGRO}
                  textoSinEleccion="Sin evaluar"
                  aria-invalid={errorDeCompetencias && competencia === catalogo[0] ? true : undefined}
                  value={niveles[Number(competencia.valor)] ?? ""}
                  onChange={(evento) => {
                    const nivel = evento.target.value;
                    setNiveles((previos) => ({ ...previos, [Number(competencia.valor)]: nivel }));
                    setErrorDeCompetencias(undefined);
                  }}
                />
              ))}
            </div>
          )}
          <p id={idCompetencias} className={`${MENSAJE_CONTROL} ${errorDeCompetencias ? "text-error" : "text-tenue"}`}>
            {errorDeCompetencias ? (
              <span role="alert" className="entrada-mensaje inline-block">
                {errorDeCompetencias}
              </span>
            ) : (
              `Evalúa hasta ${LIMITES_DE_AVANCE.competencias} competencias. Llevas ${evaluadas.length}.`
            )}
          </p>
        </fieldset>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          {esNuevo ? <NotebookPen aria-hidden="true" size={16} /> : <Save aria-hidden="true" size={16} />}
          {esNuevo ? "Registrar avance" : "Guardar cambios"}
        </Boton>
        {esNuevo ? (
          <EnlaceBoton href={RUTA_AVANCES} variante="secundario">
            Cancelar
          </EnlaceBoton>
        ) : null}
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

"use client";

import { CheckCheck, MessageSquarePlus, PencilLine, Save } from "lucide-react";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { CONTROL, MENSAJE_CONTROL } from "@/components/ui/estilos-control";
import { registrarAsistencia } from "@/lib/acciones/asistencia";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  ESTADOS_DE_ASISTENCIA,
  NOMBRES_DE_ESTADO_DE_ASISTENCIA,
  PUNTOS_DE_ESTADO_DE_ASISTENCIA,
  type EstadoAsistencia,
} from "@/lib/portal/filtros-asistencia";
import {
  CAMPO_DE_MOTIVO,
  LIMITES_DE_ASISTENCIA,
  contarCorrecciones,
  contarEstados,
  hayProblemas,
  validarPlanilla,
  type RegistroEnPlanilla,
} from "@/lib/portal/reglas-asistencia";
import { ConteoDePlanilla } from "./ConteoDePlanilla";

export type FilaVisible = {
  estudianteId: number;
  principal: string;
  codigo: string | null;
  estado: EstadoAsistencia | null;
  observacion: string;
  corregida: boolean;
};

type Props = {
  actividadId: number;
  filas: FilaVisible[];
};

const SEGMENTO =
  "flex h-10 cursor-pointer select-none items-center justify-center gap-1.5 rounded-[8px] px-2 text-sm font-medium text-tenue transition-[transform,background-color,color] duration-150 ease-salida hover:bg-superficie-alta hover:text-tinta active:scale-[0.97] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento";

const MARCADO: Record<EstadoAsistencia, string> = {
  PRESENTE: "peer-checked:bg-exito/15 peer-checked:text-exito",
  ATRASADO: "peer-checked:bg-aviso/15 peer-checked:text-aviso",
  AUSENTE: "peer-checked:bg-error/15 peer-checked:text-error",
  JUSTIFICADO: "peer-checked:bg-acento/15 peer-checked:text-acento",
};

function registroDe(fila: FilaVisible): RegistroEnPlanilla {
  return { estudianteId: fila.estudianteId, estado: fila.estado, observacion: fila.observacion };
}

export function PlanillaDeAsistencia({ actividadId, filas }: Props) {
  const id = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [registros, setRegistros] = useState<RegistroEnPlanilla[]>(() => filas.map(registroDe));
  const [abiertos, setAbiertos] = useState<Set<number>>(() => new Set());
  const [errores, setErrores] = useState<Record<number, string>>({});
  const [motivo, setMotivo] = useState("");
  const [errorDeMotivo, setErrorDeMotivo] = useState<string | undefined>();
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  const originales = useMemo(
    () => new Map(filas.map((fila) => [fila.estudianteId, registroDe(fila)])),
    [filas],
  );
  const conteo = contarEstados(registros);
  const correcciones = contarCorrecciones(registros, originales);

  function actualizar(estudianteId: number, cambios: Partial<RegistroEnPlanilla>) {
    setRegistros((previos) =>
      previos.map((registro) =>
        registro.estudianteId === estudianteId ? { ...registro, ...cambios } : registro,
      ),
    );
    setErrores((previos) => {
      if (!previos[estudianteId]) {
        return previos;
      }
      const siguientes = { ...previos };
      delete siguientes[estudianteId];
      return siguientes;
    });
  }

  function marcarPendientes() {
    setRegistros((previos) =>
      previos.map((registro) => (registro.estado ? registro : { ...registro, estado: "PRESENTE" })),
    );
  }

  function abrirObservacion(estudianteId: number) {
    setAbiertos((previos) => new Set(previos).add(estudianteId));
    requestAnimationFrame(() => {
      document.getElementById(`${id}-observacion-${estudianteId}`)?.focus();
    });
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const validacion = validarPlanilla(registros, originales, motivo);
    if (hayProblemas(validacion)) {
      setErrores(validacion.porEstudiante);
      setErrorDeMotivo(validacion.motivo);
      setAbiertos((previos) => {
        const siguientes = new Set(previos);
        for (const clave of Object.keys(validacion.porEstudiante)) {
          siguientes.add(Number(clave));
        }
        return siguientes;
      });
      avisar("error", validacion.general ?? MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () =>
        registrarAsistencia(
          actividadId,
          registros.filter((registro) => registro.estado),
          correcciones > 0 ? motivo : "",
        ),
      (resultado) => {
        if (resultado.ok) {
          setMotivo("");
          setErrorDeMotivo(undefined);
          avisar("exito", resultado.mensaje, resultado.avisos);
          return;
        }
        const { [CAMPO_DE_MOTIVO]: deMotivo, ...otros } = resultado.errores;
        setErrorDeMotivo(deMotivo);
        avisar("error", resultado.mensaje, Object.values(otros));
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  const filaPorId = new Map(filas.map((fila) => [fila.estudianteId, fila]));

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-label="Planilla de asistencia">
      <ConteoDePlanilla conteo={conteo} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.9375rem] text-tenue">
          Marca a cada integrante. Justificado pide una observación con el motivo.
        </p>
        <Boton
          variante="secundario"
          textoCargando=""
          disabled={conteo.pendientes === 0 || pendiente}
          onClick={marcarPendientes}
          className="shrink-0"
        >
          <CheckCheck aria-hidden="true" size={16} />
          Presentes los que faltan
        </Boton>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {registros.map((registro) => {
          const fila = filaPorId.get(registro.estudianteId);
          if (!fila) {
            return null;
          }
          const error = errores[registro.estudianteId];
          const original = originales.get(registro.estudianteId);
          const cambiado =
            Boolean(original?.estado) &&
            (original?.estado !== registro.estado ||
              original?.observacion.trim() !== registro.observacion.trim());
          const conObservacion =
            abiertos.has(registro.estudianteId) ||
            registro.estado === "JUSTIFICADO" ||
            registro.observacion !== "";
          const idNombre = `${id}-nombre-${registro.estudianteId}`;
          const idObservacion = `${id}-observacion-${registro.estudianteId}`;
          const idMensaje = `${idObservacion}-mensaje`;
          return (
            <li
              key={registro.estudianteId}
              className={`rounded-pieza bg-superficie p-4 transition-[box-shadow] duration-150 ease-salida ${
                error ? "ring-1 ring-error" : ""
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <p id={idNombre} className={`break-words font-medium ${fila.codigo ? "" : "cifras"}`}>
                    {fila.principal}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tenue">
                    {fila.codigo ? <span className="cifras">{fila.codigo}</span> : null}
                    {!original?.estado ? <span>Sin registrar</span> : null}
                    {cambiado ? (
                      <span className="inline-flex items-center gap-1 text-aviso">
                        <PencilLine aria-hidden="true" size={14} />
                        Corrección sin guardar
                      </span>
                    ) : fila.corregida ? (
                      <span>Corregida</span>
                    ) : null}
                  </p>
                </div>
                <div
                  role="radiogroup"
                  aria-labelledby={idNombre}
                  className="grid grid-cols-2 gap-1 rounded-control bg-fondo/60 p-1 sm:grid-cols-4"
                >
                  {ESTADOS_DE_ASISTENCIA.map((estado) => {
                    const idOpcion = `${id}-${registro.estudianteId}-${estado}`;
                    return (
                      <div key={estado} className="min-w-0">
                        <input
                          id={idOpcion}
                          type="radio"
                          name={`estado-${registro.estudianteId}`}
                          value={estado}
                          checked={registro.estado === estado}
                          onChange={() => actualizar(registro.estudianteId, { estado })}
                          className="peer sr-only"
                        />
                        <label htmlFor={idOpcion} className={`${SEGMENTO} ${MARCADO[estado]}`}>
                          <span
                            aria-hidden="true"
                            className={`size-1.5 shrink-0 rounded-full ${PUNTOS_DE_ESTADO_DE_ASISTENCIA[estado]}`}
                          />
                          <span className="truncate">{NOMBRES_DE_ESTADO_DE_ASISTENCIA[estado]}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
              {conObservacion ? (
                <div className="entrada-mensaje mt-3">
                  <label htmlFor={idObservacion} className="sr-only">
                    Observación de {fila.principal}
                  </label>
                  <input
                    id={idObservacion}
                    type="text"
                    autoComplete="off"
                    maxLength={LIMITES_DE_ASISTENCIA.observacion}
                    placeholder={
                      registro.estado === "JUSTIFICADO"
                        ? "Motivo de la justificación"
                        : "Observación (opcional)"
                    }
                    value={registro.observacion}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={idMensaje}
                    onChange={(evento) => actualizar(registro.estudianteId, { observacion: evento.target.value })}
                    className={`${CONTROL} h-11`}
                  />
                  <p id={idMensaje} className={`${MENSAJE_CONTROL} ${error ? "text-error" : "text-tenue"}`}>
                    {error ? <span className="entrada-mensaje inline-block">{error}</span> : null}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => abrirObservacion(registro.estudianteId)}
                  className="mt-2 inline-flex h-9 select-none items-center gap-1.5 rounded-[8px] px-2 text-sm font-medium text-tenue transition-[transform,background-color,color] duration-150 ease-salida hover:bg-superficie-alta hover:text-tinta active:scale-[0.97]"
                >
                  <MessageSquarePlus aria-hidden="true" size={16} />
                  Agregar observación
                  <span className="sr-only"> a {fila.principal}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {correcciones > 0 ? (
        <div className="entrada-mensaje mt-6 rounded-pieza border border-linea p-4 sm:p-5">
          <CampoTextoLargo
            etiqueta="Motivo de la corrección"
            name={CAMPO_DE_MOTIVO}
            rows={2}
            required
            maxLength={LIMITES_DE_ASISTENCIA.motivo}
            value={motivo}
            error={errorDeMotivo}
            ayuda={`Vas a corregir la asistencia ya registrada de ${correcciones === 1 ? "1 estudiante" : `${correcciones} estudiantes`}. El motivo queda en el historial de correcciones.`}
            onChange={(evento) => {
              setMotivo(evento.target.value);
              setErrorDeMotivo(undefined);
            }}
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
          <Save aria-hidden="true" size={16} />
          {correcciones > 0 ? "Guardar corrección" : "Guardar asistencia"}
        </Boton>
        <p className="cifras text-sm text-tenue" aria-live="polite">
          {conteo.pendientes === 0
            ? "Todos los integrantes tienen asistencia marcada."
            : `${conteo.pendientes} sin marcar: no se guardan hasta que elijas su estado.`}
        </p>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

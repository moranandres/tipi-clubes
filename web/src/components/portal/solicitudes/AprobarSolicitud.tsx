"use client";

import { CircleCheck, CircleX, LoaderCircle, ShieldCheck } from "lucide-react";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  aprobarSolicitud,
  consultarVerificacion,
  type VerificacionConsultada,
} from "@/lib/acciones/solicitudes";
import { NIVELES_DE_CURSO, NOMBRES_DE_NIVEL } from "@/lib/portal/filtros-cursos";
import type { OpcionDeCurso } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_APROBACION,
  LIMITES_DE_SOLICITUD,
  SOBRECUPO_AUTORIZADO,
  validarAprobacion,
  type CampoDeAprobacion,
  type DatosDeAprobacion,
} from "@/lib/portal/reglas-solicitudes";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  solicitudId: number;
  iniciales: DatosDeAprobacion;
  cursos: OpcionDeCurso[] | null;
  verificacionInicial: VerificacionConsultada;
  puedeSobrecupo: boolean;
  destino: string;
};

const OPCIONES_DE_NIVEL = NIVELES_DE_CURSO.map((nivel) => ({
  valor: nivel,
  texto: NOMBRES_DE_NIVEL[nivel],
}));

const CAMPOS_VINCULADOS: readonly (readonly CampoDeAprobacion[])[] = [
  ["autorizarSobrecupo", "observacion"],
  ["nivelAsignado", "cursoId"],
];

function Controles({
  verificacion,
  verificando,
}: {
  verificacion: VerificacionConsultada;
  verificando: boolean;
}) {
  if (!verificacion.ok) {
    return <p className="mt-3 text-sm text-aviso">{verificacion.mensaje}</p>;
  }

  return (
    <ul className={`mt-3 flex flex-col gap-2.5 transition-opacity duration-150 ease-salida ${verificando ? "opacity-55" : ""}`}>
      {verificacion.controles.map((control) => (
        <li key={control.regla} className="flex items-start gap-2.5 text-sm">
          {control.cumple ? (
            <CircleCheck aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-exito" />
          ) : (
            <CircleX aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-error" />
          )}
          <span className="min-w-0">
            <span className="font-medium">
              {control.regla}
              <span className="sr-only">{control.cumple ? ": cumple" : ": no cumple"}</span>
            </span>
            <span className="block break-words text-tenue">{control.detalle}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AprobarSolicitud({
  solicitudId,
  iniciales,
  cursos,
  verificacionInicial,
  puedeSobrecupo,
  destino,
}: Props) {
  const idTitulo = useId();
  const idRequisitos = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const consulta = useRef(0);
  const { valores, errores, cambiar, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const [verificacion, setVerificacion] = useState(verificacionInicial);
  const [verificando, iniciarVerificacion] = useTransition();

  const opcionesDeCurso = (cursos ?? []).filter(
    (curso) => !valores.nivelAsignado || curso.nivel === valores.nivelAsignado,
  );
  const sobrecupo = valores.autorizarSobrecupo === SOBRECUPO_AUTORIZADO;
  const pendientes = verificacion.ok
    ? verificacion.controles.filter((control) => !control.cumple).length
    : 0;

  function verificar(cursoId: string, nivel: string) {
    consulta.current += 1;
    const turno = consulta.current;
    iniciarVerificacion(async () => {
      const nueva = await consultarVerificacion(solicitudId, cursoId, nivel).catch(() => null);
      if (turno !== consulta.current) {
        return;
      }
      setVerificacion(
        nueva ?? {
          ok: false,
          mensaje: "No pudimos volver a verificar los requisitos. El servidor los comprobará al aprobar.",
        },
      );
    });
  }

  function alElegirNivel(nivel: string) {
    cambiar("nivelAsignado", nivel);
    const actual = (cursos ?? []).find((curso) => curso.valor === valores.cursoId);
    const cursoId = actual && actual.nivel !== nivel ? "" : valores.cursoId;
    if (cursoId !== valores.cursoId) {
      cambiar("cursoId", "");
    }
    verificar(cursoId, nivel);
  }

  function alElegirCurso(cursoId: string) {
    cambiar("cursoId", cursoId);
    verificar(cursoId, valores.nivelAsignado);
  }

  function ayudaDeCurso(): string {
    if (cursos === null) {
      return "No pudimos cargar los cursos del club; puedes aprobar solo el ingreso al club.";
    }
    if (opcionesDeCurso.length === 0) {
      return "No hay cursos abiertos de este nivel; se aprueba solo el ingreso al club.";
    }
    return "El curso debe ser del nivel asignado. Déjalo vacío para aprobar solo el club.";
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarAprobacion(valores);
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => aprobarSolicitud(solicitudId, valores),
      (resultado) => {
        if (resultado.ok) {
          navegar(destino);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_APROBACION);
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
        verificar(valores.cursoId, valores.nivelAsignado);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        Paso 2: verificar y aprobar
      </h2>

      <div aria-labelledby={idRequisitos} role="region" aria-live="polite" className="mt-3">
        <p id={idRequisitos} className="flex items-center gap-2 text-[0.9375rem] font-medium">
          Requisitos
          {verificando ? (
            <LoaderCircle
              aria-hidden="true"
              size={14}
              className="animate-spin text-tenue [animation-duration:600ms]"
            />
          ) : null}
        </p>
        <Controles verificacion={verificacion} verificando={verificando} />
        {pendientes > 0 && !verificando ? (
          <p className="mt-3 text-sm text-aviso">
            {pendientes === 1
              ? "Hay 1 requisito sin cumplir: el servidor rechazará la aprobación hasta resolverlo."
              : `Hay ${pendientes} requisitos sin cumplir: el servidor rechazará la aprobación hasta resolverlos.`}
          </p>
        ) : null}
      </div>

      <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-5 flex flex-col gap-y-3">
        <CampoSeleccion
          etiqueta="Nivel asignado"
          name="nivelAsignado"
          required
          opciones={OPCIONES_DE_NIVEL}
          textoSinEleccion="Elige el nivel"
          value={valores.nivelAsignado}
          error={errores.nivelAsignado}
          onChange={(evento) => alElegirNivel(evento.target.value)}
        />
        <CampoSeleccion
          etiqueta="Curso asignado (opcional)"
          name="cursoId"
          disabled={opcionesDeCurso.length === 0}
          opciones={opcionesDeCurso}
          textoSinEleccion="Solo el club"
          value={valores.cursoId}
          error={errores.cursoId}
          ayuda={ayudaDeCurso()}
          onChange={(evento) => alElegirCurso(evento.target.value)}
        />
        {puedeSobrecupo ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-control bg-superficie p-3.5">
            <input
              type="checkbox"
              name="autorizarSobrecupo"
              checked={sobrecupo}
              onChange={(evento) =>
                cambiar("autorizarSobrecupo", evento.target.checked ? SOBRECUPO_AUTORIZADO : "")
              }
              className="mt-0.5 size-[1.125rem] shrink-0 accent-acento"
            />
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-medium">Autorizar sobrecupo</span>
              <span className="mt-0.5 block text-sm text-tenue">
                Solo si el club o el curso ya no tiene cupos. Debes justificarlo en la observación.
              </span>
            </span>
          </label>
        ) : null}
        <CampoTextoLargo
          etiqueta={sobrecupo ? "Observación" : "Observación (opcional)"}
          name="observacion"
          rows={3}
          required={sobrecupo}
          maxLength={LIMITES_DE_SOLICITUD.observacion}
          value={valores.observacion}
          error={errores.observacion}
          ayuda={
            sobrecupo
              ? "Obligatoria: explica por qué se autoriza el sobrecupo."
              : "Queda registrada con la resolución."
          }
          onChange={(evento) => cambiar("observacion", evento.target.value)}
        />
        <Boton type="submit" cargando={pendiente} textoCargando="Aprobando" className="w-full">
          <ShieldCheck aria-hidden="true" size={16} />
          Aprobar solicitud
        </Boton>
      </form>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}

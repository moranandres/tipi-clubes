"use client";

import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useAlOcultar,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { eliminarHorario, guardarHorario } from "@/lib/acciones/cursos";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  CAMPOS_DE_HORARIO,
  NOMBRES_DE_TIPO_DE_SESION,
  cruceDeHorario,
  tiposDeSesionPara,
  validarHorario,
  type CampoDeHorario,
  type DatosDeHorario,
  type TipoSesion,
} from "@/lib/portal/reglas-cursos";
import { OPCIONES_DE_DIA, horaCorta, nombreDeDia } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";

type Horario = {
  id?: number;
  diaSemana?: number;
  horaInicio?: string;
  horaFin?: string;
  duracionMinutos?: number;
  tipoSesion?: TipoSesion;
};

type Props = {
  cursoId: number;
  horarios: Horario[];
  modalidad?: string;
  editable: boolean;
  enCurso: boolean;
};

const CAMPOS_VINCULADOS: readonly (readonly CampoDeHorario[])[] = [CAMPOS_DE_HORARIO];

const FORMATO_HORAS = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 });

function duracionDe(horario: Horario): string {
  return typeof horario.duracionMinutos === "number"
    ? `${FORMATO_HORAS.format(horario.duracionMinutos / 60)} h`
    : "";
}

function resumenDe(horario: Horario): string {
  return `${nombreDeDia(horario.diaSemana)}, ${horaCorta(horario.horaInicio)} a ${horaCorta(horario.horaFin)}`;
}

export function HorariosDelCurso({ cursoId, horarios, modalidad, editable, enCurso }: Props) {
  const idTitulo = useId();
  const idFormulario = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const tipos = tiposDeSesionPara(modalidad);
  const tipoPorDefecto = tipos.length === 1 ? tipos[0] : "";
  const vacios: DatosDeHorario = {
    diaSemana: "",
    horaInicio: "",
    horaFin: "",
    tipoSesion: tipoPorDefecto,
  };

  const { valores, errores, cambiar, setValores, setErrores } = useCampos(vacios, CAMPOS_VINCULADOS);
  const guardado = useEnvio();
  const borrado = useEnvio();
  const [enEdicion, setEnEdicion] = useState<number | null>(null);
  const [porEliminar, setPorEliminar] = useState<number | null>(null);

  useAlOcultar(() => setPorEliminar(null));

  const ocupado = guardado.pendiente || borrado.pendiente;
  const unicoHorario = enCurso && horarios.length === 1;
  const tipoElegido = tipos.includes(valores.tipoSesion as TipoSesion)
    ? valores.tipoSesion
    : tipoPorDefecto;

  function editar(horario: Horario) {
    if (!horario.id || ocupado) {
      return;
    }
    if (enEdicion === horario.id) {
      cancelarEdicion();
      return;
    }
    setEnEdicion(horario.id);
    setPorEliminar(null);
    setErrores({});
    guardado.limpiarAviso();
    setValores({
      diaSemana: horario.diaSemana ? String(horario.diaSemana) : "",
      horaInicio: horaCorta(horario.horaInicio),
      horaFin: horaCorta(horario.horaFin),
      tipoSesion: horario.tipoSesion ?? tipoPorDefecto,
    });
    requestAnimationFrame(() => {
      formulario.current?.querySelector<HTMLElement>("select, input")?.focus();
    });
  }

  function cancelarEdicion() {
    setEnEdicion(null);
    setErrores({});
    setValores(vacios);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado) {
      return;
    }

    const datos = { ...valores, tipoSesion: tipoElegido };
    const otros = horarios.filter((horario) => horario.id !== enEdicion);
    const encontrados = validarHorario(datos, { modalidad, otros });
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      guardado.avisar("error", cruceDeHorario(datos, otros) ?? MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    guardado.limpiarAviso();
    borrado.limpiarAviso();
    guardado.enviar(
      () => guardarHorario(cursoId, enEdicion, datos),
      (resultado) => {
        if (resultado.ok) {
          setEnEdicion(null);
          setValores(vacios);
          guardado.avisar("exito", resultado.mensaje, resultado.avisos);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(resultado.errores, CAMPOS_DE_HORARIO);
        const conflicto = deCampos.horaInicio;
        setErrores(conflicto ? { ...deCampos, horaInicio: "Se cruza con otro horario." } : deCampos);
        guardado.avisar("error", conflicto ?? resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  function confirmarEliminacion(horario: Horario) {
    if (!horario.id || ocupado) {
      return;
    }
    const id = horario.id;
    borrado.limpiarAviso();
    guardado.limpiarAviso();
    borrado.enviar(
      () => eliminarHorario(cursoId, id),
      (resultado) => {
        setPorEliminar(null);
        if (resultado.ok) {
          if (enEdicion === id) {
            cancelarEdicion();
          }
          borrado.avisar("exito", resultado.mensaje);
          return;
        }
        borrado.avisar("error", resultado.mensaje);
      },
    );
  }

  return (
    <section aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="text-lg font-medium">
        Horario semanal
      </h2>
      <p className="mt-1.5 text-[0.9375rem] text-tenue">
        {editable
          ? "Cada bloque es una sesión que se repite todas las semanas mientras dura el curso."
          : "Los horarios de un curso finalizado o cancelado no se pueden modificar."}
      </p>

      {horarios.length === 0 ? (
        <p className="mt-4 rounded-pieza bg-superficie px-4 py-3.5 text-[0.9375rem] text-tenue">
          Este curso todavía no tiene horarios. Necesita al menos uno para poder iniciar.
        </p>
      ) : (
        <ul className="mt-4 rounded-pieza bg-superficie">
          {horarios.map((horario) => {
            const editando = enEdicion === horario.id;
            const confirmando = porEliminar === horario.id;
            return (
              <li
                key={horario.id}
                className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-b border-linea px-4 py-2.5 last:border-b-0"
              >
                <p className="cifras min-w-0 flex-1 basis-56 text-[0.9375rem]">
                  <span className="font-medium">{resumenDe(horario)}</span>
                  <span className="text-tenue">
                    {" · "}
                    {horario.tipoSesion ? NOMBRES_DE_TIPO_DE_SESION[horario.tipoSesion] : "Sin tipo"}
                    {duracionDe(horario) ? ` · ${duracionDe(horario)}` : ""}
                  </span>
                </p>
                {editable ? (
                  confirmando ? (
                    <div
                      role="group"
                      aria-label={`Confirmar la eliminación del horario ${resumenDe(horario)}`}
                      className="flex items-center gap-2"
                    >
                      <span className="text-sm text-tenue">¿Eliminar?</span>
                      <Boton
                        variante="peligro"
                        tamano="compacto"
                        cargando={borrado.pendiente}
                        textoCargando="Eliminando"
                        onClick={() => confirmarEliminacion(horario)}
                      >
                        Sí, eliminar
                      </Boton>
                      <Boton
                        variante="elevado"
                        tamano="compacto"
                        disabled={borrado.pendiente}
                        onClick={() => setPorEliminar(null)}
                      >
                        No
                      </Boton>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Boton
                        variante="elevado"
                        tamano="compacto"
                        aria-pressed={editando}
                        disabled={ocupado}
                        onClick={() => editar(horario)}
                      >
                        <Pencil aria-hidden="true" size={14} />
                        {editando ? "Editando" : "Editar"}
                        <span className="sr-only"> el horario {resumenDe(horario)}</span>
                      </Boton>
                      <Boton
                        variante="peligro"
                        tamano="compacto"
                        disabled={ocupado || unicoHorario}
                        title={
                          unicoHorario
                            ? "Un curso en marcha debe conservar al menos un horario."
                            : undefined
                        }
                        onClick={() => setPorEliminar(horario.id ?? null)}
                      >
                        <Trash2 aria-hidden="true" size={14} />
                        Eliminar
                        <span className="sr-only"> el horario {resumenDe(horario)}</span>
                      </Boton>
                    </div>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {unicoHorario && editable ? (
        <p className="mt-2 text-sm text-tenue">
          Un curso en marcha debe conservar al menos un horario. Agrega otro antes de eliminar este.
        </p>
      ) : null}
      <ZonaDeAviso aviso={borrado.aviso} className="mt-3" />

      {editable ? (
        <form
          ref={formulario}
          onSubmit={alEnviar}
          noValidate
          aria-labelledby={idFormulario}
          className="mt-3"
        >
          <h3 id={idFormulario} className="font-medium">
            {enEdicion ? "Editar horario" : "Agregar horario"}
          </h3>
          <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
            <CampoSeleccion
              etiqueta="Día"
              name="diaSemana"
              required
              opciones={OPCIONES_DE_DIA}
              textoSinEleccion="Elige un día"
              value={valores.diaSemana}
              error={errores.diaSemana}
              onChange={(evento) => cambiar("diaSemana", evento.target.value)}
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
              onChange={(evento) => cambiar("horaFin", evento.target.value)}
            />
            <CampoSeleccion
              etiqueta="Tipo de sesión"
              name="tipoSesion"
              required
              opciones={tipos.map((tipo) => ({
                valor: tipo,
                texto: NOMBRES_DE_TIPO_DE_SESION[tipo],
              }))}
              textoSinEleccion="Elige un tipo"
              value={tipoElegido}
              error={errores.tipoSesion}
              onChange={(evento) => cambiar("tipoSesion", evento.target.value)}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Boton
              type="submit"
              variante="secundario"
              cargando={guardado.pendiente}
              textoCargando="Guardando"
            >
              {enEdicion ? (
                <Save aria-hidden="true" size={16} />
              ) : (
                <Plus aria-hidden="true" size={16} />
              )}
              {enEdicion ? "Guardar horario" : "Agregar horario"}
            </Boton>
            {enEdicion ? (
              <Boton variante="secundario" disabled={guardado.pendiente} onClick={cancelarEdicion}>
                Cancelar edición
              </Boton>
            ) : null}
          </div>
          <ZonaDeAviso aviso={guardado.aviso} className="mt-3" />
        </form>
      ) : null}
    </section>
  );
}

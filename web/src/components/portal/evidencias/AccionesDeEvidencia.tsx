"use client";

import { Archive, PencilLine, Save } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
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
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { actualizarEvidencia, retirarEvidencia } from "@/lib/acciones/evidencias";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import type { TipoEvidencia } from "@/lib/portal/filtros-evidencias";
import {
  CAMPOS_CON_ERROR_DE_EVIDENCIA,
  FORMA_ARCHIVO,
  LIMITES_DE_EVIDENCIA,
  MARCA_AFIRMATIVA,
  relacionaEstudiantes,
  validarEvidencia,
  type CampoDeEvidencia,
  type DatosDeEvidencia,
  type ErroresDeEvidencia,
} from "@/lib/portal/reglas-evidencias";
import { hoyEnGuayaquil } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";
import { SelectorDeEstudiantes, type CandidatoDeEvidencia } from "./SelectorDeEstudiantes";

type Props = {
  evidenciaId: number;
  tipo: TipoEvidencia;
  titulo: string;
  descripcion: string;
  fechaEvidencia: string;
  fechaActividad: string;
  sinEstudiantes: boolean;
  estudianteIds: number[];
  candidatos: CandidatoDeEvidencia[];
};

type Modo = "cerrado" | "editar" | "retirar";

export function AccionesDeEvidencia({
  evidenciaId,
  tipo,
  titulo,
  descripcion,
  fechaEvidencia,
  fechaActividad,
  sinEstudiantes,
  estudianteIds,
  candidatos,
}: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const iniciales: DatosDeEvidencia = {
    tipo,
    forma: FORMA_ARCHIVO,
    titulo,
    descripcion,
    fechaEvidencia,
    url: "",
    sinEstudiantes: sinEstudiantes ? MARCA_AFIRMATIVA : "",
  };
  const [modo, setModo] = useState<Modo>("cerrado");
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales);
  const [estudiantes, setEstudiantes] = useState<number[]>(estudianteIds);
  const [errorDeEstudiantes, setErrorDeEstudiantes] = useState<string | undefined>();
  const [motivo, setMotivo] = useState("");
  const [errorDeMotivo, setErrorDeMotivo] = useState<string | undefined>();
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => setModo("cerrado"));

  const esFotografia = tipo === "FOTOGRAFIA";
  const sinIdentificables = esFotografia && valores.sinEstudiantes === MARCA_AFIRMATIVA;
  const autorizados = new Set([
    ...candidatos.filter((candidato) => candidato.autorizado).map((candidato) => candidato.id),
    ...estudianteIds,
  ]);

  function abrir(siguiente: Modo) {
    limpiarAviso();
    setValores(iniciales);
    setErrores({});
    setEstudiantes(estudianteIds);
    setErrorDeEstudiantes(undefined);
    setMotivo("");
    setErrorDeMotivo(undefined);
    setModo(siguiente);
    requestAnimationFrame(() => formulario.current?.querySelector<HTMLElement>("input, textarea")?.focus());
  }

  function mostrarErrores(encontrados: ErroresDeEvidencia) {
    const { estudianteIds: deEstudiantes, ...deCampos } = encontrados;
    setErrores(deCampos);
    setErrorDeEstudiantes(deEstudiantes);
    enfocarPrimerInvalido(formulario.current);
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }
    const encontrados = validarEvidencia(valores, relacionaEstudiantes(tipo) ? estudiantes : [], null, {
      esNueva: false,
      fechaActividad,
      hoy: hoyEnGuayaquil(),
      autorizados,
    });
    if (hayErrores(encontrados)) {
      mostrarErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      return;
    }
    limpiarAviso();
    enviar(
      () => actualizarEvidencia(evidenciaId, tipo, valores, sinIdentificables ? [] : estudiantes),
      (resultado) => {
        if (resultado.ok) {
          setModo("cerrado");
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores<CampoDeEvidencia>(
          resultado.errores,
          CAMPOS_CON_ERROR_DE_EVIDENCIA,
        );
        mostrarErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
      },
    );
  }

  function retirar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }
    if (!motivo.trim()) {
      setErrorDeMotivo("Escribe el motivo del retiro.");
      enfocarPrimerInvalido(formulario.current);
      return;
    }
    limpiarAviso();
    enviar(
      () => retirarEvidencia(evidenciaId, motivo),
      (resultado) => {
        if (resultado.ok) {
          setModo("cerrado");
          avisar("exito", resultado.mensaje);
          return;
        }
        setErrorDeMotivo(resultado.errores.motivo);
        avisar("error", resultado.mensaje);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  if (modo === "editar") {
    return (
      <form ref={formulario} onSubmit={guardar} noValidate className="entrada-mensaje flex flex-col gap-3">
        <Campo
          etiqueta="Título"
          name="titulo"
          type="text"
          autoComplete="off"
          required
          maxLength={LIMITES_DE_EVIDENCIA.titulo}
          value={valores.titulo}
          error={errores.titulo}
          onChange={(evento) => cambiar("titulo", evento.target.value)}
        />
        <CampoTextoLargo
          etiqueta="Descripción"
          name="descripcion"
          rows={3}
          required
          maxLength={LIMITES_DE_EVIDENCIA.descripcion}
          value={valores.descripcion}
          error={errores.descripcion}
          onChange={(evento) => cambiar("descripcion", evento.target.value)}
        />
        <Campo
          etiqueta="Fecha"
          name="fechaEvidencia"
          type="date"
          required
          className="cifras"
          min={fechaActividad}
          max={hoyEnGuayaquil()}
          value={valores.fechaEvidencia}
          error={errores.fechaEvidencia}
          onChange={(evento) => cambiar("fechaEvidencia", evento.target.value)}
        />
        {esFotografia ? (
          <div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem]">
              <input
                type="checkbox"
                checked={sinIdentificables}
                onChange={(evento) => {
                  cambiar("sinEstudiantes", evento.target.checked ? MARCA_AFIRMATIVA : "");
                  setErrorDeEstudiantes(undefined);
                  if (evento.target.checked) {
                    setEstudiantes([]);
                  }
                }}
                className="size-4 accent-acento"
              />
              No aparecen estudiantes identificables
            </label>
          </div>
        ) : null}
        {relacionaEstudiantes(tipo) && !sinIdentificables ? (
          <SelectorDeEstudiantes
            etiqueta={esFotografia ? "Estudiantes que aparecen" : "Estudiantes autores (opcional)"}
            candidatos={candidatos}
            elegidos={estudiantes}
            soloAutorizados={esFotografia}
            error={errorDeEstudiantes}
            ayuda={
              esFotografia
                ? "Solo puedes agregar a quienes tienen otorgada la autorización de uso de imagen."
                : "Integrantes que elaboraron el producto."
            }
            alCambiar={(ids) => {
              setEstudiantes(ids);
              setErrorDeEstudiantes(undefined);
            }}
          />
        ) : null}
        <div className="flex gap-2">
          <Boton type="submit" cargando={pendiente} textoCargando="Guardando" className="flex-1 sm:flex-none">
            <Save aria-hidden="true" size={16} />
            Guardar cambios
          </Boton>
          <Boton
            variante="secundario"
            textoCargando=""
            disabled={pendiente}
            className="flex-1 sm:flex-none"
            onClick={() => setModo("cerrado")}
          >
            Volver
          </Boton>
        </div>
        <ZonaDeAviso aviso={aviso} />
      </form>
    );
  }

  if (modo === "retirar") {
    return (
      <form ref={formulario} onSubmit={retirar} noValidate className="entrada-mensaje">
        <CampoTextoLargo
          etiqueta="Motivo del retiro"
          name="motivo"
          rows={2}
          required
          maxLength={LIMITES_DE_EVIDENCIA.motivo}
          value={motivo}
          error={errorDeMotivo}
          ayuda="El archivo se elimina del repositorio y el registro queda en el historial con este motivo."
          onChange={(evento) => {
            setMotivo(evento.target.value);
            setErrorDeMotivo(undefined);
          }}
        />
        <div className="mt-2 flex gap-2">
          <Boton type="submit" variante="peligro" cargando={pendiente} textoCargando="Retirando" className="flex-1 sm:flex-none">
            Sí, retirar
          </Boton>
          <Boton
            variante="secundario"
            textoCargando=""
            disabled={pendiente}
            className="flex-1 sm:flex-none"
            onClick={() => setModo("cerrado")}
          >
            Volver
          </Boton>
        </div>
        <ZonaDeAviso aviso={aviso} className="mt-3" />
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Boton variante="secundario" tamano="compacto" textoCargando="" onClick={() => abrir("editar")}>
          <PencilLine aria-hidden="true" size={16} />
          Editar
          <span className="sr-only"> {titulo}</span>
        </Boton>
        <Boton variante="peligro" tamano="compacto" textoCargando="" onClick={() => abrir("retirar")}>
          <Archive aria-hidden="true" size={16} />
          Retirar
          <span className="sr-only"> {titulo}</span>
        </Boton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </div>
  );
}

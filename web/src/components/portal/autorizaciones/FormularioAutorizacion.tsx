"use client";

import { Info, Save } from "lucide-react";
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
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { ETIQUETA_CONTROL, MENSAJE_CONTROL } from "@/components/ui/estilos-control";
import { guardarAutorizacion } from "@/lib/acciones/autorizaciones";
import { MENSAJE_REVISAR_CAMPOS, type ResultadoDeAccion } from "@/lib/acciones/resultado";
import {
  OPCIONES_DE_PARENTESCO,
  type TipoAutorizacion,
} from "@/lib/portal/filtros-autorizaciones";
import {
  ESTADOS_DE_AUTORIZACION,
  NOMBRES_DE_AUTORIZACION,
  PUNTOS_DE_AUTORIZACION,
  type EstadoAutorizacion,
} from "@/lib/portal/filtros-estudiantes";
import {
  CAMPOS_CON_ERROR,
  CAMPOS_DE_AUTORIZACION,
  LONGITUD_DE_CEDULA,
  LONGITUD_MAXIMA_DE_CORREO,
  LONGITUD_MAXIMA_DE_OBSERVACION,
  LONGITUD_MAXIMA_DE_TELEFONO,
  bloqueoDeTransicion,
  validarAutorizacion,
  type CampoDeAutorizacion,
  type DatosDeAutorizacion,
} from "@/lib/portal/reglas-autorizaciones";
import { LONGITUD_MAXIMA_DE_NOMBRE } from "@/lib/portal/reglas-estudiantes";
import { hayErrores } from "@/lib/portal/validacion";
import { SelectorDeDocumento } from "./SelectorDeDocumento";

type Props = {
  estudianteId: number;
  tipo: TipoAutorizacion;
  estadoActual: EstadoAutorizacion;
  tieneDocumento: boolean;
  documentoTrasRevocacion: boolean;
  iniciales: DatosDeAutorizacion;
  copiadoDe: string | null;
  hoy: string;
  rutaDeVuelta: string;
  textoDeVuelta: string;
};

type CampoDeTexto = keyof DatosDeAutorizacion;

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2";
const SOLO_DIGITOS = /\D/g;

const FICHA =
  "flex w-full cursor-pointer select-none items-start gap-3 rounded-control border p-3.5 transition-[transform,background-color,border-color,opacity] duration-150 ease-salida active:scale-[0.98] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento has-[:disabled]:cursor-not-allowed has-[:disabled]:active:scale-100";

const DESCRIPCIONES_DE_ESTADO: Record<EstadoAutorizacion, string> = {
  PENDIENTE: "El representante todavía no entrega el documento firmado.",
  OTORGADA: "El representante firmó y entregó el documento, que queda como respaldo.",
  NO_OTORGADA: "El representante decidió no autorizar.",
  REVOCADA: "El representante retiró una autorización que había otorgado. Exige el motivo.",
};

const BLOQUEO_DE_REVOCACION = "Solo se revoca una autorización que estuvo otorgada.";
const BLOQUEO_TRAS_OTORGAR = "No disponible: una autorización otorgada solo puede revocarse.";

const CONSECUENCIAS: Record<TipoAutorizacion, Partial<Record<EstadoAutorizacion, string>>> = {
  PARTICIPACION: {
    NO_OTORGADA: "Sin esta autorización no se puede aprobar su inscripción a un club.",
    REVOCADA: "Si integra algún club, tendrás que tramitar su retiro.",
  },
  USO_IMAGEN: {
    NO_OTORGADA: "No se podrán publicar fotografías ni videos en los que aparezca.",
    REVOCADA: "Desde ahora no se podrán publicar fotografías ni videos en los que aparezca.",
  },
};

function limpiarDigitos(valor: string, longitud: number): string {
  return valor.replace(SOLO_DIGITOS, "").slice(0, longitud);
}

export function FormularioAutorizacion({
  estudianteId,
  tipo,
  estadoActual,
  tieneDocumento,
  documentoTrasRevocacion,
  iniciales,
  copiadoDe,
  hoy,
  rutaDeVuelta,
  textoDeVuelta,
}: Props) {
  const idEstados = useId();
  const idMensajeEstado = `${idEstados}-mensaje`;
  const formulario = useRef<HTMLFormElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorDeArchivo, setErrorDeArchivo] = useState<string | undefined>();
  const { valores, errores, cambiar, setErrores } = useCampos(iniciales);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => {
    setArchivo(null);
    setErrorDeArchivo(undefined);
  });

  const estado = valores.estado as EstadoAutorizacion;
  const otorgando = estado === "OTORGADA";
  const revocando = estado === "REVOCADA";
  const exigeDocumentoNuevo =
    otorgando && (!tieneDocumento || (estadoActual === "REVOCADA" && !documentoTrasRevocacion));
  const consecuencia = CONSECUENCIAS[tipo][estado];

  function contexto() {
    return { estadoActual, tieneDocumento, documentoTrasRevocacion, archivoNuevo: archivo !== null };
  }

  function validarAlSalir(campo: "cedula" | "telefono") {
    if (!valores[campo]) {
      return;
    }
    const encontrado = validarAutorizacion(valores, contexto())[campo];
    if (encontrado) {
      setErrores((previos) => ({ ...previos, [campo]: encontrado }));
    }
  }

  function elegirArchivo(elegido: File | null, problema?: string) {
    setArchivo(elegido);
    setErrorDeArchivo(problema);
  }

  function alTerminar(resultado: ResultadoDeAccion) {
    if (resultado.ok) {
      setArchivo(null);
      setErrorDeArchivo(undefined);
      setErrores({});
      avisar("exito", resultado.mensaje, resultado.avisos);
      return;
    }

    const { deCampos, ajenos } = repartirErrores<CampoDeAutorizacion>(
      resultado.errores,
      CAMPOS_CON_ERROR,
    );
    const { archivo: problemaDeArchivo, ...deTexto } = deCampos;
    setErrores(deTexto);
    setErrorDeArchivo(problemaDeArchivo);
    avisar("error", resultado.mensaje, ajenos);
    enfocarPrimerInvalido(formulario.current);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const { archivo: problemaDeArchivo, ...encontrados } = validarAutorizacion(valores, contexto());
    if (hayErrores(encontrados) || problemaDeArchivo || errorDeArchivo) {
      setErrores(encontrados);
      setErrorDeArchivo(problemaDeArchivo ?? errorDeArchivo);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    const datos = new FormData();
    for (const campo of CAMPOS_DE_AUTORIZACION) {
      datos.set(campo, valores[campo]);
    }
    if (archivo) {
      datos.set("archivo", archivo, archivo.name);
    }

    limpiarAviso();
    enviar(() => guardarAutorizacion(estudianteId, tipo, datos), alTerminar);
  }

  function cambiarTexto(campo: CampoDeTexto, valor: string) {
    cambiar(campo, valor);
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-label="Registro de la autorización">
      <fieldset disabled={pendiente} className="min-w-0">
        <legend className={LEYENDA}>Representante legal</legend>
        {copiadoDe ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-tenue">
            <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-acento" />
            <span className="min-w-0">
              Copiamos los datos del representante registrado en la autorización de{" "}
              {copiadoDe.toLowerCase()}. Revísalos antes de guardar.
            </span>
          </p>
        ) : null}
        <div className={REJILLA}>
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
            onChange={(evento) => cambiarTexto("nombres", evento.target.value)}
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
            onChange={(evento) => cambiarTexto("apellidos", evento.target.value)}
          />
          <Campo
            etiqueta="Cédula"
            name="cedula"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            value={valores.cedula}
            error={errores.cedula}
            ayuda="10 dígitos. Se comprueba el dígito verificador."
            onChange={(evento) =>
              cambiarTexto("cedula", limpiarDigitos(evento.target.value, LONGITUD_DE_CEDULA))
            }
            onBlur={() => validarAlSalir("cedula")}
          />
          <CampoSeleccion
            etiqueta="Parentesco"
            name="parentesco"
            required
            opciones={OPCIONES_DE_PARENTESCO}
            textoSinEleccion="Elige el parentesco"
            value={valores.parentesco}
            error={errores.parentesco}
            onChange={(evento) => cambiarTexto("parentesco", evento.target.value)}
          />
          <Campo
            etiqueta="Teléfono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            required
            value={valores.telefono}
            error={errores.telefono}
            ayuda="Celular 09… o fijo con código de provincia."
            onChange={(evento) =>
              cambiarTexto("telefono", limpiarDigitos(evento.target.value, LONGITUD_MAXIMA_DE_TELEFONO))
            }
            onBlur={() => validarAlSalir("telefono")}
          />
          <Campo
            etiqueta="Correo (opcional)"
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            maxLength={LONGITUD_MAXIMA_DE_CORREO}
            value={valores.correo}
            error={errores.correo}
            onChange={(evento) => cambiarTexto("correo", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset disabled={pendiente} className="mt-8 min-w-0">
        <legend className={LEYENDA}>Estado de la autorización</legend>
        <div
          role="radiogroup"
          aria-labelledby={idEstados}
          aria-describedby={idMensajeEstado}
          aria-invalid={errores.estado ? true : undefined}
          tabIndex={-1}
          className="mt-4 outline-none"
        >
          <p id={idEstados} className={ETIQUETA_CONTROL}>
            ¿Qué decidió el representante?
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ESTADOS_DE_AUTORIZACION.map((opcion) => {
              const bloqueo = bloqueoDeTransicion(estadoActual, opcion);
              const marcada = estado === opcion;
              return (
                <label
                  key={opcion}
                  className={`${FICHA} ${
                    marcada
                      ? "border-acento bg-superficie-alta"
                      : bloqueo
                        ? "border-transparent bg-superficie opacity-70"
                        : "border-transparent bg-superficie hover:bg-superficie-alta"
                  }`}
                >
                  <input
                    type="radio"
                    name="estado"
                    value={opcion}
                    checked={marcada}
                    disabled={Boolean(bloqueo)}
                    onChange={() => cambiarTexto("estado", opcion)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${PUNTOS_DE_AUTORIZACION[opcion]}`}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {NOMBRES_DE_AUTORIZACION[opcion]}
                      {opcion === estadoActual ? (
                        <span className="font-normal text-tenue"> · actual</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-sm text-tenue">
                      {bloqueo
                        ? opcion === "REVOCADA"
                          ? BLOQUEO_DE_REVOCACION
                          : BLOQUEO_TRAS_OTORGAR
                        : DESCRIPCIONES_DE_ESTADO[opcion]}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <p
            id={idMensajeEstado}
            className={`${MENSAJE_CONTROL} ${errores.estado ? "text-error" : "text-aviso"}`}
          >
            {errores.estado ? (
              <span role="alert" className="entrada-mensaje inline-block">
                {errores.estado}
              </span>
            ) : consecuencia && estado !== estadoActual ? (
              <span className="entrada-mensaje inline-block">{consecuencia}</span>
            ) : null}
          </p>
        </div>

        <div className="mt-2">
          <SelectorDeDocumento
            etiqueta={exigeDocumentoNuevo ? "Documento firmado" : "Documento firmado (opcional)"}
            archivo={archivo}
            error={errorDeArchivo}
            reemplaza={tieneDocumento}
            deshabilitado={pendiente}
            alElegir={elegirArchivo}
          />
        </div>

        <div className={REJILLA}>
          <Campo
            etiqueta={otorgando ? "Fecha de firma" : "Fecha de firma (opcional)"}
            name="fechaRegistro"
            type="date"
            max={hoy}
            required={otorgando}
            value={valores.fechaRegistro}
            error={errores.fechaRegistro}
            ayuda="La que consta en el documento firmado."
            onChange={(evento) => cambiarTexto("fechaRegistro", evento.target.value)}
          />
          <div className="sm:col-span-2">
            <CampoTextoLargo
              etiqueta={revocando ? "Motivo de la revocación" : "Observación (opcional)"}
              name="observacion"
              rows={3}
              required={revocando}
              maxLength={LONGITUD_MAXIMA_DE_OBSERVACION}
              value={valores.observacion}
              error={errores.observacion}
              ayuda={`Queda registrada en la auditoría. Hasta ${LONGITUD_MAXIMA_DE_OBSERVACION} caracteres.`}
              onChange={(evento) => cambiarTexto("observacion", evento.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando={archivo ? "Cargando documento" : "Guardando"}>
          <Save aria-hidden="true" size={16} />
          Guardar autorización
        </Boton>
        <EnlaceBoton href={rutaDeVuelta} variante="secundario">
          {textoDeVuelta}
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

"use client";

import { Upload } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { SelectorDeDocumento, type FormatosDeArchivo } from "@/components/portal/autorizaciones/SelectorDeDocumento";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { ETIQUETA_CONTROL, MENSAJE_CONTROL } from "@/components/ui/estilos-control";
import { registrarEvidencia } from "@/lib/acciones/evidencias";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  DESCRIPCIONES_DE_TIPO_DE_EVIDENCIA,
  NOMBRES_DE_TIPO_DE_EVIDENCIA,
  TIPOS_DE_EVIDENCIA,
  type TipoEvidencia,
} from "@/lib/portal/filtros-evidencias";
import {
  CAMPOS_CON_ERROR_DE_EVIDENCIA,
  FORMA_ARCHIVO,
  FORMA_ENLACE,
  LIMITES_DE_EVIDENCIA,
  LONGITUD_DE_FIRMA,
  MARCA_AFIRMATIVA,
  aceptaDe,
  errorDeArchivoDeEvidencia,
  errorDeFirma,
  esTipoDeEvidencia,
  relacionaEstudiantes,
  textoDeFormatosDe,
  usaArchivo,
  usaEnlace,
  validarEvidencia,
  type CampoDeEvidencia,
  type DatosDeEvidencia,
  type ErroresDeEvidencia,
} from "@/lib/portal/reglas-evidencias";
import { fechaCorta, hoyEnGuayaquil } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";
import { SelectorDeEstudiantes, type CandidatoDeEvidencia } from "./SelectorDeEstudiantes";

type Props = {
  actividadId: number;
  fechaActividad: string;
  candidatos: CandidatoDeEvidencia[];
};

const INICIALES: DatosDeEvidencia = {
  tipo: "FOTOGRAFIA",
  forma: FORMA_ARCHIVO,
  titulo: "",
  descripcion: "",
  fechaEvidencia: "",
  url: "",
  sinEstudiantes: "",
};

const FICHA =
  "flex h-full cursor-pointer select-none flex-col rounded-control border p-3 transition-[transform,background-color,border-color] duration-150 ease-salida active:scale-[0.98] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento";

function formatosPara(tipo: TipoEvidencia): FormatosDeArchivo {
  return {
    acepta: aceptaDe(tipo),
    texto: textoDeFormatosDe(tipo),
    revisar: async (archivo) => {
      const error = errorDeArchivoDeEvidencia(tipo, {
        nombre: archivo.name,
        tipo: archivo.type,
        tamano: archivo.size,
      });
      if (error) {
        return error;
      }
      try {
        return errorDeFirma(tipo, new Uint8Array(await archivo.slice(0, LONGITUD_DE_FIRMA).arrayBuffer()));
      } catch {
        return "No se pudo leer el archivo. Vuelve a elegirlo.";
      }
    },
  };
}

export function FormularioEvidencia({ actividadId, fechaActividad, candidatos }: Props) {
  const id = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(INICIALES);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorDeArchivo, setErrorDeArchivo] = useState<string | undefined>();
  const [estudiantes, setEstudiantes] = useState<number[]>([]);
  const [errorDeEstudiantes, setErrorDeEstudiantes] = useState<string | undefined>();
  const [version, setVersion] = useState(0);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  const tipo: TipoEvidencia = esTipoDeEvidencia(valores.tipo) ? valores.tipo : "FOTOGRAFIA";
  const conArchivo = usaArchivo(tipo, valores.forma);
  const conEnlace = usaEnlace(tipo, valores.forma);
  const conEstudiantes = relacionaEstudiantes(tipo);
  const esFotografia = tipo === "FOTOGRAFIA";
  const sinEstudiantes = esFotografia && valores.sinEstudiantes === MARCA_AFIRMATIVA;
  const autorizados = new Set(candidatos.filter((candidato) => candidato.autorizado).map((candidato) => candidato.id));

  function elegirTipo(siguiente: TipoEvidencia) {
    cambiar("tipo", siguiente);
    setArchivo(null);
    setErrorDeArchivo(undefined);
    setErrorDeEstudiantes(undefined);
    setVersion((previa) => previa + 1);
    if (!relacionaEstudiantes(siguiente)) {
      setEstudiantes([]);
    } else if (siguiente === "FOTOGRAFIA") {
      setEstudiantes((previos) => previos.filter((estudianteId) => autorizados.has(estudianteId)));
    }
  }

  function mostrarErrores(encontrados: ErroresDeEvidencia) {
    const { archivo: deArchivo, estudianteIds, ...deCampos } = encontrados;
    setErrores(deCampos);
    setErrorDeArchivo(deArchivo);
    setErrorDeEstudiantes(estudianteIds);
    enfocarPrimerInvalido(formulario.current);
  }

  function reiniciar() {
    setValores({ ...INICIALES, tipo: valores.tipo });
    setErrores({});
    setArchivo(null);
    setErrorDeArchivo(undefined);
    setEstudiantes([]);
    setErrorDeEstudiantes(undefined);
    setVersion((previa) => previa + 1);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarEvidencia(
      valores,
      conEstudiantes ? estudiantes : [],
      archivo ? { nombre: archivo.name, tipo: archivo.type, tamano: archivo.size } : null,
      { esNueva: true, fechaActividad, hoy: hoyEnGuayaquil(), autorizados },
    );
    if (errorDeArchivo && conArchivo && !archivo) {
      encontrados.archivo = errorDeArchivo;
    }
    if (hayErrores(encontrados)) {
      mostrarErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      return;
    }

    const datos = new FormData();
    for (const [campo, valor] of Object.entries(valores)) {
      datos.set(campo, valor);
    }
    if (conEstudiantes && !sinEstudiantes) {
      for (const estudianteId of estudiantes) {
        datos.append("estudianteIds", String(estudianteId));
      }
    }
    if (conArchivo && archivo) {
      datos.set("archivo", archivo, archivo.name);
    }

    limpiarAviso();
    enviar(
      () => registrarEvidencia(actividadId, datos),
      (resultado) => {
        if (resultado.ok) {
          reiniciar();
          avisar("exito", resultado.mensaje, resultado.avisos);
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

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-label="Nueva evidencia" className="flex flex-col gap-4">
      <fieldset className="min-w-0">
        <legend className={ETIQUETA_CONTROL}>Tipo de evidencia</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {TIPOS_DE_EVIDENCIA.map((opcion) => {
            const idOpcion = `${id}-tipo-${opcion}`;
            const marcada = tipo === opcion;
            return (
              <div key={opcion} className="min-w-0">
                <input
                  id={idOpcion}
                  type="radio"
                  name="tipo"
                  value={opcion}
                  checked={marcada}
                  onChange={() => elegirTipo(opcion)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={idOpcion}
                  className={`${FICHA} ${
                    marcada ? "border-acento bg-superficie-alta" : "border-transparent bg-superficie hover:bg-superficie-alta"
                  }`}
                >
                  <span className="font-medium">{NOMBRES_DE_TIPO_DE_EVIDENCIA[opcion]}</span>
                  <span className="mt-0.5 text-sm text-tenue">{DESCRIPCIONES_DE_TIPO_DE_EVIDENCIA[opcion]}</span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      {tipo === "PRODUCTO" ? (
        <fieldset className="entrada-mensaje min-w-0">
          <legend className={ETIQUETA_CONTROL}>¿Cómo entregas el producto?</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {[
              { valor: FORMA_ARCHIVO, texto: "Archivo PDF" },
              { valor: FORMA_ENLACE, texto: "Enlace web" },
            ].map((forma) => (
              <label key={forma.valor} className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem]">
                <input
                  type="radio"
                  name="forma"
                  value={forma.valor}
                  checked={valores.forma === forma.valor}
                  onChange={() => {
                    cambiar("forma", forma.valor);
                    setErrorDeArchivo(undefined);
                  }}
                  className="size-4 accent-acento"
                />
                {forma.texto}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

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
        ayuda="Qué muestra y en qué momento de la sesión se obtuvo."
        onChange={(evento) => cambiar("descripcion", evento.target.value)}
      />
      <Campo
        etiqueta="Fecha (opcional)"
        name="fechaEvidencia"
        type="date"
        className="cifras"
        min={fechaActividad}
        max={hoyEnGuayaquil()}
        value={valores.fechaEvidencia}
        error={errores.fechaEvidencia}
        ayuda={`Si la dejas vacía se usa la fecha de la sesión, ${fechaCorta(fechaActividad)}.`}
        onChange={(evento) => cambiar("fechaEvidencia", evento.target.value)}
      />

      {conArchivo ? (
        <SelectorDeDocumento
          key={`${tipo}-${version}`}
          etiqueta="Archivo"
          archivo={archivo}
          error={errorDeArchivo}
          reemplaza={false}
          deshabilitado={pendiente}
          formatos={formatosPara(tipo)}
          ayuda={`${textoDeFormatosDe(tipo)}. Las fotos se limpian de metadatos al guardarlas.`}
          alElegir={(elegido, problema) => {
            setArchivo(elegido);
            setErrorDeArchivo(problema);
          }}
        />
      ) : null}

      {conEnlace ? (
        <Campo
          etiqueta="Enlace"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={LIMITES_DE_EVIDENCIA.url}
          placeholder="https://"
          value={valores.url}
          error={errores.url}
          ayuda="Video, repositorio o publicación accesible para el equipo del proyecto."
          onChange={(evento) => cambiar("url", evento.target.value)}
        />
      ) : null}

      {esFotografia ? (
        <div>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.9375rem]">
            <input
              type="checkbox"
              checked={sinEstudiantes}
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
          <p className={`${MENSAJE_CONTROL} text-tenue`}>
            Por ejemplo, una foto de los robots o de las manos trabajando.
          </p>
        </div>
      ) : null}

      {conEstudiantes && !sinEstudiantes ? (
        <SelectorDeEstudiantes
          etiqueta={esFotografia ? "Estudiantes que aparecen" : "Estudiantes autores (opcional)"}
          candidatos={candidatos}
          elegidos={estudiantes}
          soloAutorizados={esFotografia}
          error={errorDeEstudiantes}
          ayuda={
            esFotografia
              ? "Solo se pueden elegir quienes tienen otorgada la autorización de uso de imagen."
              : "Integrantes que elaboraron el producto."
          }
          alCambiar={(ids) => {
            setEstudiantes(ids);
            setErrorDeEstudiantes(undefined);
          }}
        />
      ) : null}

      <div>
        <Boton type="submit" cargando={pendiente} textoCargando="Subiendo">
          <Upload aria-hidden="true" size={16} />
          Registrar evidencia
        </Boton>
      </div>
      <ZonaDeAviso aviso={aviso} />
    </form>
  );
}

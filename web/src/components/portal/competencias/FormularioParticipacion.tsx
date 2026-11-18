"use client";

import { Trophy } from "lucide-react";
import { useRef, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  repartirErrores,
  useCampos,
  useEnvio,
  useReinicioTrasCrear,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { CampoSeleccion } from "@/components/ui/CampoSeleccion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { registrarParticipacion } from "@/lib/acciones/competencias";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { RUTA_COMPETENCIAS } from "@/lib/portal/filtros-competencias";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_PARTICIPACION,
  validarParticipacion,
  type CampoDeParticipacion,
  type DatosDeParticipacion,
} from "@/lib/portal/reglas-competencias";
import { hayErrores } from "@/lib/portal/validacion";
import { CamposDeResultado } from "./CamposDeResultado";

export type OpcionDeIntegrante = OpcionDeFormulario & {
  clubId: string;
  autorizado: boolean | null;
};

export type OpcionDeEdicion = OpcionDeFormulario & {
  inicio: string | null;
};

export type OpcionDeCompetencia = OpcionDeFormulario & {
  ediciones: OpcionDeEdicion[];
  categorias: OpcionDeFormulario[];
};

type Props = {
  iniciales: DatosDeParticipacion;
  clubes: OpcionDeFormulario[];
  integrantes: OpcionDeIntegrante[];
  competencias: OpcionDeCompetencia[];
  hoy: string;
};

const LEYENDA = "text-lg font-medium";
const CAMPOS_VINCULADOS: readonly (readonly CampoDeParticipacion[])[] = [
  ["edicionId", "puesto", "reconocimiento"],
  ["puesto", "reconocimiento"],
];

export function FormularioParticipacion({ iniciales, clubes, integrantes, competencias, hoy }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
  });

  const delClub = integrantes.filter((integrante) => integrante.clubId === valores.clubId);
  const integrante = delClub.find((opcion) => opcion.valor === valores.inscripcionId) ?? null;
  const competencia = competencias.find((opcion) => opcion.valor === valores.competenciaId) ?? null;
  const edicion = competencia?.ediciones.find((opcion) => opcion.valor === valores.edicionId) ?? null;
  const inicioPendiente = edicion?.inicio && edicion.inicio > hoy ? edicion.inicio : null;
  const sinAutorizacion = delClub.filter((opcion) => opcion.autorizado === false).length;

  function elegirClub(valor: string) {
    cambiar("clubId", valor);
    cambiar("inscripcionId", "");
  }

  function elegirCompetencia(valor: string) {
    cambiar("competenciaId", valor);
    cambiar("edicionId", "");
    cambiar("categoriaId", "");
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = validarParticipacion(valores, {
      inicioDeEdicion: edicion?.inicio ?? null,
      hoy,
      anterior: null,
      autorizado: integrante?.autorizado ?? null,
    });
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => registrarParticipacion(valores),
      (resultado) => {
        if (resultado.ok && resultado.destino) {
          reiniciarAlSalir();
          navegar(resultado.destino);
          return;
        }
        if (resultado.ok) {
          avisar("exito", resultado.mensaje, resultado.avisos);
          return;
        }
        const { deCampos, ajenos } = repartirErrores<CampoDeParticipacion>(
          resultado.errores,
          CAMPOS_DE_PARTICIPACION,
        );
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-label="Datos de la participación">
      <fieldset className="min-w-0">
        <legend className={LEYENDA}>Estudiante</legend>
        <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <CampoSeleccion
            etiqueta="Club"
            name="clubId"
            required
            opciones={clubes}
            textoSinEleccion="Elige un club"
            value={valores.clubId}
            error={errores.clubId}
            ayuda="Clubes planificados o activos con integrantes."
            onChange={(evento) => elegirClub(evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Integrante"
            name="inscripcionId"
            required
            opciones={delClub}
            textoSinEleccion={valores.clubId ? "Elige al estudiante" : "Elige primero el club"}
            disabled={!valores.clubId}
            value={valores.inscripcionId}
            error={errores.inscripcionId}
            ayuda={
              sinAutorizacion > 0
                ? `${sinAutorizacion} ${sinAutorizacion === 1 ? "integrante no tiene" : "integrantes no tienen"} la autorización de participación otorgada.`
                : "Solo integrantes activos del club."
            }
            onChange={(evento) => cambiar("inscripcionId", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 min-w-0">
        <legend className={LEYENDA}>Competencia</legend>
        <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <CampoSeleccion
              etiqueta="Competencia"
              name="competenciaId"
              required
              opciones={competencias}
              textoSinEleccion="Elige la competencia"
              value={valores.competenciaId}
              error={errores.competenciaId}
              ayuda="Solo competencias activas con ediciones y categorías disponibles."
              onChange={(evento) => elegirCompetencia(evento.target.value)}
            />
          </div>
          <CampoSeleccion
            etiqueta="Edición"
            name="edicionId"
            required
            opciones={competencia?.ediciones ?? []}
            textoSinEleccion={competencia ? "Elige la edición" : "Elige primero la competencia"}
            disabled={!competencia}
            value={valores.edicionId}
            error={errores.edicionId}
            onChange={(evento) => cambiar("edicionId", evento.target.value)}
          />
          <CampoSeleccion
            etiqueta="Categoría"
            name="categoriaId"
            required
            opciones={competencia?.categorias ?? []}
            textoSinEleccion={competencia ? "Elige la categoría" : "Elige primero la competencia"}
            disabled={!competencia}
            value={valores.categoriaId}
            error={errores.categoriaId}
            ayuda="Un estudiante participa una sola vez por categoría y edición."
            onChange={(evento) => cambiar("categoriaId", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 min-w-0">
        <legend className={LEYENDA}>Equipo y resultado</legend>
        <div className="mt-4">
          <CamposDeResultado
            valores={valores}
            errores={errores}
            inicioPendiente={inicioPendiente}
            cambiar={cambiar}
          />
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" cargando={pendiente} textoCargando="Registrando">
          <Trophy aria-hidden="true" size={16} />
          Registrar participación
        </Boton>
        <EnlaceBoton href={RUTA_COMPETENCIAS} variante="secundario">
          Cancelar
        </EnlaceBoton>
      </div>
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

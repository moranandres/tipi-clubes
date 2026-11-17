"use client";

import { Save } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
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
import {
  actualizarClub,
  consultarDocentesDeInstitucion,
  crearClub,
} from "@/lib/acciones/clubes";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import { RUTA_CLUBES } from "@/lib/portal/filtros-clubes";
import type { OpcionDeFormulario } from "@/lib/portal/opciones";
import {
  CAMPOS_DE_CLUB,
  LIMITES_DE_CLUB,
  validarClub,
  type CampoDeClub,
  type DatosDeClub,
} from "@/lib/portal/reglas-clubes";
import { OPCIONES_DE_DIA } from "@/lib/portal/tiempo";
import { hayErrores } from "@/lib/portal/validacion";

type Props = {
  clubId: number | null;
  iniciales: DatosDeClub;
  instituciones: OpcionDeFormulario[] | null;
  institucionFija: string;
  periodos: OpcionDeFormulario[] | null;
  periodoFijo: string;
  docentes: OpcionDeFormulario[];
  integrantesActivos: number;
  bloqueado: boolean;
};

const CAMPOS_AL_EDITAR: readonly CampoDeClub[] = CAMPOS_DE_CLUB.filter(
  (campo) => campo !== "institucionId" && campo !== "periodoId",
);

const CAMPOS_VINCULADOS: readonly (readonly CampoDeClub[])[] = [
  ["diaSemana", "horaInicio", "horaFin"],
];

const LEYENDA = "text-lg font-medium";
const REJILLA = "mt-4 grid gap-x-5 gap-y-3";

export function FormularioClub({
  clubId,
  iniciales,
  instituciones,
  institucionFija,
  periodos,
  periodoFijo,
  docentes,
  integrantesActivos,
  bloqueado,
}: Props) {
  const esNuevo = clubId === null;
  const formulario = useRef<HTMLFormElement>(null);
  const consulta = useRef(0);
  const { valores, errores, cambiar, setValores, setErrores } = useCampos(iniciales, CAMPOS_VINCULADOS);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();
  const [docentesDisponibles, setDocentesDisponibles] = useState(docentes);
  const [avisoDeDocentes, setAvisoDeDocentes] = useState<string | undefined>();
  const [cargandoDocentes, iniciarCarga] = useTransition();
  const reiniciarAlSalir = useReinicioTrasCrear(() => {
    setValores(iniciales);
    setErrores({});
    setDocentesDisponibles(docentes);
    setAvisoDeDocentes(undefined);
  });

  function alElegirInstitucion(institucionId: string) {
    cambiar("institucionId", institucionId);
    cambiar("docenteId", "");
    setDocentesDisponibles([]);
    setAvisoDeDocentes(undefined);
    consulta.current += 1;
    const turno = consulta.current;

    if (!institucionId) {
      return;
    }

    iniciarCarga(async () => {
      const resultado = await consultarDocentesDeInstitucion(institucionId).catch(() => null);
      if (turno !== consulta.current) {
        return;
      }
      if (resultado?.ok) {
        setDocentesDisponibles(resultado.docentes);
        return;
      }
      setAvisoDeDocentes(
        resultado?.mensaje ?? "No pudimos cargar los docentes. Vuelve a elegir la institución.",
      );
    });
  }

  function ayudaDeDocente(): string | undefined {
    if (cargandoDocentes) {
      return "Cargando los docentes de la institución.";
    }
    if (avisoDeDocentes) {
      return avisoDeDocentes;
    }
    if (instituciones && !valores.institucionId) {
      return "Elige primero la institución.";
    }
    if (docentesDisponibles.length === 0) {
      return "La institución no tiene docentes activos registrados.";
    }
    return "Solo aparecen docentes activos de la institución.";
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente || bloqueado) {
      return;
    }

    const encontrados = validarClub(valores, { esNuevo, integrantesActivos });
    if (hayErrores(encontrados)) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => (esNuevo ? crearClub(valores) : actualizarClub(clubId, valores)),
      (resultado) => {
        if (resultado.ok) {
          if (resultado.destino) {
            reiniciarAlSalir();
            navegar(resultado.destino);
            return;
          }
          avisar("exito", resultado.mensaje);
          return;
        }
        const { deCampos, ajenos } = repartirErrores(
          resultado.errores,
          esNuevo ? CAMPOS_DE_CLUB : CAMPOS_AL_EDITAR,
        );
        setErrores(deCampos);
        avisar("error", resultado.mensaje, ajenos);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <form
      ref={formulario}
      onSubmit={alEnviar}
      noValidate
      aria-label={esNuevo ? "Datos del nuevo club" : "Datos del club"}
    >
      <fieldset disabled={bloqueado} className="min-w-0">
        <legend className={LEYENDA}>Datos del club</legend>
        <div className={`${REJILLA} sm:grid-cols-2`}>
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Nombre"
              name="nombre"
              type="text"
              autoComplete="off"
              required
              maxLength={LIMITES_DE_CLUB.nombre}
              value={valores.nombre}
              error={errores.nombre}
              onChange={(evento) => cambiar("nombre", evento.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <CampoTextoLargo
              etiqueta="Objetivo"
              name="objetivo"
              required
              maxLength={LIMITES_DE_CLUB.objetivo}
              value={valores.objetivo}
              error={errores.objetivo}
              ayuda="Describe qué aprenderán los estudiantes en el club."
              onChange={(evento) => cambiar("objetivo", evento.target.value)}
            />
          </div>
          {instituciones ? (
            <CampoSeleccion
              etiqueta="Institución"
              name="institucionId"
              required
              opciones={instituciones}
              textoSinEleccion="Elige una institución"
              value={valores.institucionId}
              error={errores.institucionId}
              ayuda="No se puede cambiar después de crear el club."
              onChange={(evento) => alElegirInstitucion(evento.target.value)}
            />
          ) : (
            <DatoFijo
              etiqueta="Institución"
              valor={institucionFija}
              ayuda={esNuevo ? "Se asigna según tu cuenta." : "No se puede cambiar."}
            />
          )}
          {periodos ? (
            <CampoSeleccion
              etiqueta="Período académico"
              name="periodoId"
              required
              opciones={periodos}
              textoSinEleccion="Elige un período"
              value={valores.periodoId}
              error={errores.periodoId}
              ayuda="No se puede cambiar después de crear el club."
              onChange={(evento) => cambiar("periodoId", evento.target.value)}
            />
          ) : (
            <DatoFijo etiqueta="Período académico" valor={periodoFijo} ayuda="No se puede cambiar." />
          )}
          <CampoSeleccion
            etiqueta="Docente responsable"
            name="docenteId"
            required
            opciones={docentesDisponibles}
            textoSinEleccion={cargandoDocentes ? "Cargando docentes" : "Elige un docente"}
            value={valores.docenteId}
            disabled={cargandoDocentes || docentesDisponibles.length === 0}
            error={errores.docenteId}
            ayuda={ayudaDeDocente()}
            onChange={(evento) => cambiar("docenteId", evento.target.value)}
          />
          <Campo
            etiqueta="Cupo máximo"
            name="cupoMaximo"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            maxLength={3}
            className="cifras"
            value={valores.cupoMaximo}
            error={errores.cupoMaximo}
            ayuda={
              esNuevo
                ? `De ${LIMITES_DE_CLUB.cupoMinimo} a ${LIMITES_DE_CLUB.cupoMaximo} estudiantes.`
                : `Ahora hay ${integrantesActivos} ${integrantesActivos === 1 ? "integrante activo" : "integrantes activos"}.`
            }
            onChange={(evento) => cambiar("cupoMaximo", evento.target.value)}
          />
        </div>
      </fieldset>

      <fieldset disabled={bloqueado} className="mt-8 min-w-0">
        <legend className={LEYENDA}>Horario y lugar</legend>
        <p className="mt-1.5 text-[0.9375rem] text-tenue">
          Es opcional. Si indicas un día, completa también la hora de inicio y la de fin.
        </p>
        <div className={`${REJILLA} sm:grid-cols-3`}>
          <CampoSeleccion
            etiqueta="Día de la semana"
            name="diaSemana"
            opciones={OPCIONES_DE_DIA}
            textoSinEleccion="Sin día fijo"
            value={valores.diaSemana}
            error={errores.diaSemana}
            onChange={(evento) => cambiar("diaSemana", evento.target.value)}
          />
          <Campo
            etiqueta="Hora de inicio"
            name="horaInicio"
            type="time"
            className="cifras"
            value={valores.horaInicio}
            error={errores.horaInicio}
            onChange={(evento) => cambiar("horaInicio", evento.target.value)}
          />
          <Campo
            etiqueta="Hora de fin"
            name="horaFin"
            type="time"
            className="cifras"
            value={valores.horaFin}
            error={errores.horaFin}
            onChange={(evento) => cambiar("horaFin", evento.target.value)}
          />
          <div className="sm:col-span-3">
            <Campo
              etiqueta="Lugar"
              name="lugar"
              type="text"
              autoComplete="off"
              maxLength={LIMITES_DE_CLUB.lugar}
              placeholder="Laboratorio de computación"
              value={valores.lugar}
              error={errores.lugar}
              onChange={(evento) => cambiar("lugar", evento.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {bloqueado ? null : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Boton type="submit" cargando={pendiente} textoCargando="Guardando">
            <Save aria-hidden="true" size={16} />
            {esNuevo ? "Crear club" : "Guardar cambios"}
          </Boton>
          <EnlaceBoton href={RUTA_CLUBES} variante="secundario">
            {esNuevo ? "Cancelar" : "Volver a la lista"}
          </EnlaceBoton>
        </div>
      )}
      <ZonaDeAviso aviso={aviso} className="mt-4" />
    </form>
  );
}

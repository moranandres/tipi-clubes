import type { Metadata } from "next";
import { CalendarDays, Images, Lock, Users } from "lucide-react";
import { Suspense } from "react";
import { diaDe, horarioDe } from "@/components/portal/actividades/PiezasDeActividad";
import { CorreccionesDeAsistencia } from "@/components/portal/asistencia/CorreccionesDeAsistencia";
import {
  PlanillaDeAsistencia,
  type FilaVisible,
} from "@/components/portal/asistencia/PlanillaDeAsistencia";
import { PlanillaDeConsulta } from "@/components/portal/asistencia/PlanillaDeConsulta";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarCorrecciones, obtenerPlanilla, type Planilla } from "@/lib/api/asistencia";
import { rutaDeActividad } from "@/lib/portal/filtros-actividades";
import { RUTA_ASISTENCIA } from "@/lib/portal/filtros-asistencia";
import { rutaDeEvidenciasDeSesion } from "@/lib/portal/filtros-evidencias";
import { identidadDe } from "@/lib/portal/identidad";
import { soloVeDatosMinimos } from "@/lib/portal/permisos";
import { esEstadoDeAsistencia, porcentajeLegible } from "@/lib/portal/reglas-asistencia";
import { fechaCorta } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Planilla de asistencia",
};

type Props = PageProps<"/portal/asistencia/[actividadId]">;

const RECURSO = { recurso: "sesiones", rutaDeLista: RUTA_ASISTENCIA };
const NO_ENCONTRADA = "Esta sesión no existe";
const ESTADO_EJECUTADA = "EJECUTADA";

function filasDe(planilla: Planilla, minima: boolean): FilaVisible[] {
  return (planilla.estudiantes ?? [])
    .filter((fila): fila is typeof fila & { estudianteId: number } => typeof fila.estudianteId === "number")
    .map((fila) => {
      const identidad = identidadDe(
        { nombres: fila.estudianteNombres, apellidos: fila.estudianteApellidos, codigo: fila.estudianteCodigo },
        minima,
      );
      return {
        estudianteId: fila.estudianteId,
        principal: identidad.principal,
        codigo: identidad.codigo,
        estado: esEstadoDeAsistencia(fila.estado) ? fila.estado : null,
        observacion: fila.observacion ?? "",
        corregida: Boolean(fila.corregida),
      };
    });
}

async function Contenido({ params }: Pick<Props, "params">) {
  const [{ actividadId: segmento }, usuario] = await Promise.all([params, exigirSesion()]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const resultado = await obtenerPlanilla(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const planilla = resultado.datos;
  const minima = soloVeDatosMinimos(usuario.rol);
  const filas = filasDe(planilla, minima);
  const ejecutada = planilla.estadoActividad === ESTADO_EJECUTADA;
  const correcciones = ejecutada ? await listarCorrecciones(id) : null;

  return (
    <>
      <EncabezadoDeGestion
        titulo={planilla.actividadTema ?? "Sesión"}
        detalle={[
          `${diaDe(planilla.fecha)}, ${fechaCorta(planilla.fecha)}, ${horarioDe(planilla.horaInicio, planilla.horaFin)}`,
          planilla.clubNombre,
          planilla.cursoNombre,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="planilla">
            <h2 id="planilla" className="sr-only">
              Planilla
            </h2>
            {!planilla.editable && planilla.motivoNoEditable ? (
              <p className="mb-6 flex items-start gap-2.5 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
                <Lock aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                <span>{planilla.motivoNoEditable}</span>
              </p>
            ) : null}
            {filas.length === 0 ? (
              <AvisoDeLista icono={<Users size={20} />} titulo="No hay integrantes en esta sesión">
                {ejecutada
                  ? "La asistencia se toma a los integrantes del club, o del curso de la sesión, inscritos a la fecha de la actividad. Revisa las inscripciones del club."
                  : "La planilla se arma cuando la sesión tiene registrada su ejecución."}
              </AvisoDeLista>
            ) : planilla.editable ? (
              <PlanillaDeAsistencia key={id} actividadId={id} filas={filas} />
            ) : (
              <PlanillaDeConsulta filas={filas} />
            )}
          </section>
          {correcciones && correcciones.length > 0 ? (
            <CorreccionesDeAsistencia correcciones={correcciones} minima={minima} />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="datos-de-sesion" className="rounded-pieza border border-linea p-5">
            <h2 id="datos-de-sesion" className="text-lg font-medium">
              Datos de la sesión
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                columnas="grid-cols-1"
                datos={[
                  { termino: "Docente responsable", valor: planilla.responsableNombre },
                  { termino: "Institución", valor: planilla.institucionNombre },
                  { termino: "Integrantes", valor: String(planilla.totalEstudiantes ?? filas.length) },
                  {
                    termino: "Asistencia efectiva",
                    valor: `${porcentajeLegible(planilla.porcentajeAsistencia)}${typeof planilla.porcentajeAsistencia === "number" ? " de los registrados, sin contar justificados" : ""}`,
                  },
                ]}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <EnlaceBoton href={rutaDeActividad(id)} variante="secundario" className="w-full">
                <CalendarDays aria-hidden="true" size={16} />
                Ver la sesión
              </EnlaceBoton>
              {ejecutada ? (
                <EnlaceBoton href={rutaDeEvidenciasDeSesion(id)} variante="secundario" className="w-full">
                  <Images aria-hidden="true" size={16} />
                  Evidencias de la sesión
                </EnlaceBoton>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default function PaginaPlanilla({ params }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_ASISTENCIA}>Volver a asistencia</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la planilla de asistencia." />}>
        <Contenido params={params} />
      </Suspense>
    </div>
  );
}

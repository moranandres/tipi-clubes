import type { Metadata } from "next";
import { Ban } from "lucide-react";
import { Suspense } from "react";
import { AccesosDeSesion } from "@/components/portal/actividades/AccesosDeSesion";
import { FormularioActividad } from "@/components/portal/actividades/FormularioActividad";
import { FormularioEjecucion } from "@/components/portal/actividades/FormularioEjecucion";
import { diaDe, horarioDe } from "@/components/portal/actividades/PiezasDeActividad";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import { ConfirmarEliminacion } from "@/components/portal/formularios/ConfirmarEliminacion";
import {
  AvisoDeResultado,
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { ResolverConMotivo } from "@/components/portal/formularios/ResolverConMotivo";
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { PasosDeTramite, type Paso } from "@/components/portal/PasosDeTramite";
import { cancelarActividad, eliminarActividad } from "@/lib/acciones/actividades";
import {
  listarContenidosActivos,
  listarCursosDeClub,
  listarReprogramaciones,
  obtenerActividad,
  type Actividad,
  type Reprogramacion,
} from "@/lib/api/actividades";
import { listarDocentesActivos, obtenerClub } from "@/lib/api/clubes";
import {
  NOMBRES_DE_TIPO_DE_CONTENIDO,
  RUTA_ACTIVIDADES,
  TIPOS_DE_CONTENIDO,
  rutaDeActividad,
} from "@/lib/portal/filtros-actividades";
import { conOpcionActual, opcionesDeDocentes } from "@/lib/portal/opciones";
import { puedeElegirResponsable, puedeGestionarActividades } from "@/lib/portal/permisos";
import {
  contenidosElegibles,
  cursosParaActividad,
  duracionLegible,
  type DatosDeActividad,
} from "@/lib/portal/reglas-actividades";
import { fechaCorta, horaCorta, hoyEnGuayaquil, momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Actividad",
};

type Props = PageProps<"/portal/actividades/[id]">;

const RECURSO = { recurso: "actividades", rutaDeLista: RUTA_ACTIVIDADES };
const NO_ENCONTRADA = "Esta actividad no existe";
const CLUB_ACTIVO = "ACTIVO";

const AVISOS: Record<string, string> = {
  creada: "La actividad quedó planificada. Cuando se realice, registra aquí su ejecución.",
  ejecutada:
    "La ejecución quedó registrada. Ya puedes pasar asistencia y cargar las evidencias de la sesión.",
  cancelada: "La actividad se canceló y el motivo quedó registrado en la auditoría.",
};

function porQuien(nombre?: string, instante?: string): string {
  return [momentoCorto(instante), nombre ? `por ${nombre}` : null].filter(Boolean).join(", ");
}

function pasosDe(actividad: Actividad): Paso[] {
  const estado = actividad.estado ?? "PLANIFICADA";
  const segundo: Paso =
    estado === "EJECUTADA"
      ? {
          titulo: "Ejecutada",
          detalle: porQuien(actividad.ejecutadaPorNombre, actividad.fechaRegistroEjecucion),
          estado: "hecho",
        }
      : estado === "CANCELADA"
        ? {
            titulo: "Cancelada",
            detalle: porQuien(actividad.canceladaPorNombre, actividad.fechaCancelacion),
            estado: "detenido",
          }
        : {
            titulo: "Ejecución",
            detalle: actividad.pendienteDeRegistro
              ? "Pendiente de registrar"
              : `Programada para el ${fechaCorta(actividad.fecha)}`,
            estado: "actual",
          };
  const pasos: Paso[] = [
    {
      titulo: "Planificada",
      detalle: porQuien(actividad.creadoPorNombre, actividad.createdAt),
      estado: "hecho",
    },
    segundo,
  ];
  if (estado !== "CANCELADA") {
    pasos.push({
      titulo: "Asistencia y evidencias",
      detalle: estado === "EJECUTADA" ? "Disponibles" : undefined,
      estado: estado === "EJECUTADA" ? "actual" : "pendiente",
    });
  }
  return pasos;
}

function contenidosPorTipo(actividad: Actividad): string {
  const contenidos = actividad.contenidos ?? [];
  return TIPOS_DE_CONTENIDO.map((tipo) => {
    const nombres = contenidos
      .filter((contenido) => contenido.tipo === tipo)
      .map((contenido) => contenido.nombre)
      .filter(Boolean);
    return nombres.length > 0 ? `${NOMBRES_DE_TIPO_DE_CONTENIDO[tipo]}: ${nombres.join(", ")}` : null;
  })
    .filter(Boolean)
    .join("\n");
}

function datosDe(actividad: Actividad): DatosDeActividad {
  return {
    clubId: String(actividad.clubId ?? ""),
    cursoId: actividad.cursoId ? String(actividad.cursoId) : "",
    responsableId: actividad.responsableId ? String(actividad.responsableId) : "",
    fecha: actividad.fecha ?? "",
    horaInicio: horaCorta(actividad.horaInicio),
    horaFin: horaCorta(actividad.horaFin),
    tema: actividad.tema ?? "",
    objetivo: actividad.objetivo ?? "",
    descripcion: actividad.descripcion ?? "",
    lugar: actividad.lugar ?? "",
    motivoReprogramacion: "",
  };
}

function idsDeContenidos(actividad: Actividad): number[] {
  return (actividad.contenidos ?? [])
    .map((contenido) => contenido.id)
    .filter((id): id is number => typeof id === "number");
}

function Reprogramaciones({ lista }: { lista: Reprogramacion[] }) {
  return (
    <section aria-labelledby="reprogramaciones">
      <h2 id="reprogramaciones" className="text-lg font-medium">
        Historial de reprogramaciones
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        {lista.map((cambio) => (
          <li key={cambio.id} className="rounded-pieza bg-superficie p-4 text-[0.9375rem]">
            <p className="cifras">
              <span className="text-tenue line-through">
                {fechaCorta(cambio.fechaAnterior)}, {horarioDe(cambio.horaInicioAnterior, cambio.horaFinAnterior)}
              </span>{" "}
              <span aria-hidden="true">→</span>
              <span className="sr-only">pasó a</span>{" "}
              <span className="font-medium">
                {fechaCorta(cambio.fechaNueva)}, {horarioDe(cambio.horaInicioNueva, cambio.horaFinNueva)}
              </span>
            </p>
            <p className="mt-1.5 break-words">{cambio.motivo}</p>
            <p className="cifras mt-1 text-sm text-tenue">
              {porQuien(cambio.registradoPorNombre, cambio.fechaRegistro)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function Contenido({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([
    params,
    searchParams,
    exigirSesion(),
  ]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const resultado = await obtenerActividad(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const actividad = resultado.datos;
  const estado = actividad.estado ?? "PLANIFICADA";
  const planificada = estado === "PLANIFICADA";
  const ejecutada = estado === "EJECUTADA";
  const gestiona = puedeGestionarActividades(usuario.rol);
  const conPanel = gestiona && estado !== "CANCELADA";
  const hoy = hoyEnGuayaquil();
  const llegoLaFecha = Boolean(actividad.fecha && actividad.fecha <= hoy);
  const reprogramada = (actividad.reprogramaciones ?? 0) > 0;
  const eliminable = planificada && Boolean(actividad.fecha && actividad.fecha >= hoy) && !reprogramada;
  const aviso = typeof consulta.aviso === "string" ? AVISOS[consulta.aviso] : undefined;

  const [club, reprogramaciones, contenidos, cursos, docentes] = await Promise.all([
    gestiona && planificada && actividad.clubId ? obtenerClub(actividad.clubId) : null,
    reprogramada ? listarReprogramaciones(id) : null,
    gestiona && estado !== "CANCELADA" ? listarContenidosActivos() : null,
    gestiona && planificada && actividad.clubId ? listarCursosDeClub(actividad.clubId) : null,
    gestiona && planificada && puedeElegirResponsable(usuario.rol) && actividad.institucionId
      ? listarDocentesActivos(actividad.institucionId)
      : null,
  ]);

  const estadoDelClub = club?.estado === "ok" ? club.datos.estado : null;
  const clubInactivo = estadoDelClub !== null && estadoDelClub !== CLUB_ACTIVO;
  const elegibles = contenidosElegibles(contenidos ?? [], actividad.contenidos ?? []);
  const responsables = docentes
    ? conOpcionActual(
        opcionesDeDocentes(docentes),
        actividad.responsableId ? String(actividad.responsableId) : "",
        actividad.responsableNombre ?? "Docente actual",
      )
    : null;

  return (
    <>
      <EncabezadoDeGestion
        titulo={actividad.tema ?? "Actividad"}
        detalle={[actividad.clubNombre, actividad.cursoNombre, actividad.institucionNombre]
          .filter(Boolean)
          .join(" · ")}
      />
      {aviso ? <AvisoDeResultado>{aviso}</AvisoDeResultado> : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="resumen-de-sesion">
            <h2 id="resumen-de-sesion" className="text-lg font-medium">
              Resumen de la sesión
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  {
                    termino: "Fecha",
                    valor: `${diaDe(actividad.fecha)}, ${fechaCorta(actividad.fecha)}`,
                  },
                  {
                    termino: "Horario",
                    valor: `${horarioDe(actividad.horaInicio, actividad.horaFin)} (${duracionLegible(actividad.duracionMinutos)})`,
                  },
                  reprogramada
                    ? {
                        termino: "Fecha original",
                        valor: `${fechaCorta(actividad.fechaOriginal)}, ${horarioDe(actividad.horaInicioOriginal, actividad.horaFinOriginal)}`,
                      }
                    : null,
                  { termino: "Lugar", valor: actividad.lugar },
                  { termino: "Docente responsable", valor: actividad.responsableNombre },
                  { termino: "Curso", valor: actividad.cursoNombre ?? "Todo el club" },
                  { termino: "Objetivo", valor: actividad.objetivo, ancho: true },
                  { termino: "Descripción", valor: actividad.descripcion, ancho: true },
                  {
                    termino: ejecutada ? "Contenidos trabajados" : "Contenidos previstos",
                    valor: contenidosPorTipo(actividad),
                    ancho: true,
                  },
                  ejecutada && !gestiona
                    ? { termino: "Resumen de lo impartido", valor: actividad.resumenEjecucion, ancho: true }
                    : null,
                  ejecutada && !gestiona
                    ? { termino: "Observaciones", valor: actividad.observaciones, ancho: true }
                    : null,
                  estado === "CANCELADA"
                    ? { termino: "Motivo de la cancelación", valor: actividad.motivoCancelacion, ancho: true }
                    : null,
                ]}
              />
            </div>
          </section>

          {gestiona && planificada ? (
            <section aria-labelledby="editar-actividad">
              <h2 id="editar-actividad" className="sr-only">
                Editar o reprogramar
              </h2>
              {clubInactivo ? (
                <p className="mb-6 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
                  El club no está activo: puedes ajustar la planificación, pero la ejecución solo se
                  registra cuando el club esté activo.
                </p>
              ) : null}
              <FormularioActividad
                key={id}
                actividadId={id}
                iniciales={datosDe(actividad)}
                contenidosIniciales={idsDeContenidos(actividad)}
                contenidos={elegibles}
                clubes={null}
                clubFijo={{
                  valor: String(actividad.clubId ?? ""),
                  texto: actividad.clubNombre ?? "Club",
                  lugar: club?.estado === "ok" ? (club.datos.lugar ?? "") : "",
                }}
                cursos={cursosParaActividad(cursos ?? [], {
                  id: actividad.cursoId,
                  nombre: actividad.cursoNombre,
                  clubId: actividad.clubId,
                })}
                responsables={responsables}
                responsableActual={actividad.responsableNombre ?? ""}
                original={{
                  fecha: actividad.fecha ?? "",
                  horaInicio: horaCorta(actividad.horaInicio),
                  horaFin: horaCorta(actividad.horaFin),
                }}
                bloqueado={false}
              />
            </section>
          ) : null}

          {gestiona && (ejecutada || (planificada && llegoLaFecha && !clubInactivo)) ? (
            <FormularioEjecucion
              key={`ejecucion-${id}`}
              actividadId={id}
              iniciales={{
                resumen: actividad.resumenEjecucion ?? "",
                observaciones: actividad.observaciones ?? "",
              }}
              contenidosIniciales={idsDeContenidos(actividad)}
              contenidos={elegibles}
              esCorreccion={ejecutada}
            />
          ) : null}

          {reprogramaciones && reprogramaciones.length > 0 ? (
            <Reprogramaciones lista={reprogramaciones} />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="avance-de-sesion" className="rounded-pieza border border-linea p-5">
            <h2 id="avance-de-sesion" className="text-lg font-medium">
              Avance de la sesión
            </h2>
            <div className="mt-4">
              <PasosDeTramite etiqueta="Etapas de la sesión" pasos={pasosDe(actividad)} />
            </div>
          </section>
          <AccesosDeSesion
            actividadId={id}
            estado={estado}
            fecha={actividad.fecha}
            gestiona={gestiona}
          />
          {conPanel && planificada ? (
            <ResolverConMotivo
              key={`cancelacion-${id}`}
              titulo="Cancelar la sesión"
              descripcion="Úsalo si la sesión no se realizará. Queda en el historial del club con su motivo y ya no se modifica."
              etiqueta="Cancelar sesión"
              confirmar="Sí, cancelar"
              textoCargando="Cancelando"
              minimo={1}
              icono={<Ban aria-hidden="true" size={16} />}
              destino={rutaDeActividad(id, "cancelada")}
              resolver={cancelarActividad.bind(null, id)}
            />
          ) : null}
          {conPanel && eliminable ? (
            <ConfirmarEliminacion
              key={`eliminacion-${id}`}
              titulo="Eliminar la sesión"
              descripcion="Solo se eliminan sesiones planificadas a futuro que nunca se reprogramaron. Si ya forma parte del seguimiento, cancélala."
              etiqueta="Eliminar sesión"
              etiquetaDeConfirmacion="Confirmar la eliminación de la sesión"
              eliminar={eliminarActividad.bind(null, id)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function PaginaActividad(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_ACTIVIDADES}>Volver a actividades</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la actividad." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

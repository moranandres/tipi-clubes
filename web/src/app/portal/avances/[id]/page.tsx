import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Lock } from "lucide-react";
import { Suspense } from "react";
import { FormularioAvance } from "@/components/portal/avances/FormularioAvance";
import { AlcanceDeAvance, NivelDeLogro, sujetoDe } from "@/components/portal/avances/PiezasDeAvance";
import { AvisoDenegado, AvisoNoEncontrado, AvisoSinServicio } from "@/components/portal/formularios/AvisosDeGestion";
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
import { anularAvance } from "@/lib/acciones/avances";
import { armarClubesParaAvance, listarCompetenciasEvaluables, obtenerAvance, type Avance } from "@/lib/api/avances";
import { obtenerClub } from "@/lib/api/clubes";
import { obtenerProyecto } from "@/lib/api/proyectos";
import { rutaDeActividad } from "@/lib/portal/filtros-actividades";
import { NOMBRES_DE_ALCANCE, RUTA_AVANCES, rutaDeAvance } from "@/lib/portal/filtros-avances";
import { rutaDeProyecto } from "@/lib/portal/filtros-proyectos";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { puedeRegistrarAvances, soloVeDatosMinimos } from "@/lib/portal/permisos";
import type { DatosDeAvance } from "@/lib/portal/reglas-avances";
import { fechaCorta, hoyEnGuayaquil, momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Avance",
};

type Props = PageProps<"/portal/avances/[id]">;

const RECURSO = { recurso: "avances", rutaDeLista: RUTA_AVANCES };
const NO_ENCONTRADO = "Este avance no existe";
const AVISOS: Record<string, string> = {
  registrado: "El avance quedó registrado. Puedes corregirlo mientras el club y el proyecto sigan abiertos.",
  anulado: "El avance quedó anulado y ya no cuenta en los resultados.",
};

function datosDe(avance: Avance): DatosDeAvance {
  return {
    alcance: avance.alcance ?? "",
    clubId: String(avance.clubId ?? ""),
    estudianteId: avance.estudiante?.estudianteId ? String(avance.estudiante.estudianteId) : "",
    proyectoId: avance.proyectoId ? String(avance.proyectoId) : "",
    actividadId: avance.actividadId ? String(avance.actividadId) : "",
    fecha: avance.fecha ?? "",
    resultados: avance.resultados ?? "",
    logros: avance.logros ?? "",
    dificultades: avance.dificultades ?? "",
    proximosPasos: avance.proximosPasos ?? "",
    porcentajeAvance: typeof avance.porcentajeAvance === "number" ? String(avance.porcentajeAvance) : "",
  };
}

async function bloqueoDe(avance: Avance): Promise<string | null> {
  const [club, proyecto] = await Promise.all([
    avance.clubId ? obtenerClub(avance.clubId) : null,
    avance.proyectoId ? obtenerProyecto(avance.proyectoId) : null,
  ]);
  if (club?.estado === "ok" && club.datos.estado === "CERRADO") {
    return "El club está cerrado; sus avances forman parte del historial y ya no se modifican.";
  }
  if (proyecto?.estado === "ok" && proyecto.datos.estado !== "EN_DESARROLLO") {
    return `El proyecto «${proyecto.datos.titulo}» está ${proyecto.datos.estado === "FINALIZADO" ? "finalizado" : "cancelado"}; sus avances ya no se registran ni se modifican.`;
  }
  return null;
}

async function Contenido({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([params, searchParams, exigirSesion()]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const resultado = await obtenerAvance(id);
  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const avance = resultado.datos;
  const minima = soloVeDatosMinimos(usuario.rol);
  const anulado = avance.estado === "ANULADO";
  const gestiona = puedeRegistrarAvances(usuario.rol) && !anulado;
  const bloqueo = gestiona ? await bloqueoDe(avance) : null;
  const editable = gestiona && !bloqueo;
  const aviso = typeof consulta.aviso === "string" ? AVISOS[consulta.aviso] : undefined;
  const sujeto = sujetoDe(avance, minima);

  const [club, catalogo] = editable
    ? await Promise.all([obtenerClub(avance.clubId ?? 0), listarCompetenciasEvaluables()])
    : [null, null];
  const opciones = club?.estado === "ok" ? await armarClubesParaAvance([club.datos], tieneAlcanceGlobal(usuario.rol)) : null;
  const opcionesConActual = opciones?.map((opcion) => ({
    ...opcion,
    actividades:
      avance.actividadId && !opcion.actividades.some((actividad) => actividad.valor === String(avance.actividadId))
        ? [
            {
              valor: String(avance.actividadId),
              texto: `${fechaCorta(avance.actividadFecha)} · ${avance.actividadTema ?? "Sesión"}`,
              nombre: avance.actividadTema ?? "Sesión",
              fecha: avance.actividadFecha ?? "",
            },
            ...opcion.actividades,
          ]
        : opcion.actividades,
  }));

  return (
    <>
      <EncabezadoDeGestion
        titulo={`Avance del ${fechaCorta(avance.fecha)}`}
        detalle={[sujeto, avance.clubNombre].filter(Boolean).join(" · ")}
      />
      {aviso ? <AvisoDeResultado>{aviso}</AvisoDeResultado> : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="resumen-del-avance">
            <h2 id="resumen-del-avance" className="text-lg font-medium">
              Resumen del avance
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  { termino: "Alcance", valor: <AlcanceDeAvance alcance={avance.alcance} /> },
                  {
                    termino: avance.alcance ? NOMBRES_DE_ALCANCE[avance.alcance] : "Sujeto",
                    valor:
                      avance.alcance === "PROYECTO" && avance.proyectoId ? (
                        <Link href={rutaDeProyecto(avance.proyectoId)} className="font-medium text-acento">
                          {sujeto}
                        </Link>
                      ) : (
                        sujeto
                      ),
                  },
                  typeof avance.porcentajeAvance === "number"
                    ? { termino: "Porcentaje de avance", valor: `${avance.porcentajeAvance}%` }
                    : null,
                  avance.actividadId
                    ? {
                        termino: "Sesión",
                        valor: (
                          <Link href={rutaDeActividad(avance.actividadId)} className="font-medium text-acento">
                            {fechaCorta(avance.actividadFecha)} · {avance.actividadTema}
                          </Link>
                        ),
                      }
                    : null,
                  tieneAlcanceGlobal(usuario.rol) ? { termino: "Institución", valor: avance.institucionNombre } : null,
                  avance.contenidoReservado
                    ? {
                        termino: "Contenido",
                        valor: "Los resultados de un avance individual quedan reservados para tu rol.",
                        ancho: true,
                      }
                    : null,
                  editable ? null : { termino: "Resultados", valor: avance.resultados, ancho: true },
                  editable ? null : { termino: "Logros", valor: avance.logros, ancho: true },
                  editable ? null : { termino: "Dificultades", valor: avance.dificultades, ancho: true },
                  editable ? null : { termino: "Próximos pasos", valor: avance.proximosPasos, ancho: true },
                  { termino: "Registrado", valor: [momentoCorto(avance.fechaRegistro), avance.registradoPorNombre].filter(Boolean).join(", por ") },
                  anulado
                    ? {
                        termino: `Anulado (${momentoCorto(avance.fechaAnulacion)}${avance.anuladoPorNombre ? `, por ${avance.anuladoPorNombre}` : ""})`,
                        valor: avance.motivoAnulacion ?? "Motivo reservado",
                        ancho: true,
                      }
                    : null,
                ]}
              />
            </div>
            {bloqueo ? (
              <p className="mt-6 flex items-start gap-2.5 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
                <Lock aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                <span>{bloqueo}</span>
              </p>
            ) : null}
          </section>

          {editable && opcionesConActual && catalogo ? (
            <section aria-label="Editar el avance">
              <FormularioAvance
                key={`avance-${id}`}
                avanceId={id}
                iniciales={datosDe(avance)}
                competenciasIniciales={(avance.competencias ?? [])
                  .filter((competencia) => typeof competencia.contenidoId === "number")
                  .map((competencia) => ({ contenidoId: competencia.contenidoId as number, nivel: competencia.nivel ?? "" }))}
                clubes={opcionesConActual}
                sujetoFijo={sujeto}
                catalogo={catalogo}
                hoy={hoyEnGuayaquil()}
              />
            </section>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {avance.alcance === "ESTUDIANTE" && !avance.contenidoReservado ? (
            <section aria-labelledby="competencias-evaluadas" className="rounded-pieza border border-linea p-5">
              <h2 id="competencias-evaluadas" className="text-lg font-medium">
                Competencias evaluadas
              </h2>
              {(avance.competencias ?? []).length === 0 ? (
                <p className="mt-2 text-[0.9375rem] text-tenue">Este avance no evalúa competencias.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {(avance.competencias ?? []).map((competencia) => (
                    <li
                      key={competencia.contenidoId}
                      className="flex items-start justify-between gap-3 rounded-control bg-superficie px-3.5 py-3 text-[0.9375rem]"
                    >
                      <span className="min-w-0 break-words">{competencia.nombre}</span>
                      <span className="shrink-0 text-sm">
                        <NivelDeLogro nivel={competencia.nivel} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
          {editable ? (
            <ResolverConMotivo
              key={`anulacion-${id}`}
              titulo="Anular el avance"
              descripcion="Úsalo si el avance se registró por error. Deja de contar en los resultados y queda en la auditoría con su motivo."
              etiqueta="Anular avance"
              confirmar="Sí, anular"
              textoCargando="Anulando"
              minimo={1}
              icono={<Ban aria-hidden="true" size={16} />}
              destino={rutaDeAvance(id, "anulado")}
              resolver={anularAvance.bind(null, id)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function PaginaAvance(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_AVANCES}>Volver a avances</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando el avance." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

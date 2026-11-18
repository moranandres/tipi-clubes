import type { Metadata } from "next";
import { Ban, Lock, Plus } from "lucide-react";
import { Suspense } from "react";
import { ListaDeAvances } from "@/components/portal/avances/PiezasDeAvance";
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
import { EvidenciasDelProyecto } from "@/components/portal/proyectos/EvidenciasDelProyecto";
import { FinalizarProyecto } from "@/components/portal/proyectos/FinalizarProyecto";
import { FormularioProyecto } from "@/components/portal/proyectos/FormularioProyecto";
import { BarraDeAvance, EstadoDeProyecto } from "@/components/portal/proyectos/PiezasDeProyecto";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { cancelarProyecto } from "@/lib/acciones/proyectos";
import { listarAvancesDeProyecto } from "@/lib/api/avances";
import { obtenerClub } from "@/lib/api/clubes";
import {
  armarClubesParaProyecto,
  listarEvidenciasActivasDeClub,
  obtenerProyecto,
  type Proyecto,
} from "@/lib/api/proyectos";
import { rutaDeNuevoAvance } from "@/lib/portal/filtros-avances";
import { NOMBRES_DE_TIPO_DE_EVIDENCIA } from "@/lib/portal/filtros-evidencias";
import { NOMBRES_DE_TIPO_DE_PROYECTO, RUTA_PROYECTOS, rutaDeProyecto } from "@/lib/portal/filtros-proyectos";
import { identidadDe } from "@/lib/portal/identidad";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { puedeGestionarProyectos, puedeRegistrarAvances, soloVeDatosMinimos } from "@/lib/portal/permisos";
import type { DatosDeProyecto } from "@/lib/portal/reglas-proyectos";
import { fechaCorta, hoyEnGuayaquil, momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Proyecto",
};

type Props = PageProps<"/portal/proyectos/[id]">;

const RECURSO = { recurso: "proyectos", rutaDeLista: RUTA_PROYECTOS };
const NO_ENCONTRADO = "Este proyecto no existe";

const AVISOS: Record<string, string> = {
  registrado: "El proyecto quedó registrado. Registra sus avances a medida que el equipo trabaje.",
  finalizado: "El proyecto quedó finalizado con su resultado. Todavía puedes ajustar sus evidencias.",
  cancelado: "El proyecto quedó cancelado y el motivo quedó en la auditoría.",
};

function datosDe(proyecto: Proyecto): DatosDeProyecto {
  return {
    clubId: String(proyecto.clubId ?? ""),
    tipo: proyecto.tipo ?? "",
    titulo: proyecto.titulo ?? "",
    objetivo: proyecto.objetivo ?? "",
    descripcion: proyecto.descripcion ?? "",
    docenteId: proyecto.docenteId ? String(proyecto.docenteId) : "",
    fechaInicio: proyecto.fechaInicio ?? "",
    fechaFinPrevista: proyecto.fechaFinPrevista ?? "",
  };
}

function idsDeIntegrantes(proyecto: Proyecto): number[] {
  return (proyecto.integrantes ?? [])
    .map((integrante) => integrante.estudianteId)
    .filter((id): id is number => typeof id === "number");
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

  const resultado = await obtenerProyecto(id);
  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const proyecto = resultado.datos;
  const minima = soloVeDatosMinimos(usuario.rol);
  const gestiona = puedeGestionarProyectos(usuario.rol);
  const editable = gestiona && Boolean(proyecto.editable);
  const enDesarrollo = proyecto.estado === "EN_DESARROLLO";
  const cancelado = proyecto.estado === "CANCELADO";
  const ajustaEvidencias = gestiona && !cancelado && (editable || proyecto.estado === "FINALIZADO");
  const hoy = hoyEnGuayaquil();
  const aviso = typeof consulta.aviso === "string" ? AVISOS[consulta.aviso] : undefined;
  const clubId = proyecto.clubId ?? 0;

  const [avances, club, evidencias] = await Promise.all([
    listarAvancesDeProyecto(id),
    editable ? obtenerClub(clubId) : null,
    ajustaEvidencias ? listarEvidenciasActivasDeClub(clubId) : null,
  ]);
  const opciones =
    editable && club?.estado === "ok" ? await armarClubesParaProyecto([club.datos], tieneAlcanceGlobal(usuario.rol)) : null;
  const opcionesConEquipo = opciones?.map((opcion) => ({
    ...opcion,
    integrantes: [
      ...opcion.integrantes,
      ...(proyecto.integrantes ?? [])
        .filter(
          (integrante) =>
            typeof integrante.estudianteId === "number" &&
            !opcion.integrantes.some((candidato) => candidato.id === integrante.estudianteId),
        )
        .map((integrante) => ({
          id: integrante.estudianteId as number,
          principal: identidadDe(
            {
              nombres: integrante.estudianteNombres,
              apellidos: integrante.estudianteApellidos,
              codigo: integrante.estudianteCodigo,
            },
            false,
          ).principal,
          codigo: "Ya no es integrante activo del club",
          autorizado: true,
        })),
    ],
  }));

  const vinculadas = (proyecto.evidencias ?? [])
    .map((evidencia) => evidencia.evidenciaId)
    .filter((evidenciaId): evidenciaId is number => typeof evidenciaId === "number");
  const candidatas = [
    ...(evidencias ?? [])
      .filter((evidencia): evidencia is typeof evidencia & { id: number } => typeof evidencia.id === "number")
      .map((evidencia) => ({
        id: evidencia.id,
        principal: evidencia.titulo ?? "Evidencia",
        codigo: [evidencia.tipo ? NOMBRES_DE_TIPO_DE_EVIDENCIA[evidencia.tipo] : null, fechaCorta(evidencia.fechaEvidencia)]
          .filter(Boolean)
          .join(" · "),
        autorizado: true,
      })),
    ...(proyecto.evidencias ?? [])
      .filter((evidencia) => evidencia.estado === "RETIRADA" && typeof evidencia.evidenciaId === "number")
      .map((evidencia) => ({
        id: evidencia.evidenciaId as number,
        principal: evidencia.titulo ?? "Evidencia",
        codigo: "Retirada",
        autorizado: true,
      })),
  ];

  return (
    <>
      <EncabezadoDeGestion
        titulo={proyecto.titulo ?? "Proyecto"}
        detalle={[
          proyecto.tipo ? NOMBRES_DE_TIPO_DE_PROYECTO[proyecto.tipo] : null,
          proyecto.clubNombre,
          tieneAlcanceGlobal(usuario.rol) ? proyecto.institucionNombre : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      {aviso ? <AvisoDeResultado>{aviso}</AvisoDeResultado> : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="resumen-del-proyecto">
            <h2 id="resumen-del-proyecto" className="text-lg font-medium">
              Resumen del proyecto
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  { termino: "Estado", valor: <EstadoDeProyecto estado={proyecto.estado} /> },
                  {
                    termino: "Avance",
                    valor: <BarraDeAvance porcentaje={proyecto.porcentajeAvance} etiqueta="Avance del proyecto" />,
                  },
                  { termino: "Docente tutor", valor: proyecto.docenteNombre },
                  {
                    termino: "Fechas",
                    valor: `Desde el ${fechaCorta(proyecto.fechaInicio)}${proyecto.fechaFinPrevista ? `, previsto hasta el ${fechaCorta(proyecto.fechaFinPrevista)}` : ""}`,
                  },
                  {
                    termino: "Equipo",
                    valor: (proyecto.integrantes ?? [])
                      .map((integrante) =>
                        identidadDe(
                          {
                            nombres: integrante.estudianteNombres,
                            apellidos: integrante.estudianteApellidos,
                            codigo: integrante.estudianteCodigo,
                          },
                          minima,
                        ).principal,
                      )
                      .join("\n"),
                    ancho: true,
                  },
                  editable ? null : { termino: "Objetivo", valor: proyecto.objetivo, ancho: true },
                  editable ? null : { termino: "Descripción", valor: proyecto.descripcion, ancho: true },
                  proyecto.resultadoFinal
                    ? {
                        termino: `Resultado final (${fechaCorta(proyecto.fechaFinalizacion)}${proyecto.finalizadoPorNombre ? `, por ${proyecto.finalizadoPorNombre}` : ""})`,
                        valor: proyecto.resultadoFinal,
                        ancho: true,
                      }
                    : null,
                  cancelado
                    ? {
                        termino: `Cancelado (${momentoCorto(proyecto.fechaCancelacion)}${proyecto.canceladoPorNombre ? `, por ${proyecto.canceladoPorNombre}` : ""})`,
                        valor: proyecto.motivoCancelacion,
                        ancho: true,
                      }
                    : null,
                  minima ? null : { termino: "Registrado", valor: [momentoCorto(proyecto.fechaRegistro), proyecto.creadoPorNombre].filter(Boolean).join(", por ") },
                ]}
              />
            </div>
            {gestiona && !editable && proyecto.motivoNoEditable ? (
              <p className="mt-6 flex items-start gap-2.5 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
                <Lock aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                <span>{proyecto.motivoNoEditable}</span>
              </p>
            ) : null}
          </section>

          {editable && opcionesConEquipo ? (
            <section aria-label="Editar el proyecto">
              <FormularioProyecto
                key={`proyecto-${id}`}
                proyectoId={id}
                iniciales={datosDe(proyecto)}
                integrantesIniciales={idsDeIntegrantes(proyecto)}
                clubes={opcionesConEquipo}
                hoy={hoy}
              />
            </section>
          ) : null}

          <section aria-labelledby="evidencias-del-proyecto">
            <h2 id="evidencias-del-proyecto" className="text-lg font-medium">
              Evidencias vinculadas
            </h2>
            <div className="mt-4">
              {ajustaEvidencias && evidencias ? (
                <EvidenciasDelProyecto key={`evidencias-${id}`} proyectoId={id} candidatas={candidatas} vinculadas={vinculadas} />
              ) : (proyecto.evidencias ?? []).length === 0 ? (
                <p className="text-[0.9375rem] text-tenue">El proyecto no tiene evidencias vinculadas.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(proyecto.evidencias ?? []).map((evidencia) => (
                    <li key={evidencia.evidenciaId} className="rounded-control bg-superficie px-3.5 py-3 text-[0.9375rem]">
                      <span className="break-words font-medium">{evidencia.titulo}</span>
                      <span className="mt-0.5 block text-sm text-tenue">
                        {[evidencia.tipo ? NOMBRES_DE_TIPO_DE_EVIDENCIA[evidencia.tipo] : null, fechaCorta(evidencia.fechaEvidencia), evidencia.estado === "RETIRADA" ? "Retirada" : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="avances-del-proyecto" className="rounded-pieza border border-linea p-5">
            <h2 id="avances-del-proyecto" className="text-lg font-medium">
              Avances
            </h2>
            <p className="cifras mt-2 text-[0.9375rem] text-tenue">
              {proyecto.avancesRegistrados === 1 ? "1 avance registrado" : `${proyecto.avancesRegistrados ?? 0} avances registrados`}
              {proyecto.fechaUltimoAvance ? `, el último el ${fechaCorta(proyecto.fechaUltimoAvance)}` : ""}.
            </p>
            {avances && avances.length > 0 ? (
              <div className="mt-4">
                <ListaDeAvances avances={avances} minima={minima} />
              </div>
            ) : null}
            {puedeRegistrarAvances(usuario.rol) && enDesarrollo && editable ? (
              <EnlaceBoton href={rutaDeNuevoAvance("PROYECTO", clubId, id)} variante="secundario" className="mt-4 w-full">
                <Plus aria-hidden="true" size={16} />
                Registrar avance
              </EnlaceBoton>
            ) : null}
          </section>
          {editable && enDesarrollo && proyecto.fechaInicio ? (
            <FinalizarProyecto key={`finalizar-${id}`} proyectoId={id} inicio={proyecto.fechaInicio} hoy={hoy} />
          ) : null}
          {editable && enDesarrollo ? (
            <ResolverConMotivo
              key={`cancelacion-${id}`}
              titulo="Cancelar el proyecto"
              descripcion="Úsalo si el equipo abandona el proyecto. Queda en el historial con su motivo y ya no se modifica."
              etiqueta="Cancelar proyecto"
              confirmar="Sí, cancelar"
              textoCargando="Cancelando"
              minimo={1}
              icono={<Ban aria-hidden="true" size={16} />}
              destino={rutaDeProyecto(id, "cancelado")}
              resolver={cancelarProyecto.bind(null, id)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function PaginaProyecto(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_PROYECTOS}>Volver a proyectos</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando el proyecto." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

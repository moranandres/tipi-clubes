import type { Metadata } from "next";
import { Info, Users } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { PanelDeEmision } from "@/components/portal/certificados/PanelDeEmision";
import { ResultadoDelParticipante } from "@/components/portal/certificados/ResultadoDelParticipante";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
import {
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { listarParticipantesDeCurso, type ParticipanteDeCurso } from "@/lib/api/certificados";
import { obtenerCurso } from "@/lib/api/cursos";
import { RUTA_EMITIR_CERTIFICADO, rutaDeEmision } from "@/lib/portal/filtros-certificados";
import { NOMBRES_DE_ESTADO_DE_CURSO, PUNTOS_DE_ESTADO_DE_CURSO } from "@/lib/portal/filtros-cursos";
import { identidadDe } from "@/lib/portal/identidad";
import {
  puedeEmitirCertificados,
  puedeRegistrarResultadosDeCurso,
  soloVeDatosMinimos,
} from "@/lib/portal/permisos";
import {
  NOMBRES_DE_ESTADO_EN_CURSO,
  NOMBRES_DE_RESULTADO_DE_CURSO,
  PUNTOS_DE_RESULTADO_DE_CURSO,
  esResultadoDeCurso,
  opcionesDeEmisionDeCurso,
} from "@/lib/portal/reglas-certificados";
import { fechaCorta } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Participantes del curso",
};

type Props = PageProps<"/portal/certificados/cursos/[cursoId]">;

const RECURSO = { recurso: "cursos para certificar", rutaDeLista: rutaDeEmision("curso") };
const NO_ENCONTRADO = "Este curso no existe";
const FINALIZADA = "FINALIZADA";

function fechasDe(participante: ParticipanteDeCurso): string {
  const ingreso = fechaCorta(participante.fechaIngreso);
  const fin = fechaCorta(participante.fechaFin);
  return [ingreso ? `Ingresó el ${ingreso}` : null, fin ? `hasta el ${fin}` : null].filter(Boolean).join(" ");
}

function ResultadoActual({ resultado }: { resultado?: string }) {
  return esResultadoDeCurso(resultado) ? (
    <PuntoDeEstado punto={PUNTOS_DE_RESULTADO_DE_CURSO[resultado]}>
      {NOMBRES_DE_RESULTADO_DE_CURSO[resultado]}
    </PuntoDeEstado>
  ) : (
    <span className="text-tenue">Sin resultado</span>
  );
}

async function Contenido({ params }: Pick<Props, "params">) {
  const [{ cursoId: segmento }, usuario] = await Promise.all([params, exigirSesion()]);
  const cursoId = idDe(segmento);

  if (!cursoId) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const [curso, participantes] = await Promise.all([obtenerCurso(cursoId), listarParticipantesDeCurso(cursoId)]);

  if (curso.estado === "no-encontrado" || participantes.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (participantes.estado === "denegado") {
    return <AvisoDenegado mensaje={participantes.mensaje} {...RECURSO} />;
  }
  if (curso.estado === "denegado") {
    return <AvisoDenegado mensaje={curso.mensaje} {...RECURSO} />;
  }
  if (curso.estado === "sin-servicio" || participantes.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const datos = curso.datos;
  const nombre = datos.nombre ?? "Curso";
  const lista = participantes.datos;
  const minima = soloVeDatosMinimos(usuario.rol);
  const registra = puedeRegistrarResultadosDeCurso(usuario.rol);
  const emite = puedeEmitirCertificados(usuario.rol);
  const finalizados = lista.filter((participante) => participante.estado === FINALIZADA).length;

  return (
    <>
      <EncabezadoDeGestion
        titulo={nombre}
        detalle={[datos.clubNombre, datos.institucionNombre].filter(Boolean).join(" · ")}
      />
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
        {datos.estado ? (
          <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_CURSO[datos.estado]}>
            Curso {NOMBRES_DE_ESTADO_DE_CURSO[datos.estado].toLowerCase()}
          </PuntoDeEstado>
        ) : null}
        <span className="cifras text-tenue">
          {lista.length === 1 ? "1 participante" : `${lista.length} participantes`}, {finalizados}{" "}
          {finalizados === 1 ? "terminó" : "terminaron"} el curso
        </span>
      </div>
      {datos.estado !== "FINALIZADO" && lista.length > 0 ? (
        <p className="mt-6 flex max-w-[70ch] items-start gap-2.5 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
          <Info aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          <span>
            El resultado final y los certificados de curso se registran cuando el curso se finaliza:
            en ese momento las inscripciones activas pasan a Terminó el curso.
          </span>
        </p>
      ) : null}

      {lista.length === 0 ? (
        <div className="mt-8">
          <AvisoDeLista icono={<Users size={20} />} titulo="Este curso no tiene participantes">
            Cuando los integrantes del club se inscriban en el curso aparecerán aquí con su
            resultado.
          </AvisoDeLista>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {lista.map((participante) => {
            const identidad = identidadDe(
              {
                nombres: participante.estudianteNombres,
                apellidos: participante.estudianteApellidos,
                codigo: participante.estudianteCodigo,
              },
              minima,
            );
            const terminado = participante.estado === FINALIZADA;
            const id = participante.inscripcionCursoId ?? 0;
            return (
              <li key={id} className="rounded-pieza bg-superficie p-4 sm:p-5">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)_minmax(0,22rem)] lg:items-start">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{identidad.principal}</p>
                    {identidad.codigo ? (
                      <p className="cifras mt-0.5 text-sm text-tenue">{identidad.codigo}</p>
                    ) : null}
                    <p className="mt-2 text-sm">
                      {NOMBRES_DE_ESTADO_EN_CURSO[participante.estado ?? ""] ?? participante.estado}
                    </p>
                    <p className="cifras mt-0.5 text-sm text-tenue">{fechasDe(participante)}</p>
                  </div>
                  <div className="min-w-0">
                    {registra && terminado ? (
                      <ResultadoDelParticipante
                        key={`resultado-${id}`}
                        inscripcionCursoId={id}
                        estado={participante.estado}
                        resultado={participante.resultado}
                        certificadosVigentes={participante.certificadosVigentes ?? []}
                        curso={nombre}
                        estudiante={identidad.principal}
                      />
                    ) : (
                      <div>
                        <p className="text-sm text-tenue">Resultado final</p>
                        <p className="mt-1">
                          <ResultadoActual resultado={participante.resultado} />
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    {emite && terminado ? (
                      <PanelDeEmision
                        compacto
                        origenId={id}
                        opciones={opcionesDeEmisionDeCurso(participante, nombre)}
                      />
                    ) : (participante.certificadosVigentes ?? []).length > 0 ? (
                      <p className="text-sm text-tenue">
                        {(participante.certificadosVigentes ?? []).length === 1
                          ? "1 certificado vigente"
                          : `${(participante.certificadosVigentes ?? []).length} certificados vigentes`}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function PaginaParticipantesDelCurso({ params }: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_EMITIR_CERTIFICADO}>Volver a la emisión</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando los participantes del curso." />}>
        <Contenido params={params} />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Lock, TriangleAlert, XCircle } from "lucide-react";
import { Suspense } from "react";
import {
  AvisoDenegado,
  AvisoNoEncontrado,
  AvisoSinServicio,
} from "@/components/portal/formularios/AvisosDeGestion";
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
import { AprobarSolicitud } from "@/components/portal/solicitudes/AprobarSolicitud";
import { TomarEnRevision } from "@/components/portal/solicitudes/TomarEnRevision";
import { cancelarSolicitud, consultarVerificacion, rechazarSolicitud } from "@/lib/acciones/solicitudes";
import { obtenerEstudiante } from "@/lib/api/estudiantes";
import { listarCursosAbiertos, obtenerSolicitud, type Solicitud } from "@/lib/api/solicitudes";
import { NOMBRES_DE_NIVEL } from "@/lib/portal/filtros-cursos";
import { AUTORIZACION_OTORGADA, RUTA_ESTUDIANTES } from "@/lib/portal/filtros-estudiantes";
import {
  NOMBRES_DE_ESTADO_DE_SOLICITUD,
  RUTA_SOLICITUDES,
  type EstadoSolicitud,
} from "@/lib/portal/filtros-solicitudes";
import { identidadDe } from "@/lib/portal/identidad";
import { opcionesDeCursos } from "@/lib/portal/opciones";
import {
  esDocente,
  puedeAutorizarSobrecupo,
  puedeRegistrarSolicitudes,
  puedeResolverSolicitudes,
  soloVeDatosMinimos,
} from "@/lib/portal/permisos";
import { momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion, type UsuarioSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Solicitud de inscripción",
};

type Props = PageProps<"/portal/solicitudes/[id]">;

const RECURSO = { recurso: "solicitudes", rutaDeLista: RUTA_SOLICITUDES };
const NO_ENCONTRADA = "Esta solicitud no existe";
const ABIERTAS: readonly EstadoSolicitud[] = ["PENDIENTE", "EN_REVISION"];

const AVISOS: Record<string, string> = {
  "en-revision": "Tomaste la solicitud en revisión. Comprueba los requisitos y resuélvela.",
  aprobada: "La solicitud se aprobó. El estudiante ya es integrante del club.",
  rechazada: "La solicitud se rechazó y el motivo quedó registrado.",
  cancelada: "La solicitud se canceló y el motivo quedó registrado.",
};

function porQuien(nombre?: string, fecha?: string): string {
  return [momentoCorto(fecha), nombre ? `por ${nombre}` : null].filter(Boolean).join(", ");
}

function pasosDe(solicitud: Solicitud): Paso[] {
  const estado = solicitud.estado ?? "PENDIENTE";
  const revisada = Boolean(solicitud.fechaRevision);
  const final = !ABIERTAS.includes(estado);

  const registro: Paso = {
    titulo: "Registrada",
    detalle: porQuien(solicitud.solicitadoPorNombre, solicitud.fechaSolicitud),
    estado: "hecho",
  };

  const revision: Paso = {
    titulo: "En revisión",
    detalle: revisada ? porQuien(solicitud.revisadoPorNombre, solicitud.fechaRevision) : undefined,
    estado:
      estado === "EN_REVISION"
        ? "actual"
        : revisada
          ? "hecho"
          : estado === "PENDIENTE"
            ? "pendiente"
            : "detenido",
  };

  const resolucion: Paso = {
    titulo: final ? NOMBRES_DE_ESTADO_DE_SOLICITUD[estado] : "Aprobada o rechazada",
    detalle: final ? porQuien(solicitud.resueltoPorNombre, solicitud.fechaResolucion) : undefined,
    estado: estado === "APROBADA" ? "hecho" : final ? "detenido" : "pendiente",
  };

  if (estado === "CANCELADA" && !revisada) {
    return [registro, { ...resolucion, titulo: "Cancelada" }];
  }

  return [registro, revision, resolucion];
}

function textoConNivel(nombre?: string, nivel?: Solicitud["nivel"]): string | null {
  const partes = [nombre, nivel ? NOMBRES_DE_NIVEL[nivel] : null].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

function BloqueoPorAutoria() {
  return (
    <section className="rounded-pieza border border-linea p-5">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        <Lock aria-hidden="true" size={18} className="text-tenue" />
        Revisión a cargo de otra persona
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        Tú registraste esta solicitud. Por separación de funciones, otro responsable institucional
        o un administrador debe tomarla en revisión y resolverla.
      </p>
    </section>
  );
}

function AvisoSinAutorizacion({ estudianteId }: { estudianteId?: number }) {
  return (
    <p
      role="note"
      className="mt-6 flex items-start gap-2.5 rounded-control border border-aviso/60 bg-superficie px-4 py-3 text-[0.9375rem]"
    >
      <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-aviso" />
      <span className="min-w-0">
        El estudiante todavía no tiene la autorización de participación otorgada. La solicitud no
        se podrá aprobar hasta que se registre firmada por su representante.
        {estudianteId ? (
          <>
            {" "}
            <Link href={`${RUTA_ESTUDIANTES}/${estudianteId}`} className="font-medium text-acento">
              Ver la ficha del estudiante
            </Link>
          </>
        ) : null}
      </span>
    </p>
  );
}

function puedeCancelar(usuario: UsuarioSesion, solicitud: Solicitud): boolean {
  if (!puedeRegistrarSolicitudes(usuario.rol)) {
    return false;
  }
  return esDocente(usuario.rol) ? solicitud.solicitadoPorId === usuario.id : true;
}

async function PanelDeAprobacion({ solicitud, usuario, destino }: { solicitud: Solicitud; usuario: UsuarioSesion; destino: string }) {
  const id = solicitud.id as number;
  const [cursos, verificacion] = await Promise.all([
    solicitud.clubId ? listarCursosAbiertos(solicitud.clubId) : Promise.resolve(null),
    consultarVerificacion(id, null, null),
  ]);

  return (
    <AprobarSolicitud
      key={id}
      solicitudId={id}
      iniciales={{
        nivelAsignado: solicitud.nivel ?? "",
        cursoId: solicitud.cursoId ? String(solicitud.cursoId) : "",
        observacion: "",
        autorizarSobrecupo: "",
      }}
      cursos={cursos ? opcionesDeCursos(cursos) : null}
      verificacionInicial={verificacion}
      puedeSobrecupo={puedeAutorizarSobrecupo(usuario.rol)}
      destino={destino}
    />
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

  const resultado = await obtenerSolicitud(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const solicitud = resultado.datos;
  const estado = solicitud.estado ?? "PENDIENTE";
  const abierta = ABIERTAS.includes(estado);
  const minima = soloVeDatosMinimos(usuario.rol);
  const resolutor = puedeResolverSolicitudes(usuario.rol);
  const autor = solicitud.solicitadoPorId === usuario.id;
  const ruta = `${RUTA_SOLICITUDES}/${id}`;

  const estudiante =
    abierta && !minima && solicitud.estudianteId
      ? await obtenerEstudiante(solicitud.estudianteId)
      : null;
  const sinAutorizacion =
    estudiante?.estado === "ok" &&
    estudiante.datos.autorizacionParticipacion !== AUTORIZACION_OTORGADA;

  const identidad = identidadDe(
    {
      nombres: solicitud.estudianteNombres,
      apellidos: solicitud.estudianteApellidos,
      codigo: solicitud.estudianteCodigo,
    },
    minima,
  );
  const aviso = typeof consulta.aviso === "string" ? AVISOS[consulta.aviso] : undefined;
  const conPanelDeAccion = abierta && !minima;

  return (
    <>
      <EncabezadoDeGestion
        titulo={identidad.principal}
        detalle={[identidad.codigo, solicitud.clubNombre, solicitud.institucionNombre]
          .filter(Boolean)
          .join(" · ")}
      />
      {aviso ? <AvisoDeResultado>{aviso}</AvisoDeResultado> : null}
      {sinAutorizacion ? <AvisoSinAutorizacion estudianteId={solicitud.estudianteId} /> : null}
      <div className={conPanelDeAccion ? COLUMNAS_DE_GESTION : "mt-8 max-w-[52rem]"}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="avance">
            <h2 id="avance" className="text-lg font-medium">
              Avance de la solicitud
            </h2>
            <div className="mt-4">
              <PasosDeTramite etiqueta="Etapas de la solicitud" pasos={pasosDe(solicitud)} />
            </div>
          </section>
          <section aria-labelledby="detalle">
            <h2 id="detalle" className="text-lg font-medium">
              Detalle
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  { termino: "Club", valor: solicitud.clubNombre },
                  {
                    termino: "Curso solicitado",
                    valor: solicitud.cursoNombre ?? "Solo el club",
                  },
                  {
                    termino: "Nivel declarado",
                    valor: solicitud.nivel ? NOMBRES_DE_NIVEL[solicitud.nivel] : null,
                  },
                  {
                    termino: "Asignado al aprobar",
                    valor: textoConNivel(
                      solicitud.cursoAsignadoNombre ??
                        (estado === "APROBADA" ? "Solo el club" : undefined),
                      solicitud.nivelAsignado,
                    ),
                  },
                  solicitud.sobrecupoAutorizado
                    ? { termino: "Sobrecupo", valor: "Autorizado por un administrador" }
                    : null,
                  { termino: "Conocimientos previos", valor: solicitud.conocimientos, ancho: true },
                  { termino: "Experiencia previa", valor: solicitud.experienciaPrevia, ancho: true },
                  { termino: "Motivación", valor: solicitud.motivacion, ancho: true },
                  {
                    termino:
                      estado === "APROBADA" ? "Observación de la aprobación" : "Motivo de la resolución",
                    valor: solicitud.observacionResolucion,
                    ancho: true,
                  },
                ]}
              />
            </div>
          </section>
        </div>
        {conPanelDeAccion ? (
          <div className="flex min-w-0 flex-col gap-6">
            {resolutor && autor ? <BloqueoPorAutoria /> : null}
            {resolutor && !autor && estado === "PENDIENTE" ? (
              <TomarEnRevision key={id} solicitudId={id} destino={`${ruta}?aviso=en-revision`} />
            ) : null}
            {resolutor && !autor && estado === "EN_REVISION" ? (
              <>
                <PanelDeAprobacion
                  solicitud={solicitud}
                  usuario={usuario}
                  destino={`${ruta}?aviso=aprobada`}
                />
                <ResolverConMotivo
                  key={`rechazo-${id}`}
                  titulo="Rechazar la solicitud"
                  descripcion="El estudiante no entra al club. El motivo queda registrado y se muestra a quien registró la solicitud."
                  etiqueta="Rechazar solicitud"
                  confirmar="Sí, rechazar"
                  textoCargando="Rechazando"
                  icono={<XCircle aria-hidden="true" size={16} />}
                  destino={`${ruta}?aviso=rechazada`}
                  resolver={rechazarSolicitud.bind(null, id)}
                />
              </>
            ) : null}
            {!resolutor && estado === "PENDIENTE" ? (
              <section className="rounded-pieza border border-linea p-5">
                <h2 className="text-lg font-medium">Pendiente de revisión</h2>
                <p className="mt-2 text-[0.9375rem] text-tenue">
                  El responsable de la institución o un administrador la tomará en revisión.
                </p>
              </section>
            ) : null}
            {puedeCancelar(usuario, solicitud) ? (
              <ResolverConMotivo
                key={`cancelacion-${id}`}
                titulo="Cancelar la solicitud"
                descripcion="Úsalo si la familia desiste o se registró por error. La solicitud se cierra sin inscribir al estudiante."
                etiqueta="Cancelar solicitud"
                confirmar="Sí, cancelar"
                textoCargando="Cancelando"
                variante="secundario"
                icono={<Ban aria-hidden="true" size={16} />}
                destino={`${ruta}?aviso=cancelada`}
                resolver={cancelarSolicitud.bind(null, id)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function PaginaSolicitud(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_SOLICITUDES}>Volver a solicitudes</EnlaceVolver>
      <Suspense
        fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la solicitud de inscripción." />}
      >
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

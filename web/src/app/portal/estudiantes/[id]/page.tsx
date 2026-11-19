import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Suspense } from "react";
import {
  AutorizacionesDelEstudiante,
  EsqueletoAutorizacionesDelEstudiante,
} from "@/components/portal/autorizaciones/AutorizacionesDelEstudiante";
import { AnonimizarEstudiante } from "@/components/portal/estudiantes/AnonimizarEstudiante";
import { EliminarEstudiante } from "@/components/portal/estudiantes/EliminarEstudiante";
import { EstadoDelEstudiante } from "@/components/portal/estudiantes/EstadoDelEstudiante";
import { FormularioEstudiante } from "@/components/portal/estudiantes/FormularioEstudiante";
import { HistorialDelEstudiante } from "@/components/portal/estudiantes/HistorialDelEstudiante";
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
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { obtenerHistorial, type Estudiante, type Historial } from "@/lib/api/estudiantes";
import { rutaDeGestion } from "@/lib/portal/filtros-autorizaciones";
import {
  AUTORIZACION_OTORGADA,
  NOMBRES_DE_ESTADO_DE_ESTUDIANTE,
  PUNTOS_DE_ESTADO_DE_ESTUDIANTE,
  RUTA_ESTUDIANTES,
} from "@/lib/portal/filtros-estudiantes";
import { identidadDe } from "@/lib/portal/identidad";
import {
  puedeGestionarEstudiantes,
  puedeRegistrarEstudiantes,
  soloVeDatosMinimos,
} from "@/lib/portal/permisos";
import type { DatosDeEstudiante } from "@/lib/portal/reglas-estudiantes";
import { momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Ficha del estudiante",
};

type Props = PageProps<"/portal/estudiantes/[id]">;

const RECURSO = { recurso: "estudiantes", rutaDeLista: RUTA_ESTUDIANTES };
const AVISO_CREADO = "creado";
const AVISO_ANONIMIZADO = "anonimizado";
const ESTADO_ACTIVO = "ACTIVO";
const NO_ENCONTRADO = "Este estudiante no existe";

function datosDe(estudiante: Estudiante): DatosDeEstudiante {
  return {
    institucionId: estudiante.institucionId ? String(estudiante.institucionId) : "",
    nombres: estudiante.nombres ?? "",
    apellidos: estudiante.apellidos ?? "",
    curso: estudiante.curso ?? "",
  };
}

function sinHistorial(historial: Historial): boolean {
  const { resumen } = historial;
  return !resumen.clubes && !resumen.competencias && !resumen.certificadosVigentes && !resumen.certificadosAnulados;
}

function bloqueoDeAnonimizacion(estado: string, clubesActivos: number): string | null {
  if (clubesActivos > 0) {
    return "Sigue activo en algún club. Tramita primero su retiro y después márcalo como retirado o egresado.";
  }
  if (estado === ESTADO_ACTIVO) {
    return "El estudiante está activo. Márcalo primero como retirado o egresado.";
  }
  return null;
}

function AvisoSinAutorizacion({ estudianteId }: { estudianteId: number }) {
  return (
    <p
      role="note"
      className="mt-6 flex items-start gap-2.5 rounded-control border border-aviso/60 bg-superficie px-4 py-3 text-[0.9375rem]"
    >
      <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-aviso" />
      <span className="min-w-0">
        Este estudiante no tiene la autorización de participación otorgada. Puedes registrar su
        solicitud de inscripción, pero no se podrá aprobar hasta que el representante la firme.{" "}
        <Link
          href={rutaDeGestion(estudianteId, "PARTICIPACION")}
          className="font-medium text-acento"
        >
          Registrar la autorización de participación
        </Link>
      </span>
    </p>
  );
}

function InsigniaAnonimizado() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-linea bg-superficie px-3 py-1 text-sm font-medium">
      <ShieldCheck aria-hidden="true" size={14} className="text-acento" />
      Anonimizado
    </span>
  );
}

function AvisoDeAnonimizacion({ estudiante, minima }: { estudiante: Estudiante; minima: boolean }) {
  return (
    <section
      aria-labelledby="anonimizacion"
      className="mt-6 flex items-start gap-3 rounded-pieza border border-linea bg-superficie px-5 py-4"
    >
      <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-acento" />
      <div className="min-w-0">
        <h2 id="anonimizacion" className="font-medium">
          Datos personales anonimizados
        </h2>
        <p className="mt-1 text-[0.9375rem] text-tenue">
          {estudiante.fechaAnonimizacion
            ? `Desde el ${momentoCorto(estudiante.fechaAnonimizacion)}. `
            : null}
          Solo se conservan el código interno y los registros históricos para las estadísticas del
          proyecto. El registro ya no se edita ni admite nuevas inscripciones.
        </p>
        {!minima && estudiante.motivoAnonimizacion ? (
          <p className="mt-2 break-words text-[0.9375rem]">
            <span className="text-tenue">Motivo: </span>
            {estudiante.motivoAnonimizacion}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AutorizacionesDepuradas() {
  return (
    <section aria-labelledby="autorizaciones" className="rounded-pieza border border-linea p-5">
      <h2 id="autorizaciones" className="text-lg font-medium">
        Autorizaciones del representante
      </h2>
      <p className="mt-3 text-[0.9375rem] text-tenue">
        Se depuraron al anonimizar al estudiante: se eliminaron los datos del representante legal,
        las observaciones y los documentos firmados. Solo queda el estado que tenían, para las
        estadísticas.
      </p>
    </section>
  );
}

function AnonimizacionBloqueada({ motivo }: { motivo: string }) {
  return (
    <section aria-labelledby="anonimizar" className="rounded-pieza border border-linea p-5">
      <h2 id="anonimizar" className="text-lg font-medium">
        Anonimizar datos personales
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">
        Retira los datos identificables de un estudiante con historial y conserva solo su código
        interno y sus registros para las estadísticas.
      </p>
      <p className="mt-3 flex items-start gap-2.5 text-[0.9375rem]">
        <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-aviso" />
        <span className="min-w-0">{motivo}</span>
      </p>
    </section>
  );
}

function DatosDeSoloLectura({ estudiante }: { estudiante: Estudiante }) {
  return (
    <section aria-labelledby="datos">
      <h2 id="datos" className="text-lg font-medium">
        Datos del estudiante
      </h2>
      <div className="mt-4">
        <ListaDeDatos
          datos={[
            { termino: "Código interno", valor: estudiante.codigoInterno },
            { termino: "Curso educativo", valor: estudiante.cursoEtiqueta },
            { termino: "Institución", valor: estudiante.institucionNombre },
            {
              termino: "Estado",
              valor: estudiante.estado ? NOMBRES_DE_ESTADO_DE_ESTUDIANTE[estudiante.estado] : null,
            },
            { termino: "Registrado", valor: momentoCorto(estudiante.createdAt) },
            estudiante.anonimizado
              ? { termino: "Anonimizado", valor: momentoCorto(estudiante.fechaAnonimizacion) }
              : null,
          ]}
        />
      </div>
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
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const resultado = await obtenerHistorial(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const historial = resultado.datos;
  const { estudiante } = historial;
  const minima = soloVeDatosMinimos(usuario.rol);
  const editable = puedeRegistrarEstudiantes(usuario.rol);
  const gestionable = puedeGestionarEstudiantes(usuario.rol);
  const estado = estudiante.estado ?? ESTADO_ACTIVO;
  const anonimizado = Boolean(estudiante.anonimizado);
  const clubesActivos = historial.resumen.clubesActivos ?? 0;
  const conHistorial = !sinHistorial(historial);
  const bloqueo = bloqueoDeAnonimizacion(estado, clubesActivos);
  const identidad = identidadDe(
    { nombres: estudiante.nombres, apellidos: estudiante.apellidos, codigo: estudiante.codigoInterno },
    minima,
  );
  const sinAutorizacion =
    !minima && !anonimizado && estudiante.autorizacionParticipacion !== AUTORIZACION_OTORGADA;

  return (
    <>
      <EncabezadoDeGestion
        titulo={identidad.principal}
        detalle={[identidad.codigo, estudiante.cursoEtiqueta, estudiante.institucionNombre]
          .filter(Boolean)
          .join(" · ")}
      />
      {anonimizado ? (
        <div className="mt-3">
          <InsigniaAnonimizado />
        </div>
      ) : null}
      {consulta.aviso === AVISO_ANONIMIZADO && anonimizado ? (
        <AvisoDeResultado>
          Los datos personales se anonimizaron. El estudiante figura ahora como{" "}
          {estudiante.codigoInterno} en sus registros históricos.
        </AvisoDeResultado>
      ) : null}
      {anonimizado ? <AvisoDeAnonimizacion estudiante={estudiante} minima={minima} /> : null}
      {consulta.aviso === AVISO_CREADO ? (
        <AvisoDeResultado>
          El estudiante se registró con el código {estudiante.codigoInterno}. El siguiente paso es
          registrar la autorización de participación firmada por su representante.{" "}
          <Link
            href={rutaDeGestion(id, "PARTICIPACION")}
            className="font-medium text-acento"
          >
            Registrarla ahora
          </Link>
        </AvisoDeResultado>
      ) : sinAutorizacion && estado === ESTADO_ACTIVO ? (
        <AvisoSinAutorizacion estudianteId={id} />
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0">
          {editable && !anonimizado ? (
            <FormularioEstudiante
              key={id}
              estudianteId={id}
              iniciales={datosDe(estudiante)}
              instituciones={null}
              institucionFija={estudiante.institucionNombre ?? "Institución"}
            />
          ) : (
            <DatosDeSoloLectura estudiante={estudiante} />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {minima ? null : anonimizado ? (
            <AutorizacionesDepuradas />
          ) : (
            <Suspense fallback={<EsqueletoAutorizacionesDelEstudiante />}>
              <AutorizacionesDelEstudiante estudianteId={id} />
            </Suspense>
          )}
          {gestionable && !anonimizado ? (
            <EstadoDelEstudiante
              key={`estado-${id}`}
              estudianteId={id}
              estado={estado}
              clubesActivos={clubesActivos}
            />
          ) : editable ? (
            <section className="rounded-pieza border border-linea p-5">
              <h2 className="text-lg font-medium">Estado del estudiante</h2>
              <p className="mt-3 font-medium">
                <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_ESTUDIANTE[estado]}>
                  {NOMBRES_DE_ESTADO_DE_ESTUDIANTE[estado]}
                </PuntoDeEstado>
              </p>
              <p className="mt-3 text-sm text-tenue">
                {anonimizado
                  ? "El registro está anonimizado y su estado ya no cambia."
                  : "Solo el administrador y el responsable institucional cambian el estado."}
              </p>
            </section>
          ) : null}
          {gestionable && !anonimizado && conHistorial ? (
            bloqueo ? (
              <AnonimizacionBloqueada motivo={bloqueo} />
            ) : (
              <AnonimizarEstudiante
                key={`anonimizar-${id}`}
                estudianteId={id}
                codigo={estudiante.codigoInterno}
              />
            )
          ) : null}
          {gestionable && !conHistorial ? (
            <EliminarEstudiante key={`eliminar-${id}`} estudianteId={id} />
          ) : null}
        </div>
      </div>
      <div className="mt-12 border-t border-linea pt-10">
        <HistorialDelEstudiante historial={historial} />
      </div>
    </>
  );
}

export default function PaginaFichaDeEstudiante(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_ESTUDIANTES}>Volver a estudiantes</EnlaceVolver>
      <Suspense
        fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la ficha del estudiante." />}
      >
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

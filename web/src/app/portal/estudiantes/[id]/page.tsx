import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Suspense } from "react";
import {
  AutorizacionesDelEstudiante,
  EsqueletoAutorizacionesDelEstudiante,
} from "@/components/portal/autorizaciones/AutorizacionesDelEstudiante";
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
  const identidad = identidadDe(
    { nombres: estudiante.nombres, apellidos: estudiante.apellidos, codigo: estudiante.codigoInterno },
    minima,
  );
  const sinAutorizacion =
    !minima && estudiante.autorizacionParticipacion !== AUTORIZACION_OTORGADA;

  return (
    <>
      <EncabezadoDeGestion
        titulo={identidad.principal}
        detalle={[identidad.codigo, estudiante.cursoEtiqueta, estudiante.institucionNombre]
          .filter(Boolean)
          .join(" · ")}
      />
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
          {editable ? (
            <FormularioEstudiante
              key={id}
              estudianteId={id}
              iniciales={datosDe(estudiante)}
              instituciones={null}
              institucionFija={estudiante.institucionNombre ?? "Institución"}
            />
          ) : (
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
                      valor: estudiante.estado
                        ? NOMBRES_DE_ESTADO_DE_ESTUDIANTE[estudiante.estado]
                        : null,
                    },
                    { termino: "Registrado", valor: momentoCorto(estudiante.createdAt) },
                  ]}
                />
              </div>
            </section>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {minima ? null : (
            <Suspense fallback={<EsqueletoAutorizacionesDelEstudiante />}>
              <AutorizacionesDelEstudiante estudianteId={id} />
            </Suspense>
          )}
          {gestionable ? (
            <EstadoDelEstudiante
              key={id}
              estudianteId={id}
              estado={estado}
              clubesActivos={historial.resumen.clubesActivos ?? 0}
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
                Solo el administrador y el responsable institucional cambian el estado.
              </p>
            </section>
          ) : null}
          {gestionable && sinHistorial(historial) ? <EliminarEstudiante key={id} estudianteId={id} /> : null}
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

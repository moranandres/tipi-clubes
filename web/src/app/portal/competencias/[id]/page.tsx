import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelDeEmision } from "@/components/portal/certificados/PanelDeEmision";
import { ListaDeCertificados } from "@/components/portal/certificados/PiezasDeCertificado";
import {
  NivelDeCategoria,
  ResultadoDeParticipacion,
} from "@/components/portal/competencias/PiezasDeCompetencia";
import { FormularioResultado } from "@/components/portal/competencias/FormularioResultado";
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
import { ListaDeDatos } from "@/components/portal/ListaDeDatos";
import { eliminarParticipacion } from "@/lib/acciones/competencias";
import { listarCertificadosDeEstudiante } from "@/lib/api/certificados";
import { listarEdiciones, obtenerParticipacion, type Participacion } from "@/lib/api/competencias";
import { RUTA_COMPETENCIAS } from "@/lib/portal/filtros-competencias";
import { identidadDe } from "@/lib/portal/identidad";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import {
  puedeEmitirCertificados,
  puedeRegistrarParticipaciones,
  soloVeDatosMinimos,
} from "@/lib/portal/permisos";
import { opcionesDeEmisionDeCompetencia } from "@/lib/portal/reglas-certificados";
import { textoDeEdicion, type DatosDeResultado } from "@/lib/portal/reglas-competencias";
import { hoyEnGuayaquil, momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Participación en competencia",
};

type Props = PageProps<"/portal/competencias/[id]">;

const RECURSO = { recurso: "participaciones", rutaDeLista: RUTA_COMPETENCIAS };
const NO_ENCONTRADA = "Esta participación no existe";

const AVISOS: Record<string, string> = {
  registrada:
    "La participación quedó registrada. Completa el puesto o el reconocimiento cuando se conozcan los resultados.",
};

function porQuien(nombre?: string, instante?: string): string | null {
  const momento = momentoCorto(instante);
  if (!momento) {
    return null;
  }
  return nombre ? `${momento}, por ${nombre}` : momento;
}

function resultadosDe(participacion: Participacion): DatosDeResultado {
  return {
    equipoNombre: participacion.equipoNombre ?? "",
    puesto: typeof participacion.puesto === "number" ? String(participacion.puesto) : "",
    reconocimiento: participacion.reconocimiento ?? "",
    observaciones: participacion.observaciones ?? "",
  };
}

async function Contenido({ params, searchParams }: Props) {
  const [{ id: segmento }, consulta, usuario] = await Promise.all([params, searchParams, exigirSesion()]);
  const id = idDe(segmento);

  if (!id) {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const resultado = await obtenerParticipacion(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const participacion = resultado.datos;
  const minima = soloVeDatosMinimos(usuario.rol);
  const registra = puedeRegistrarParticipaciones(usuario.rol);
  const emite = puedeEmitirCertificados(usuario.rol);
  const hoy = hoyEnGuayaquil();
  const aviso = typeof consulta.aviso === "string" ? AVISOS[consulta.aviso] : undefined;

  const [ediciones, certificados] = await Promise.all([
    participacion.competenciaId ? listarEdiciones(participacion.competenciaId) : null,
    !minima && participacion.estudianteId
      ? listarCertificadosDeEstudiante(participacion.estudianteId, false)
      : null,
  ]);

  const edicion = ediciones?.find((candidata) => candidata.id === participacion.edicionId) ?? null;
  const inicioDeEdicion = edicion?.fechaInicio ?? null;
  const suyos = (certificados ?? []).filter((certificado) => certificado.participacionId === id);
  const vigentes = suyos.filter((certificado) => certificado.estado === "EMITIDO");
  const identidad = identidadDe(
    {
      nombres: participacion.estudianteNombres,
      apellidos: participacion.estudianteApellidos,
      codigo: participacion.estudianteCodigo,
    },
    minima,
  );
  const eliminable = registra && certificados !== null && suyos.length === 0;

  return (
    <>
      <EncabezadoDeGestion
        titulo={identidad.principal}
        detalle={[participacion.competenciaNombre, participacion.edicionNombre, participacion.clubNombre]
          .filter(Boolean)
          .join(" · ")}
      />
      {aviso ? <AvisoDeResultado>{aviso}</AvisoDeResultado> : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="resumen-de-participacion">
            <h2 id="resumen-de-participacion" className="text-lg font-medium">
              Resumen de la participación
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  { termino: "Estudiante", valor: identidad.principal },
                  identidad.codigo ? { termino: "Código", valor: identidad.codigo } : null,
                  { termino: "Competencia", valor: participacion.competenciaNombre },
                  {
                    termino: "Edición",
                    valor: edicion ? `${textoDeEdicion(edicion)}${edicion.sede ? ` · ${edicion.sede}` : ""}` : participacion.edicionNombre,
                  },
                  {
                    termino: "Categoría",
                    valor: (
                      <span className="flex flex-wrap items-center gap-x-3">
                        <span className="break-words">{participacion.categoriaNombre}</span>
                        <NivelDeCategoria nivel={participacion.categoriaNivel} />
                      </span>
                    ),
                  },
                  { termino: "Equipo", valor: participacion.equipoNombre ?? "Participación individual" },
                  {
                    termino: "Resultado",
                    valor: (
                      <ResultadoDeParticipacion
                        puesto={participacion.puesto}
                        reconocimiento={participacion.reconocimiento}
                      />
                    ),
                  },
                  { termino: "Club", valor: participacion.clubNombre },
                  tieneAlcanceGlobal(usuario.rol)
                    ? { termino: "Institución", valor: participacion.institucionNombre }
                    : null,
                  registra ? null : { termino: "Observaciones", valor: participacion.observaciones, ancho: true },
                  minima
                    ? null
                    : {
                        termino: "Registrada",
                        valor: porQuien(participacion.registradoPorNombre, participacion.createdAt),
                      },
                  minima
                    ? null
                    : {
                        termino: "Última actualización",
                        valor: porQuien(participacion.actualizadoPorNombre, participacion.updatedAt),
                      },
                ]}
              />
            </div>
          </section>

          {registra ? (
            <section aria-label="Editar el resultado">
              <FormularioResultado
                key={`resultado-${id}`}
                participacionId={id}
                iniciales={resultadosDe(participacion)}
                inicioDeEdicion={inicioDeEdicion}
                hoy={hoy}
              />
            </section>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {emite ? (
            <PanelDeEmision
              key={`emision-${id}`}
              titulo="Certificados de la competencia"
              descripcion="El PDF se genera con el código de verificación y queda registrado en la auditoría."
              origenId={id}
              opciones={opcionesDeEmisionDeCompetencia(
                {
                  inicioDeEdicion,
                  edicionNombre: participacion.edicionNombre ?? "la edición",
                  puesto: participacion.puesto,
                  reconocimiento: participacion.reconocimiento,
                },
                hoy,
                vigentes,
              )}
            />
          ) : null}
          {!minima && suyos.length > 0 ? (
            <section aria-labelledby="certificados-emitidos" className="rounded-pieza border border-linea p-5">
              <h2 id="certificados-emitidos" className="text-lg font-medium">
                Certificados emitidos
              </h2>
              <div className="mt-4">
                <ListaDeCertificados certificados={suyos} />
              </div>
            </section>
          ) : null}
          {eliminable ? (
            <ConfirmarEliminacion
              key={`eliminacion-${id}`}
              titulo="Eliminar la participación"
              descripcion="Úsalo si la inscripción en la competencia se registró por error. Una participación con certificados forma parte del historial y no se elimina."
              etiqueta="Eliminar participación"
              etiquetaDeConfirmacion="Confirmar la eliminación de la participación"
              eliminar={eliminarParticipacion.bind(null, id)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function PaginaParticipacion(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_COMPETENCIAS}>Volver a competencias</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la participación." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Download, Eye, Lock, TriangleAlert } from "lucide-react";
import { Suspense } from "react";
import {
  CodigoDeVerificacion,
  EstadoDeCertificado,
  nombreDeTipo,
} from "@/components/portal/certificados/PiezasDeCertificado";
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
import { BASE_BOTON, TAMANOS_BOTON, VARIANTES_BOTON } from "@/components/ui/estilos-boton";
import { anularCertificado } from "@/lib/acciones/certificados";
import { obtenerCertificado } from "@/lib/api/certificados";
import {
  RUTA_CERTIFICADOS,
  rutaDeCertificado,
  rutaDePdfDeCertificado,
} from "@/lib/portal/filtros-certificados";
import { rutaDeParticipacion } from "@/lib/portal/filtros-competencias";
import { identidadDe } from "@/lib/portal/identidad";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import {
  puedeDescargarCertificados,
  puedeEmitirCertificados,
  soloVeDatosMinimos,
} from "@/lib/portal/permisos";
import { LIMITES_DE_ANULACION, tamanoDeArchivo } from "@/lib/portal/reglas-certificados";
import { fechaCorta, momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Certificado",
};

type Props = PageProps<"/portal/certificados/[id]">;

const RECURSO = { recurso: "certificados", rutaDeLista: RUTA_CERTIFICADOS };
const NO_ENCONTRADO = "Este certificado no existe";
const AVISO_SIN_PDF = "pdf-no-disponible";
const ENLACE_PDF = `${BASE_BOTON} ${TAMANOS_BOTON.normal} w-full`;

const AVISOS: Record<string, string> = {
  emitido: "El certificado se emitió y su PDF quedó guardado con su huella de verificación.",
  anulado: "El certificado quedó anulado. Su código ya figura como no válido en la verificación pública.",
};

function porQuien(fecha: string, nombre?: string): string {
  return nombre ? `${fecha}, por ${nombre}` : fecha;
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

  const resultado = await obtenerCertificado(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADO} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const certificado = resultado.datos;
  const vigente = certificado.estado !== "ANULADO";
  const minima = soloVeDatosMinimos(usuario.rol);
  const descarga = puedeDescargarCertificados(usuario.rol);
  const anula = puedeEmitirCertificados(usuario.rol) && vigente;
  const aviso = typeof consulta.aviso === "string" ? AVISOS[consulta.aviso] : undefined;
  const sinPdf = consulta.aviso === AVISO_SIN_PDF;
  const identidad = identidadDe(
    {
      nombres: certificado.estudianteNombres,
      apellidos: certificado.estudianteApellidos,
      codigo: certificado.estudianteCodigo,
    },
    minima,
  );

  return (
    <>
      <EncabezadoDeGestion
        titulo={certificado.titulo ?? nombreDeTipo(certificado.tipo)}
        detalle={[identidad.principal, nombreDeTipo(certificado.tipo), certificado.clubNombre]
          .filter(Boolean)
          .join(" · ")}
      />
      {aviso ? <AvisoDeResultado>{aviso}</AvisoDeResultado> : null}
      {sinPdf ? (
        <p
          role="alert"
          className="entrada-mensaje mt-6 flex items-start gap-2.5 rounded-control bg-superficie px-4 py-3 text-[0.9375rem]"
        >
          <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-aviso" />
          <span className="min-w-0">
            No pudimos abrir el PDF. Puede que el certificado se haya anulado o que el archivo no
            coincida con su huella registrada; en ese caso avisa al administrador del sistema.
          </span>
        </p>
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="datos-del-certificado">
            <h2 id="datos-del-certificado" className="text-lg font-medium">
              Datos del certificado
            </h2>
            <div className="mt-4">
              <ListaDeDatos
                datos={[
                  { termino: "Estado", valor: <EstadoDeCertificado estado={certificado.estado} /> },
                  {
                    termino: "Código de verificación",
                    valor: <CodigoDeVerificacion codigo={certificado.codigoVerificacion} />,
                  },
                  { termino: "Estudiante", valor: identidad.principal },
                  identidad.codigo ? { termino: "Código del estudiante", valor: identidad.codigo } : null,
                  { termino: "Tipo", valor: nombreDeTipo(certificado.tipo) },
                  { termino: "Club", valor: certificado.clubNombre },
                  tieneAlcanceGlobal(usuario.rol)
                    ? { termino: "Institución", valor: certificado.institucionNombre }
                    : null,
                  {
                    termino: "Emitido",
                    valor: porQuien(fechaCorta(certificado.fechaEmision), certificado.emitidoPorNombre),
                  },
                  certificado.participacionId
                    ? {
                        termino: "Origen",
                        valor: (
                          <Link
                            href={rutaDeParticipacion(certificado.participacionId)}
                            className="font-medium text-acento"
                          >
                            Ver la participación en la competencia
                          </Link>
                        ),
                      }
                    : null,
                  {
                    termino: "Huella SHA-256 del PDF",
                    valor: certificado.archivoHash ? (
                      <span className="cifras break-all text-sm">{certificado.archivoHash}</span>
                    ) : null,
                    ancho: true,
                  },
                  { termino: "Tamaño del PDF", valor: tamanoDeArchivo(certificado.archivoTamano) },
                  certificado.urlVerificacion && vigente
                    ? {
                        termino: "Enlace de verificación pública",
                        valor: <span className="break-all text-sm">{certificado.urlVerificacion}</span>,
                        ancho: true,
                      }
                    : null,
                ]}
              />
            </div>
          </section>

          {!vigente ? (
            <section aria-labelledby="anulacion" className="rounded-pieza bg-superficie p-5">
              <h2 id="anulacion" className="flex items-center gap-2 text-lg font-medium">
                <Ban aria-hidden="true" size={18} className="text-error" />
                Anulación
              </h2>
              <div className="mt-4">
                <ListaDeDatos
                  datos={[
                    {
                      termino: "Anulado",
                      valor: certificado.fechaAnulacion
                        ? porQuien(momentoCorto(certificado.fechaAnulacion), certificado.anuladoPorNombre)
                        : "Sí",
                    },
                    { termino: "Motivo", valor: certificado.motivoAnulacion, ancho: true },
                  ]}
                />
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="documento-pdf" className="rounded-pieza border border-linea p-5">
            <h2 id="documento-pdf" className="text-lg font-medium">
              Documento PDF
            </h2>
            {!vigente ? (
              <p className="mt-2 flex items-start gap-2.5 text-[0.9375rem] text-tenue">
                <Lock aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                <span>El certificado está anulado y su PDF ya no se entrega.</span>
              </p>
            ) : descarga ? (
              <>
                <p className="mt-2 text-[0.9375rem] text-tenue">
                  Cada descarga queda registrada en la auditoría del sistema.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <a
                    href={rutaDePdfDeCertificado(id, false)}
                    target="_blank"
                    rel="noopener"
                    className={`${ENLACE_PDF} ${VARIANTES_BOTON.primario}`}
                  >
                    <Eye aria-hidden="true" size={16} />
                    Ver PDF
                    <span className="sr-only"> (se abre en otra pestaña)</span>
                  </a>
                  <a href={rutaDePdfDeCertificado(id, true)} className={`${ENLACE_PDF} ${VARIANTES_BOTON.secundario}`}>
                    <Download aria-hidden="true" size={16} />
                    Descargar PDF
                  </a>
                </div>
              </>
            ) : (
              <p className="mt-2 flex items-start gap-2.5 text-[0.9375rem] text-tenue">
                <Lock aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                <span>
                  Tu rol consulta el registro del certificado, pero el PDF con los datos del estudiante
                  solo lo descargan su institución y el docente del club.
                </span>
              </p>
            )}
          </section>
          {anula ? (
            <ResolverConMotivo
              key={`anulacion-${id}`}
              titulo="Anular el certificado"
              descripcion="Úsalo si el certificado se emitió con datos incorrectos. Deja de ser válido en la verificación pública y después podrás emitir uno nuevo."
              etiqueta="Anular certificado"
              confirmar="Sí, anular"
              textoCargando="Anulando"
              minimo={LIMITES_DE_ANULACION.motivoMinimo}
              icono={<Ban aria-hidden="true" size={16} />}
              destino={rutaDeCertificado(id, "anulado")}
              resolver={anularCertificado.bind(null, id)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function PaginaCertificado(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_CERTIFICADOS}>Volver a certificados</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando el certificado." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, ShieldAlert, UserCheck } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { FormularioAutorizacion } from "@/components/portal/autorizaciones/FormularioAutorizacion";
import {
  EnlacesDeDocumento,
  EstadoDeAutorizacion,
} from "@/components/portal/autorizaciones/PiezasDeAutorizacion";
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
import {
  obtenerAutorizacionesDeEstudiante,
  type Autorizacion,
  type Representante,
} from "@/lib/api/autorizaciones";
import { obtenerEstudiante } from "@/lib/api/estudiantes";
import {
  DESCRIPCIONES_DE_TIPO_DE_AUTORIZACION,
  NOMBRES_DE_TIPO_DE_AUTORIZACION,
  RUTA_AUTORIZACIONES,
  TIPOS_DE_AUTORIZACION,
  leerOrigenDeGestion,
  rutaDeGestion,
  tipoDeSegmento,
  type OrigenDeGestion,
  type TipoAutorizacion,
} from "@/lib/portal/filtros-autorizaciones";
import { NOMBRES_DE_ESTADO_DE_ESTUDIANTE, RUTA_ESTUDIANTES } from "@/lib/portal/filtros-estudiantes";
import { RUTA_SOLICITUDES } from "@/lib/portal/filtros-solicitudes";
import { identidadDe } from "@/lib/portal/identidad";
import { puedeGestionarAutorizaciones } from "@/lib/portal/permisos";
import { hoyEnGuayaquil, tamanoLegible, type DatosDeAutorizacion } from "@/lib/portal/reglas-autorizaciones";
import { fechaCorta, momentoCorto } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Gestión de autorización",
};

type Props = PageProps<"/portal/autorizaciones/[estudianteId]/[tipo]">;

type Vuelta = {
  ruta: string;
  texto: string;
  recurso: string;
};

const NO_ENCONTRADA = "Esta autorización no existe";
const AVISO_SIN_DOCUMENTO = "documento-no-disponible";
const ESTUDIANTE_ACTIVO = "ACTIVO";

function vueltaDe(origen: OrigenDeGestion, estudianteId: number): Vuelta {
  if (origen.desde === "lista") {
    return { ruta: RUTA_AUTORIZACIONES, texto: "Volver a autorizaciones", recurso: "autorizaciones" };
  }
  if (origen.desde === "solicitud") {
    return {
      ruta: `${RUTA_SOLICITUDES}/${origen.id}`,
      texto: "Volver a la solicitud",
      recurso: "solicitudes",
    };
  }
  return {
    ruta: `${RUTA_ESTUDIANTES}/${estudianteId}`,
    texto: "Volver a la ficha del estudiante",
    recurso: "estudiantes",
  };
}

function datosIniciales(
  autorizacion: Autorizacion | null,
  representante: Representante | null,
): DatosDeAutorizacion {
  return {
    estado: autorizacion?.estado ?? "PENDIENTE",
    fechaRegistro: autorizacion?.fechaRegistro ?? "",
    observacion: autorizacion?.observacion ?? "",
    nombres: representante?.nombres ?? "",
    apellidos: representante?.apellidos ?? "",
    cedula: representante?.cedula ?? "",
    parentesco: representante?.parentesco ?? "",
    telefono: representante?.telefono ?? "",
    correo: representante?.correo ?? "",
  };
}

function documentoTrasRevocacion(autorizacion: Autorizacion | null): boolean {
  if (!autorizacion?.revocadoEn || !autorizacion.documentoSubidoEn) {
    return false;
  }
  return Date.parse(autorizacion.documentoSubidoEn) > Date.parse(autorizacion.revocadoEn);
}

function SelectorDeTipo({
  estudianteId,
  actual,
  autorizaciones,
  origen,
}: {
  estudianteId: number;
  actual: TipoAutorizacion;
  autorizaciones: Autorizacion[];
  origen: OrigenDeGestion;
}) {
  return (
    <nav aria-label="Tipo de autorización" className="mt-6">
      <ul className="grid grid-cols-2 gap-2 sm:inline-grid sm:auto-cols-fr sm:grid-flow-col">
        {TIPOS_DE_AUTORIZACION.map((tipo) => {
          const elegido = tipo === actual;
          const estado = autorizaciones.find((autorizacion) => autorizacion.tipo === tipo)?.estado;
          return (
            <li key={tipo} className="min-w-0">
              <Link
                href={rutaDeGestion(estudianteId, tipo, origen)}
                aria-current={elegido ? "page" : undefined}
                className={`flex h-full select-none flex-col gap-1 rounded-pieza border px-4 py-3 transition-[transform,background-color,border-color] duration-150 ease-salida active:scale-[0.98] sm:min-w-[13rem] ${
                  elegido
                    ? "border-acento bg-superficie-alta"
                    : "border-transparent bg-superficie hover:bg-superficie-alta"
                }`}
              >
                <span className="font-medium">{NOMBRES_DE_TIPO_DE_AUTORIZACION[tipo]}</span>
                <span className="text-sm text-tenue">
                  <EstadoDeAutorizacion estado={estado} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AvisoDeDocumento() {
  return (
    <p
      role="alert"
      className="entrada-mensaje mt-6 flex items-start gap-2.5 rounded-control border border-error/50 bg-superficie px-4 py-3 text-[0.9375rem]"
    >
      <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-error" />
      <span className="min-w-0">
        No pudimos abrir el documento. Es posible que se haya reemplazado o que el servidor no
        responda; revisa el estado actual y vuelve a intentarlo.
      </span>
    </p>
  );
}

function ListaParaAprobar({ solicitudId }: { solicitudId: number }) {
  return (
    <div
      role="status"
      className="entrada-mensaje mt-6 flex flex-col items-start gap-4 rounded-pieza border border-exito/50 bg-superficie p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex min-w-0 items-start gap-2.5 text-[0.9375rem]">
        <UserCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-exito" />
        <span className="min-w-0">
          La autorización de participación está otorgada. Ya puedes volver a la solicitud de
          inscripción y aprobarla.
        </span>
      </p>
      <EnlaceBoton href={`${RUTA_SOLICITUDES}/${solicitudId}`} className="shrink-0">
        Volver a aprobar la solicitud
      </EnlaceBoton>
    </div>
  );
}

function ResumenActual({
  estudianteId,
  tipo,
  autorizacion,
}: {
  estudianteId: number;
  tipo: TipoAutorizacion;
  autorizacion: Autorizacion | null;
}) {
  const estado = autorizacion?.estado ?? "PENDIENTE";
  return (
    <section aria-labelledby="situacion" className="rounded-pieza border border-linea p-5">
      <h2 id="situacion" className="text-lg font-medium">
        Situación actual
      </h2>
      <p className="mt-3 font-medium">
        <EstadoDeAutorizacion estado={estado} />
      </p>
      <p className="mt-2 text-sm text-tenue">{DESCRIPCIONES_DE_TIPO_DE_AUTORIZACION[tipo]}</p>
      <div className="mt-5">
        <ListaDeDatos
          columnas="grid-cols-1"
          datos={[
            {
              termino: "Fecha de firma",
              valor: autorizacion?.fechaRegistro ? fechaCorta(autorizacion.fechaRegistro) : null,
            },
            estado === "REVOCADA"
              ? { termino: "Revocada", valor: momentoCorto(autorizacion?.revocadoEn) }
              : null,
            { termino: "Observación", valor: autorizacion?.observacion },
            { termino: "Última actualización", valor: momentoCorto(autorizacion?.actualizadoEn) },
          ]}
        />
      </div>
      <div className="mt-5 border-t border-linea pt-5">
        <h3 className="text-[0.9375rem] font-medium">Documento de respaldo</h3>
        {autorizacion?.tieneDocumento ? (
          <>
            <p className="mt-2 break-words text-[0.9375rem]">{autorizacion.documentoNombre}</p>
            <p className="cifras mt-0.5 text-sm text-tenue">
              {[
                autorizacion.documentoTamano ? tamanoLegible(autorizacion.documentoTamano) : null,
                autorizacion.documentoSubidoEn
                  ? `cargado el ${momentoCorto(autorizacion.documentoSubidoEn)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-3">
              <EnlacesDeDocumento estudianteId={estudianteId} tipo={tipo} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-tenue">
            Todavía no se cargó el documento firmado. Es obligatorio para otorgarla.
          </p>
        )}
      </div>
    </section>
  );
}

async function Contenido({ params, searchParams }: Props) {
  const [{ estudianteId: segmentoDeId, tipo: segmentoDeTipo }, consulta, usuario] =
    await Promise.all([params, searchParams, exigirSesion()]);
  const estudianteId = idDe(segmentoDeId);
  const tipo = tipoDeSegmento(segmentoDeTipo);
  const origen = leerOrigenDeGestion(consulta);

  if (!estudianteId || !tipo) {
    return (
      <AvisoNoEncontrado
        titulo={NO_ENCONTRADA}
        recurso="autorizaciones"
        rutaDeLista={RUTA_AUTORIZACIONES}
      />
    );
  }
  if (!usuario) {
    return <AvisoSinServicio />;
  }

  const vuelta = vueltaDe(origen, estudianteId);

  if (!puedeGestionarAutorizaciones(usuario.rol)) {
    return (
      <div className="mt-8">
        <AvisoDeLista
          urgente
          icono={<ShieldAlert size={20} />}
          titulo="Tu rol no tiene acceso a las autorizaciones"
          accion={
            <Link href="/portal" className="font-medium text-acento">
              Volver al panel principal
            </Link>
          }
        >
          Solo el administrador, el responsable institucional y el docente coordinador registran
          las autorizaciones y consultan los datos de los representantes.
        </AvisoDeLista>
      </div>
    );
  }

  const [estudiante, autorizaciones] = await Promise.all([
    obtenerEstudiante(estudianteId),
    obtenerAutorizacionesDeEstudiante(estudianteId),
  ]);

  const recurso = { recurso: vuelta.recurso, rutaDeLista: vuelta.ruta };

  if (estudiante.estado === "no-encontrado" || autorizaciones.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...recurso} />;
  }
  if (estudiante.estado === "denegado") {
    return <AvisoDenegado mensaje={estudiante.mensaje} {...recurso} />;
  }
  if (autorizaciones.estado === "denegado") {
    return <AvisoDenegado mensaje={autorizaciones.mensaje} {...recurso} />;
  }
  if (estudiante.estado === "sin-servicio" || autorizaciones.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const datosDelEstudiante = estudiante.datos;
  const lista = autorizaciones.datos;
  const autorizacion = lista.find((candidata) => candidata.tipo === tipo) ?? null;
  const otra = lista.find((candidata) => candidata.tipo !== tipo && candidata.representante) ?? null;
  const representante = autorizacion?.representante ?? otra?.representante ?? null;
  const copiadoDe =
    !autorizacion?.representante && otra?.representante && otra.tipo
      ? NOMBRES_DE_TIPO_DE_AUTORIZACION[otra.tipo]
      : null;

  const identidad = identidadDe(
    {
      nombres: datosDelEstudiante.nombres,
      apellidos: datosDelEstudiante.apellidos,
      codigo: datosDelEstudiante.codigoInterno,
    },
    false,
  );
  const estadoActual = autorizacion?.estado ?? "PENDIENTE";
  const inactivo =
    datosDelEstudiante.estado && datosDelEstudiante.estado !== ESTUDIANTE_ACTIVO
      ? NOMBRES_DE_ESTADO_DE_ESTUDIANTE[datosDelEstudiante.estado]
      : null;

  return (
    <>
      <EncabezadoDeGestion
        titulo={`Autorización de ${NOMBRES_DE_TIPO_DE_AUTORIZACION[tipo].toLowerCase()}`}
        detalle={[
          identidad.principal,
          identidad.codigo,
          datosDelEstudiante.cursoEtiqueta,
          datosDelEstudiante.institucionNombre,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      {inactivo ? (
        <p className="mt-2 text-sm text-aviso">
          El estudiante está {inactivo.toLowerCase()}. Puedes actualizar sus autorizaciones para
          mantener el expediente al día.
        </p>
      ) : null}
      <SelectorDeTipo
        estudianteId={estudianteId}
        actual={tipo}
        autorizaciones={lista}
        origen={origen}
      />
      {consulta.aviso === AVISO_SIN_DOCUMENTO ? <AvisoDeDocumento /> : null}
      {origen.desde === "solicitud" && tipo === "PARTICIPACION" && estadoActual === "OTORGADA" ? (
        <ListaParaAprobar solicitudId={origen.id} />
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="min-w-0">
          <FormularioAutorizacion
            key={`${estudianteId}-${tipo}`}
            estudianteId={estudianteId}
            tipo={tipo}
            estadoActual={estadoActual}
            tieneDocumento={Boolean(autorizacion?.tieneDocumento)}
            documentoTrasRevocacion={documentoTrasRevocacion(autorizacion)}
            iniciales={datosIniciales(autorizacion, representante)}
            copiadoDe={copiadoDe}
            hoy={hoyEnGuayaquil()}
            rutaDeVuelta={vuelta.ruta}
            textoDeVuelta={vuelta.texto}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <ResumenActual estudianteId={estudianteId} tipo={tipo} autorizacion={autorizacion} />
        </div>
      </div>
    </>
  );
}

async function Vuelta({ params, searchParams }: Props) {
  const [{ estudianteId }, consulta] = await Promise.all([params, searchParams]);
  const id = idDe(estudianteId);
  const vuelta = id
    ? vueltaDe(leerOrigenDeGestion(consulta), id)
    : { ruta: RUTA_AUTORIZACIONES, texto: "Volver a autorizaciones" };
  return <EnlaceVolver href={vuelta.ruta}>{vuelta.texto}</EnlaceVolver>;
}

export default function PaginaGestionDeAutorizacion(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <Suspense fallback={<div className="h-6" />}>
        <Vuelta {...props} />
      </Suspense>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando la autorización." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

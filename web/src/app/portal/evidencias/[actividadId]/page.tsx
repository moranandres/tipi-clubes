import type { Metadata } from "next";
import { CalendarDays, ClipboardCheck, Images, Lock, TriangleAlert } from "lucide-react";
import { Suspense } from "react";
import { diaDe } from "@/components/portal/actividades/PiezasDeActividad";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { AccionesDeEvidencia } from "@/components/portal/evidencias/AccionesDeEvidencia";
import { FormularioEvidencia } from "@/components/portal/evidencias/FormularioEvidencia";
import type { CandidatoDeEvidencia } from "@/components/portal/evidencias/SelectorDeEstudiantes";
import { TarjetaDeEvidencia } from "@/components/portal/evidencias/TarjetaDeEvidencia";
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
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { obtenerPlanilla } from "@/lib/api/asistencia";
import { listarAutorizadosDeImagen, obtenerEvidenciasDeSesion, type Evidencia } from "@/lib/api/evidencias";
import { rutaDeActividad } from "@/lib/portal/filtros-actividades";
import { rutaDePlanilla } from "@/lib/portal/filtros-asistencia";
import {
  PLURALES_DE_TIPO_DE_EVIDENCIA,
  PUNTOS_DE_TIPO_DE_EVIDENCIA,
  RUTA_EVIDENCIAS,
  TIPOS_DE_EVIDENCIA,
  type TipoEvidencia,
} from "@/lib/portal/filtros-evidencias";
import { identidadDe } from "@/lib/portal/identidad";
import { soloVeDatosMinimos } from "@/lib/portal/permisos";
import { fechaCorta } from "@/lib/portal/tiempo";
import { idDe } from "@/lib/portal/validacion";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Evidencias de la sesión",
};

type Props = PageProps<"/portal/evidencias/[actividadId]">;

const RECURSO = { recurso: "evidencias", rutaDeLista: RUTA_EVIDENCIAS };
const NO_ENCONTRADA = "Esta sesión no existe";
const AVISO_SIN_ARCHIVO = "archivo-no-disponible";

const CLAVES_DE_CONTEO: Record<TipoEvidencia, "fotografias" | "documentos" | "enlaces" | "productos"> = {
  FOTOGRAFIA: "fotografias",
  DOCUMENTO: "documentos",
  ENLACE: "enlaces",
  PRODUCTO: "productos",
};

async function candidatosDe(
  actividadId: number,
  institucionId: number | undefined,
): Promise<CandidatoDeEvidencia[]> {
  const [planilla, autorizados] = await Promise.all([
    obtenerPlanilla(actividadId),
    institucionId ? listarAutorizadosDeImagen(institucionId) : null,
  ]);
  if (planilla.estado !== "ok") {
    return [];
  }
  return (planilla.datos.estudiantes ?? [])
    .filter((fila): fila is typeof fila & { estudianteId: number } => typeof fila.estudianteId === "number")
    .map((fila) => {
      const identidad = identidadDe(
        { nombres: fila.estudianteNombres, apellidos: fila.estudianteApellidos, codigo: fila.estudianteCodigo },
        false,
      );
      return {
        id: fila.estudianteId,
        principal: identidad.principal,
        codigo: identidad.codigo,
        autorizado: autorizados?.has(fila.estudianteId) ?? false,
      };
    });
}

function candidatosConEtiquetados(
  candidatos: CandidatoDeEvidencia[],
  evidencia: Evidencia,
): CandidatoDeEvidencia[] {
  const faltantes = (evidencia.estudiantes ?? [])
    .filter(
      (estudiante): estudiante is typeof estudiante & { estudianteId: number } =>
        typeof estudiante.estudianteId === "number" &&
        !candidatos.some((candidato) => candidato.id === estudiante.estudianteId),
    )
    .map((estudiante) => {
      const identidad = identidadDe(
        {
          nombres: estudiante.estudianteNombres,
          apellidos: estudiante.estudianteApellidos,
          codigo: estudiante.estudianteCodigo,
        },
        false,
      );
      return {
        id: estudiante.estudianteId,
        principal: identidad.principal,
        codigo: identidad.codigo,
        autorizado: Boolean(estudiante.autorizacionImagenVigente),
      };
    });
  return [...candidatos, ...faltantes];
}

function idsEtiquetados(evidencia: Evidencia): number[] {
  return (evidencia.estudiantes ?? [])
    .map((estudiante) => estudiante.estudianteId)
    .filter((id): id is number => typeof id === "number");
}

async function Contenido({ params, searchParams }: Props) {
  const [{ actividadId: segmento }, consulta, usuario] = await Promise.all([
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

  const resultado = await obtenerEvidenciasDeSesion(id);

  if (resultado.estado === "no-encontrado") {
    return <AvisoNoEncontrado titulo={NO_ENCONTRADA} {...RECURSO} />;
  }
  if (resultado.estado === "denegado") {
    return <AvisoDenegado mensaje={resultado.mensaje} {...RECURSO} />;
  }
  if (resultado.estado === "sin-servicio") {
    return <AvisoSinServicio />;
  }

  const sesion = resultado.datos;
  const evidencias = sesion.evidencias ?? [];
  const editable = Boolean(sesion.editable);
  const minima = soloVeDatosMinimos(usuario.rol);
  const activas = sesion.activas ?? 0;
  const maximo = sesion.maximoPorActividad ?? 30;
  const conCupo = activas < maximo;
  const candidatos = editable ? await candidatosDe(id, sesion.institucionId) : [];
  const fechaActividad = sesion.actividadFecha ?? "";
  const archivoNoDisponible = consulta.aviso === AVISO_SIN_ARCHIVO;

  return (
    <>
      <EncabezadoDeGestion
        titulo={sesion.actividadTema ?? "Sesión"}
        detalle={[`${diaDe(sesion.actividadFecha)}, ${fechaCorta(sesion.actividadFecha)}`, sesion.clubNombre]
          .filter(Boolean)
          .join(" · ")}
      />
      {archivoNoDisponible ? (
        <p
          role="alert"
          className="entrada-mensaje mt-6 flex items-start gap-2.5 rounded-control bg-superficie px-4 py-3 text-[0.9375rem]"
        >
          <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-aviso" />
          <span className="min-w-0">
            No pudimos abrir el archivo. Puede que se haya retirado o que una fotografía ya no tenga la
            autorización de uso de imagen vigente. Revisa el estado de la evidencia abajo.
          </span>
        </p>
      ) : null}
      <div className={COLUMNAS_DE_GESTION}>
        <div className="flex min-w-0 flex-col gap-10">
          {!editable && sesion.motivoNoEditable ? (
            <p className="flex items-start gap-2.5 rounded-control bg-superficie px-4 py-3 text-[0.9375rem] text-tenue">
              <Lock aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
              <span>{sesion.motivoNoEditable}</span>
            </p>
          ) : null}
          {editable ? (
            <section aria-labelledby="nueva-evidencia" className="rounded-pieza border border-linea p-4 sm:p-6">
              <h2 id="nueva-evidencia" className="text-lg font-medium">
                Registrar evidencia
              </h2>
              {conCupo ? (
                <div className="mt-4">
                  <FormularioEvidencia
                    key={id}
                    actividadId={id}
                    fechaActividad={fechaActividad}
                    candidatos={candidatos}
                  />
                </div>
              ) : (
                <p className="mt-2 text-[0.9375rem] text-tenue">
                  La sesión ya tiene {maximo} evidencias activas, el máximo permitido. Retira alguna
                  antes de agregar otra.
                </p>
              )}
            </section>
          ) : null}
          <section aria-labelledby="lista-de-evidencias">
            <h2 id="lista-de-evidencias" className="text-lg font-medium">
              Evidencias registradas
            </h2>
            {evidencias.length === 0 ? (
              <div className="mt-4">
                <AvisoDeLista icono={<Images size={20} />} titulo="Esta sesión todavía no tiene evidencias">
                  {editable
                    ? "Usa el formulario de arriba para subir la primera fotografía, informe, enlace o producto."
                    : "Cuando se registren evidencias de la sesión aparecerán aquí."}
                </AvisoDeLista>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {evidencias.map((evidencia) => (
                  <TarjetaDeEvidencia
                    key={evidencia.id}
                    evidencia={evidencia}
                    minima={minima}
                    conSesion={false}
                    acciones={
                      editable && evidencia.estado === "ACTIVA" && evidencia.id && evidencia.tipo ? (
                        <AccionesDeEvidencia
                          key={evidencia.id}
                          evidenciaId={evidencia.id}
                          tipo={evidencia.tipo}
                          titulo={evidencia.titulo ?? ""}
                          descripcion={evidencia.descripcion ?? ""}
                          fechaEvidencia={evidencia.fechaEvidencia ?? fechaActividad}
                          fechaActividad={fechaActividad}
                          sinEstudiantes={Boolean(evidencia.sinEstudiantesIdentificables)}
                          estudianteIds={idsEtiquetados(evidencia)}
                          candidatos={candidatosConEtiquetados(candidatos, evidencia)}
                        />
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="conteo-de-evidencias" className="rounded-pieza border border-linea p-5">
            <h2 id="conteo-de-evidencias" className="text-lg font-medium">
              Resumen
            </h2>
            <p className="cifras mt-2 text-[0.9375rem] text-tenue">
              {activas} de {maximo} evidencias activas
              {(sesion.retiradas ?? 0) > 0
                ? `, ${sesion.retiradas} ${sesion.retiradas === 1 ? "retirada" : "retiradas"}`
                : ""}
              .
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {TIPOS_DE_EVIDENCIA.map((tipo) => (
                <div key={tipo} className="rounded-control bg-superficie p-3">
                  <dt className="flex items-center gap-2 text-sm text-tenue">
                    <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${PUNTOS_DE_TIPO_DE_EVIDENCIA[tipo]}`} />
                    {PLURALES_DE_TIPO_DE_EVIDENCIA[tipo]}
                  </dt>
                  <dd className="cifras mt-1.5 text-xl font-medium leading-none">
                    {sesion.conteo?.[CLAVES_DE_CONTEO[tipo]] ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-col gap-2">
              <EnlaceBoton href={rutaDeActividad(id)} variante="secundario" className="w-full">
                <CalendarDays aria-hidden="true" size={16} />
                Ver la sesión
              </EnlaceBoton>
              <EnlaceBoton href={rutaDePlanilla(id)} variante="secundario" className="w-full">
                <ClipboardCheck aria-hidden="true" size={16} />
                Asistencia de la sesión
              </EnlaceBoton>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default function PaginaEvidenciasDeSesion(props: Props) {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_EVIDENCIAS}>Volver a evidencias</EnlaceVolver>
      <Suspense fallback={<EsqueletoDeGestion conEncabezado mensaje="Cargando las evidencias de la sesión." />}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}

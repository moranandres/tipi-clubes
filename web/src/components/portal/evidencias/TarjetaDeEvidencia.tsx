import Link from "next/link";
import { Download, ExternalLink, Eye, FileText, ImageIcon, Link2, Package, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { BASE_BOTON, TAMANOS_BOTON, VARIANTES_BOTON } from "@/components/ui/estilos-boton";
import type { Evidencia } from "@/lib/api/evidencias";
import {
  NOMBRES_DE_TIPO_DE_EVIDENCIA,
  PUNTOS_DE_TIPO_DE_EVIDENCIA,
  rutaDeArchivoDeEvidencia,
  rutaDeEvidenciasDeSesion,
  type TipoEvidencia,
} from "@/lib/portal/filtros-evidencias";
import { identidadDe } from "@/lib/portal/identidad";
import { tamanoLegible } from "@/lib/portal/reglas-evidencias";
import { fechaCorta, momentoCorto } from "@/lib/portal/tiempo";

type Props = {
  evidencia: Evidencia;
  minima: boolean;
  conSesion: boolean;
  acciones?: ReactNode;
};

const ENLACE = `${BASE_BOTON} ${TAMANOS_BOTON.compacto} ${VARIANTES_BOTON.elevado} whitespace-nowrap`;

const ICONOS: Record<TipoEvidencia, typeof FileText> = {
  FOTOGRAFIA: ImageIcon,
  DOCUMENTO: FileText,
  ENLACE: Link2,
  PRODUCTO: Package,
};

function Estudiantes({ evidencia, minima }: { evidencia: Evidencia; minima: boolean }) {
  const estudiantes = evidencia.estudiantes ?? [];
  if (evidencia.sinEstudiantesIdentificables) {
    return <p className="mt-3 text-sm text-tenue">Sin estudiantes identificables.</p>;
  }
  if (estudiantes.length === 0) {
    return null;
  }
  return (
    <div className="mt-3">
      <p className="text-sm text-tenue">
        {evidencia.tipo === "FOTOGRAFIA" ? "Aparecen" : "Autores"}
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {estudiantes.map((estudiante) => {
          const identidad = identidadDe(
            {
              nombres: estudiante.estudianteNombres,
              apellidos: estudiante.estudianteApellidos,
              codigo: estudiante.estudianteCodigo,
            },
            minima,
          );
          const sinAutorizacion = evidencia.tipo === "FOTOGRAFIA" && !estudiante.autorizacionImagenVigente;
          return (
            <li
              key={estudiante.estudianteId}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-sm ${
                sinAutorizacion ? "bg-error/15 text-error" : "bg-superficie-alta"
              }`}
            >
              {sinAutorizacion ? <TriangleAlert aria-hidden="true" size={14} className="shrink-0" /> : null}
              <span className={`truncate ${identidad.codigo ? "" : "cifras"}`}>{identidad.principal}</span>
              {sinAutorizacion ? <span className="sr-only">, autorización de imagen no vigente</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Contenido({ evidencia }: { evidencia: Evidencia }) {
  const actividadId = evidencia.actividadId ?? 0;
  const evidenciaId = evidencia.id ?? 0;

  if (evidencia.estado === "RETIRADA") {
    return null;
  }
  if (evidencia.url) {
    return (
      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
        <a href={evidencia.url} target="_blank" rel="noopener noreferrer" className={ENLACE}>
          <ExternalLink aria-hidden="true" size={16} />
          Abrir enlace
          <span className="sr-only"> de {evidencia.titulo} (se abre en otra pestaña)</span>
        </a>
        <span className="min-w-0 truncate text-sm text-tenue">{evidencia.url}</span>
      </div>
    );
  }
  if (!evidencia.archivoNombre) {
    return null;
  }
  return (
    <div className="mt-4">
      <p className="flex min-w-0 items-center gap-2 text-sm text-tenue">
        <FileText aria-hidden="true" size={16} className="shrink-0" />
        <span className="min-w-0 truncate">{evidencia.archivoNombre}</span>
        {typeof evidencia.archivoTamano === "number" ? (
          <span className="cifras shrink-0">{tamanoLegible(evidencia.archivoTamano)}</span>
        ) : null}
      </p>
      {evidencia.descargable ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={rutaDeArchivoDeEvidencia(actividadId, evidenciaId, false)}
            target="_blank"
            rel="noopener"
            className={ENLACE}
          >
            <Eye aria-hidden="true" size={16} />
            Ver
            <span className="sr-only"> {evidencia.titulo} (se abre en otra pestaña)</span>
          </a>
          <a href={rutaDeArchivoDeEvidencia(actividadId, evidenciaId, true)} className={ENLACE}>
            <Download aria-hidden="true" size={16} />
            Descargar
            <span className="sr-only"> {evidencia.titulo}</span>
          </a>
        </div>
      ) : evidencia.motivoNoDescargable ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-aviso">
          <TriangleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0">{evidencia.motivoNoDescargable}</span>
        </p>
      ) : null}
    </div>
  );
}

export function TarjetaDeEvidencia({ evidencia, minima, conSesion, acciones }: Props) {
  const tipo = evidencia.tipo ?? "DOCUMENTO";
  const Icono = ICONOS[tipo];
  const retirada = evidencia.estado === "RETIRADA";

  return (
    <article
      id={`evidencia-${evidencia.id}`}
      aria-labelledby={`titulo-evidencia-${evidencia.id}`}
      className={`flex min-w-0 scroll-mt-24 flex-col rounded-pieza bg-superficie p-4 sm:p-5 ${retirada ? "opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-tenue">
          <Icono aria-hidden="true" size={16} className="shrink-0" />
          <PuntoDeEstado punto={retirada ? "bg-tenue" : PUNTOS_DE_TIPO_DE_EVIDENCIA[tipo]}>
            {NOMBRES_DE_TIPO_DE_EVIDENCIA[tipo]}
            {retirada ? " retirada" : ""}
          </PuntoDeEstado>
        </p>
        <p className="cifras shrink-0 text-sm text-tenue">{fechaCorta(evidencia.fechaEvidencia)}</p>
      </div>
      <h3 id={`titulo-evidencia-${evidencia.id}`} className="mt-2 break-words font-medium">
        {evidencia.titulo}
      </h3>
      <p className="mt-1 whitespace-pre-line break-words text-[0.9375rem] text-tenue">
        {evidencia.descripcion}
      </p>
      {conSesion ? (
        <p className="mt-2 break-words text-sm">
          <Link
            href={rutaDeEvidenciasDeSesion(evidencia.actividadId ?? 0)}
            className="font-medium text-acento"
          >
            {evidencia.actividadTema ?? "Sesión"}
          </Link>
          <span className="text-tenue">
            {" "}
            · {[fechaCorta(evidencia.actividadFecha), evidencia.clubNombre].filter(Boolean).join(" · ")}
          </span>
        </p>
      ) : null}
      <Estudiantes evidencia={evidencia} minima={minima} />
      <Contenido evidencia={evidencia} />
      {retirada ? (
        <p className="mt-3 break-words text-sm text-tenue">
          Retirada {[momentoCorto(evidencia.fechaRetiro), evidencia.retiradaPorNombre ? `por ${evidencia.retiradaPorNombre}` : null]
            .filter(Boolean)
            .join(", ")}
          {evidencia.motivoRetiro ? `: ${evidencia.motivoRetiro}` : "."}
        </p>
      ) : (
        <p className="cifras mt-3 text-sm text-tenue">
          Registrada {[momentoCorto(evidencia.fechaRegistro), evidencia.registradoPorNombre ? `por ${evidencia.registradoPorNombre}` : null]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
      {acciones ? <div className="mt-4 border-t border-linea pt-4">{acciones}</div> : null}
    </article>
  );
}

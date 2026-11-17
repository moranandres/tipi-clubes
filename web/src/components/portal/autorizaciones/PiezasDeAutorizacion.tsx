import { Download, Eye, FileCheck2, FileX2 } from "lucide-react";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import { BASE_BOTON, TAMANOS_BOTON, VARIANTES_BOTON } from "@/components/ui/estilos-boton";
import {
  NOMBRES_DE_PARENTESCO,
  NOMBRES_DE_TIPO_DE_AUTORIZACION,
  rutaDeDocumento,
  type Parentesco,
  type TipoAutorizacion,
} from "@/lib/portal/filtros-autorizaciones";
import {
  NOMBRES_DE_AUTORIZACION,
  PUNTOS_DE_AUTORIZACION,
  type EstadoAutorizacion,
} from "@/lib/portal/filtros-estudiantes";

type DatosDeRepresentante = {
  nombres?: string;
  apellidos?: string;
  parentesco?: Parentesco;
};

const ENLACE_DE_DOCUMENTO = `${BASE_BOTON} ${TAMANOS_BOTON.compacto} ${VARIANTES_BOTON.elevado} whitespace-nowrap`;

export function EstadoDeAutorizacion({ estado }: { estado?: EstadoAutorizacion }) {
  const actual = estado ?? "PENDIENTE";
  return (
    <PuntoDeEstado punto={PUNTOS_DE_AUTORIZACION[actual]}>{NOMBRES_DE_AUTORIZACION[actual]}</PuntoDeEstado>
  );
}

export function nombreDeRepresentante(representante?: DatosDeRepresentante | null): string | null {
  const nombre = [representante?.nombres, representante?.apellidos].filter(Boolean).join(" ");
  return nombre || null;
}

export function parentescoDe(representante?: DatosDeRepresentante | null): string | null {
  return representante?.parentesco ? NOMBRES_DE_PARENTESCO[representante.parentesco] : null;
}

export function Representante({ representante }: { representante?: DatosDeRepresentante | null }) {
  const nombre = nombreDeRepresentante(representante);
  if (!nombre) {
    return <span className="text-tenue">Sin representante registrado</span>;
  }
  return (
    <>
      <span className="block break-words">{nombre}</span>
      <span className="mt-0.5 block text-sm text-tenue">{parentescoDe(representante)}</span>
    </>
  );
}

export function IndicadorDeDocumento({ tieneDocumento }: { tieneDocumento?: boolean }) {
  return tieneDocumento ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <FileCheck2 aria-hidden="true" size={16} className="shrink-0 text-exito" />
      Cargado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-tenue">
      <FileX2 aria-hidden="true" size={16} className="shrink-0" />
      Sin documento
    </span>
  );
}

export function EnlacesDeDocumento({
  estudianteId,
  tipo,
}: {
  estudianteId: number;
  tipo: TipoAutorizacion;
}) {
  const nombre = NOMBRES_DE_TIPO_DE_AUTORIZACION[tipo].toLowerCase();
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={rutaDeDocumento(estudianteId, tipo, false)}
        target="_blank"
        rel="noopener"
        className={ENLACE_DE_DOCUMENTO}
      >
        <Eye aria-hidden="true" size={16} />
        Ver documento
        <span className="sr-only"> de {nombre} (se abre en otra pestaña)</span>
      </a>
      <a href={rutaDeDocumento(estudianteId, tipo, true)} className={ENLACE_DE_DOCUMENTO}>
        <Download aria-hidden="true" size={16} />
        Descargar
        <span className="sr-only"> el documento de {nombre}</span>
      </a>
    </div>
  );
}

import Link from "next/link";
import { FilePen } from "lucide-react";
import type { ReactNode } from "react";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { obtenerAutorizacionesDeEstudiante } from "@/lib/api/autorizaciones";
import {
  NOMBRES_DE_TIPO_DE_AUTORIZACION,
  RUTA_AUTORIZACIONES,
  TIPOS_DE_AUTORIZACION,
  rutaDeGestion,
} from "@/lib/portal/filtros-autorizaciones";
import { rutaConConsulta } from "@/lib/portal/parametros";
import { fechaCorta } from "@/lib/portal/tiempo";
import {
  EnlacesDeDocumento,
  EstadoDeAutorizacion,
  nombreDeRepresentante,
  parentescoDe,
} from "./PiezasDeAutorizacion";

type Props = {
  estudianteId: number;
};

const ESTADO_OTORGADA = "OTORGADA";

function Marco({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="autorizaciones" className="rounded-pieza border border-linea p-5">
      <h2 id="autorizaciones" className="text-lg font-medium">
        Autorizaciones del representante
      </h2>
      {children}
    </section>
  );
}

export async function AutorizacionesDelEstudiante({ estudianteId }: Props) {
  const resultado = await obtenerAutorizacionesDeEstudiante(estudianteId);

  if (resultado.estado !== "ok") {
    return (
      <Marco>
        <p className="mt-3 text-[0.9375rem] text-tenue">
          {resultado.estado === "denegado"
            ? resultado.mensaje
            : "No pudimos cargar las autorizaciones en este momento. Recarga la página para intentarlo de nuevo."}
        </p>
      </Marco>
    );
  }

  return (
    <Marco>
      <ul className="mt-2 flex flex-col divide-y divide-linea">
        {TIPOS_DE_AUTORIZACION.map((tipo) => {
          const autorizacion = resultado.datos.find((candidata) => candidata.tipo === tipo);
          const nombre = nombreDeRepresentante(autorizacion?.representante);
          const nombreDelTipo = NOMBRES_DE_TIPO_DE_AUTORIZACION[tipo];
          return (
            <li key={tipo} className="py-4 last:pb-0">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-medium">{nombreDelTipo}</h3>
                <span className="text-[0.9375rem]">
                  <EstadoDeAutorizacion estado={autorizacion?.estado} />
                </span>
              </div>
              <p className="mt-1 break-words text-sm text-tenue">
                {nombre
                  ? `${nombre} · ${parentescoDe(autorizacion?.representante) ?? "Representante"}`
                  : "Sin representante registrado"}
              </p>
              {autorizacion?.estado === ESTADO_OTORGADA && autorizacion.fechaRegistro ? (
                <p className="cifras mt-0.5 text-sm text-tenue">
                  Firmada el {fechaCorta(autorizacion.fechaRegistro)}
                </p>
              ) : null}
              <div className="mt-3 flex flex-col gap-2">
                <EnlaceBoton
                  href={rutaDeGestion(estudianteId, tipo)}
                  variante="elevado"
                  tamano="compacto"
                  className="self-start"
                >
                  <FilePen aria-hidden="true" size={16} />
                  {nombre ? "Gestionar" : "Registrar"}
                  <span className="sr-only"> la autorización de {nombreDelTipo.toLowerCase()}</span>
                </EnlaceBoton>
                {autorizacion?.tieneDocumento ? (
                  <EnlacesDeDocumento estudianteId={estudianteId} tipo={tipo} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-tenue">
        La de participación otorgada es obligatoria para aprobar su inscripción a un club. Sin la de
        uso de imagen no se publican fotografías en las que aparezca.
      </p>
      <Link
        href={rutaConConsulta(RUTA_AUTORIZACIONES, { estudiante: estudianteId })}
        className="mt-3 inline-block text-sm font-medium text-acento"
      >
        Ver en la lista de autorizaciones
      </Link>
    </Marco>
  );
}

export function EsqueletoAutorizacionesDelEstudiante() {
  return (
    <div aria-hidden="true" className="h-80 rounded-pieza bg-superficie motion-safe:animate-pulse" />
  );
}

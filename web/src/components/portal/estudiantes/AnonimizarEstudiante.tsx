"use client";

import { ShieldOff } from "lucide-react";
import { ResolverConMotivo } from "@/components/portal/formularios/ResolverConMotivo";
import { anonimizarEstudiante } from "@/lib/acciones/estudiantes";
import { RUTA_ESTUDIANTES } from "@/lib/portal/filtros-estudiantes";
import { LIMITES_DE_ANONIMIZACION } from "@/lib/portal/reglas-estudiantes";

type Props = {
  estudianteId: number;
  codigo?: string;
};

const SE_ELIMINA = [
  "Nombres y apellidos del estudiante",
  "Datos del representante legal y observaciones de las autorizaciones",
  "Documentos firmados de autorización",
  "PDF de sus certificados, que llevan su nombre",
];

const SE_CONSERVA = [
  "Código interno, curso educativo e institución",
  "Inscripciones, asistencias, participaciones y avances",
  "Certificados con su código y huella para la verificación pública",
];

function Consecuencias({ codigo }: { codigo?: string }) {
  return (
    <div className="rounded-control bg-superficie p-4 text-[0.9375rem]">
      <p className="font-medium text-error">Esta acción no se puede deshacer.</p>
      <p className="mt-2 font-medium">Se elimina</p>
      <ul className="mt-1 list-disc pl-5 text-tenue">
        {SE_ELIMINA.map((dato) => (
          <li key={dato}>{dato}</li>
        ))}
      </ul>
      <p className="mt-3 font-medium">Se conserva para las estadísticas</p>
      <ul className="mt-1 list-disc pl-5 text-tenue">
        {SE_CONSERVA.map((dato) => (
          <li key={dato}>{dato}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-tenue">
        En adelante el registro figura como «Estudiante anonimizado»{codigo ? ` ${codigo}` : ""}. No
        escribas nombres ni datos personales en el motivo.
      </p>
    </div>
  );
}

export function AnonimizarEstudiante({ estudianteId, codigo }: Props) {
  return (
    <ResolverConMotivo
      titulo="Anonimizar datos personales"
      descripcion="Para cumplir una solicitud de supresión según la LOPDP cuando el estudiante ya tiene historial. Retira sus datos identificables y conserva solo el código interno y los registros históricos."
      etiqueta="Anonimizar datos personales"
      confirmar="Sí, anonimizar"
      textoCargando="Anonimizando"
      minimo={LIMITES_DE_ANONIMIZACION.motivoMinimo}
      maximo={LIMITES_DE_ANONIMIZACION.motivoMaximo}
      icono={<ShieldOff aria-hidden="true" size={16} />}
      detalle={<Consecuencias codigo={codigo} />}
      destino={`${RUTA_ESTUDIANTES}/${estudianteId}?aviso=anonimizado`}
      resolver={anonimizarEstudiante.bind(null, estudianteId)}
    />
  );
}

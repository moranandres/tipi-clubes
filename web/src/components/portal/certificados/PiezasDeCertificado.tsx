import Link from "next/link";
import { PuntoDeEstado } from "@/components/portal/PuntoDeEstado";
import type { Certificado } from "@/lib/api/certificados";
import {
  NOMBRES_DE_ESTADO_DE_CERTIFICADO,
  NOMBRES_DE_TIPO_DE_CERTIFICADO,
  PUNTOS_DE_ESTADO_DE_CERTIFICADO,
  rutaDeCertificado,
  type EstadoCertificado,
  type TipoCertificado,
} from "@/lib/portal/filtros-certificados";
import { fechaCorta } from "@/lib/portal/tiempo";

export function EstadoDeCertificado({ estado }: { estado?: EstadoCertificado }) {
  const actual = estado ?? "EMITIDO";
  return (
    <PuntoDeEstado punto={PUNTOS_DE_ESTADO_DE_CERTIFICADO[actual]}>
      {NOMBRES_DE_ESTADO_DE_CERTIFICADO[actual]}
    </PuntoDeEstado>
  );
}

export function nombreDeTipo(tipo?: TipoCertificado): string {
  return tipo ? NOMBRES_DE_TIPO_DE_CERTIFICADO[tipo] : "Certificado";
}

export function CodigoDeVerificacion({ codigo }: { codigo?: string }) {
  return <span className="cifras whitespace-nowrap tracking-wide">{codigo ?? "—"}</span>;
}

export function ListaDeCertificados({ certificados }: { certificados: Certificado[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {certificados.map((certificado) => (
        <li key={certificado.id} className="rounded-control bg-superficie p-3.5 text-[0.9375rem]">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={rutaDeCertificado(certificado.id ?? 0)}
              className="min-w-0 break-words font-medium text-acento"
            >
              {nombreDeTipo(certificado.tipo)}
            </Link>
            <span className="shrink-0 text-sm">
              <EstadoDeCertificado estado={certificado.estado} />
            </span>
          </div>
          <p className="mt-1 text-sm text-tenue">
            <CodigoDeVerificacion codigo={certificado.codigoVerificacion} />
            {certificado.fechaEmision ? ` · ${fechaCorta(certificado.fechaEmision)}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

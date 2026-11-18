"use client";

import Link from "next/link";
import { BadgeCheck, FileBadge } from "lucide-react";
import { useId, useState } from "react";
import { useAlOcultar, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { emitirCertificado } from "@/lib/acciones/certificados";
import { rutaDeCertificado, type TipoCertificado } from "@/lib/portal/filtros-certificados";
import type { OpcionDeEmision } from "@/lib/portal/reglas-certificados";

type Props = {
  titulo?: string;
  descripcion?: string;
  origenId: number;
  opciones: OpcionDeEmision[];
  compacto?: boolean;
};

export function PanelDeEmision({ titulo, descripcion, origenId, opciones, compacto = false }: Props) {
  const idTitulo = useId();
  const [confirmando, setConfirmando] = useState<TipoCertificado | null>(null);
  const [enCurso, setEnCurso] = useState<TipoCertificado | null>(null);
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => {
    setConfirmando(null);
    setEnCurso(null);
  });

  function emitir(tipo: TipoCertificado) {
    limpiarAviso();
    setEnCurso(tipo);
    enviar(
      () => emitirCertificado(tipo, origenId),
      (resultado) => {
        if (resultado.ok && resultado.destino) {
          navegar(resultado.destino);
          return;
        }
        setConfirmando(null);
        setEnCurso(null);
        avisar(resultado.ok ? "exito" : "error", resultado.mensaje);
      },
    );
  }

  const lista = (
    <ul className={`flex flex-col ${compacto ? "gap-2" : "gap-3"}`}>
      {opciones.map((opcion) => (
        <li key={opcion.tipo} className="rounded-control bg-superficie p-3.5">
          <p className="font-medium">{opcion.nombre}</p>
          <p className="mt-0.5 text-sm text-tenue">{opcion.descripcion}</p>
          {opcion.vigente ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <BadgeCheck aria-hidden="true" size={16} className="shrink-0 text-exito" />
              <span className="min-w-0">
                Vigente:{" "}
                <Link href={rutaDeCertificado(opcion.vigente.id)} className="cifras font-medium text-acento">
                  {opcion.vigente.codigo}
                </Link>
              </span>
            </p>
          ) : opcion.bloqueo ? (
            <p className="mt-2 text-sm text-aviso">{opcion.bloqueo}</p>
          ) : confirmando === opcion.tipo ? (
            <div role="group" aria-label={`Confirmar la emisión: ${opcion.nombre}`} className="mt-3 flex gap-2">
              <Boton
                tamano="compacto"
                cargando={pendiente && enCurso === opcion.tipo}
                textoCargando="Emitiendo"
                className="flex-1"
                onClick={() => emitir(opcion.tipo)}
              >
                Sí, emitir
              </Boton>
              <Boton
                tamano="compacto"
                variante="elevado"
                textoCargando=""
                disabled={pendiente}
                className="flex-1"
                onClick={() => setConfirmando(null)}
              >
                No
              </Boton>
            </div>
          ) : (
            <Boton
              tamano="compacto"
              variante="elevado"
              textoCargando=""
              disabled={pendiente}
              className="mt-3"
              onClick={() => setConfirmando(opcion.tipo)}
            >
              <FileBadge aria-hidden="true" size={16} />
              Emitir certificado
            </Boton>
          )}
        </li>
      ))}
    </ul>
  );

  if (!titulo) {
    return (
      <div>
        {lista}
        <ZonaDeAviso aviso={aviso} className="mt-3" />
      </div>
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        {titulo}
      </h2>
      {descripcion ? <p className="mt-2 text-[0.9375rem] text-tenue">{descripcion}</p> : null}
      <div className="mt-4">{lista}</div>
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}

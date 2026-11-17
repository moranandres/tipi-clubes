"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Boton } from "@/components/ui/Boton";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import type { VarianteBoton } from "@/components/ui/estilos-boton";
import type { ResultadoDeAccion } from "@/lib/acciones/resultado";
import { LIMITES_DE_SOLICITUD, errorDeMotivo } from "@/lib/portal/reglas-solicitudes";
import { enfocarPrimerInvalido, useAlOcultar, useEnvio } from "./ganchos";
import { ZonaDeAviso } from "./ZonaDeAviso";

type Props = {
  titulo: string;
  descripcion: ReactNode;
  etiqueta: string;
  confirmar: string;
  textoCargando: string;
  icono?: ReactNode;
  variante?: VarianteBoton;
  minimo?: number;
  destino?: string;
  resolver: (motivo: string) => Promise<ResultadoDeAccion>;
};

export function ResolverConMotivo({
  titulo,
  descripcion,
  etiqueta,
  confirmar,
  textoCargando,
  icono,
  variante = "peligro",
  minimo = LIMITES_DE_SOLICITUD.motivoMinimo,
  destino,
  resolver,
}: Props) {
  const idTitulo = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | undefined>();
  const { pendiente, aviso, enviar, navegar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => {
    setAbierto(false);
    setMotivo("");
    setError(undefined);
  });

  function abrir() {
    setAbierto(true);
    limpiarAviso();
    requestAnimationFrame(() => formulario.current?.querySelector("textarea")?.focus());
  }

  function cerrar() {
    setAbierto(false);
    setMotivo("");
    setError(undefined);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrado = errorDeMotivo(motivo, minimo);
    if (encontrado) {
      setError(encontrado);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => resolver(motivo.trim()),
      (resultado) => {
        if (resultado.ok) {
          if (destino) {
            navegar(destino);
            return;
          }
          cerrar();
          avisar("exito", resultado.mensaje, resultado.avisos);
          return;
        }
        if (resultado.errores.motivo) {
          setError(resultado.errores.motivo);
          enfocarPrimerInvalido(formulario.current);
        }
        avisar("error", resultado.mensaje);
      },
    );
  }

  const longitud = motivo.trim().length;

  return (
    <section aria-labelledby={idTitulo} className="rounded-pieza border border-linea p-5">
      <h2 id={idTitulo} className="text-lg font-medium">
        {titulo}
      </h2>
      <p className="mt-2 text-[0.9375rem] text-tenue">{descripcion}</p>
      {abierto ? (
        <form ref={formulario} onSubmit={alEnviar} noValidate className="mt-4">
          <CampoTextoLargo
            etiqueta="Motivo"
            name="motivo"
            rows={3}
            required
            maxLength={LIMITES_DE_SOLICITUD.motivoMaximo}
            value={motivo}
            error={error}
            ayuda={`${longitud} de ${LIMITES_DE_SOLICITUD.motivoMaximo} caracteres, mínimo ${minimo}. Queda registrado en la auditoría.`}
            onChange={(evento) => {
              setMotivo(evento.target.value);
              setError(undefined);
            }}
          />
          <div className="mt-2 flex gap-2">
            <Boton
              type="submit"
              variante={variante}
              cargando={pendiente}
              textoCargando={textoCargando}
              className="flex-1"
            >
              {confirmar}
            </Boton>
            <Boton
              variante="secundario"
              textoCargando=""
              disabled={pendiente}
              className="flex-1"
              onClick={cerrar}
            >
              Volver
            </Boton>
          </div>
        </form>
      ) : (
        <Boton variante={variante} textoCargando="" className="mt-4 w-full" onClick={abrir}>
          {icono}
          {etiqueta}
        </Boton>
      )}
      <ZonaDeAviso aviso={aviso} className="mt-3" />
    </section>
  );
}

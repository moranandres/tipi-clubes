"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, KeyRound, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  enfocarPrimerInvalido,
  useCampos,
  useEnvio,
} from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { restablecerClave, validarEnlaceDeRecuperacion } from "@/lib/acciones/acceso";
import { MENSAJE_REVISAR_CAMPOS } from "@/lib/acciones/resultado";
import {
  AYUDA_DE_CLAVE,
  MENSAJE_ENLACE_INVALIDO,
  erroresDeClaveNueva,
  tokenDelFragmento,
} from "@/lib/acceso/reglas-clave";
import { RUTA_LOGIN } from "@/lib/sesion/cookie";
import { CampoDeContrasena } from "./CampoDeContrasena";

type Props = {
  idTitulo: string;
};

type Fase =
  | { tipo: "comprobando" }
  | { tipo: "invalido"; mensaje: string }
  | { tipo: "listo"; token: string }
  | { tipo: "hecho"; mensaje: string };

const INICIALES = { nueva: "", confirmacion: "" };
const VINCULADOS = [["nueva", "confirmacion"]] as const;

function MensajeDeEstado({ fase }: { fase: Exclude<Fase, { tipo: "listo" }> }) {
  if (fase.tipo === "comprobando") {
    return (
      <p role="status" className="flex items-center gap-2 text-tenue">
        <LoaderCircle aria-hidden="true" size={18} className="motion-safe:animate-spin" />
        Comprobando el enlace…
      </p>
    );
  }
  if (fase.tipo === "hecho") {
    return (
      <div role="status" className="entrada-mensaje">
        <p className="flex items-start gap-2 text-exito">
          <CircleCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          {fase.mensaje}
        </p>
        <EnlaceBoton href={RUTA_LOGIN} className="mt-6 h-12 w-full text-base">
          Entrar al portal
          <ArrowRight aria-hidden="true" size={18} />
        </EnlaceBoton>
      </div>
    );
  }
  return (
    <div role="alert" className="entrada-mensaje">
      <p className="flex items-start gap-2 text-error">
        <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        {fase.mensaje}
      </p>
      <EnlaceBoton href="/recuperar" variante="secundario" className="mt-6 h-12 w-full text-base">
        Solicitar un enlace nuevo
      </EnlaceBoton>
      <Link href={RUTA_LOGIN} className="mt-4 inline-block text-[0.9375rem] font-medium text-acento">
        Volver al acceso
      </Link>
    </div>
  );
}

export function FormularioRestablecimiento({ idTitulo }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const [fase, setFase] = useState<Fase>({ tipo: "comprobando" });
  const { valores, errores, cambiar, setErrores } = useCampos(INICIALES, VINCULADOS);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  useEffect(() => {
    let consulta = 0;

    function comprobar() {
      consulta += 1;
      const actual = consulta;
      const token = tokenDelFragmento(window.location.hash);
      const comprobacion = token
        ? validarEnlaceDeRecuperacion(token)
        : Promise.resolve({ ok: false as const, mensaje: MENSAJE_ENLACE_INVALIDO, errores: {} });

      comprobacion
        .catch(() => ({ ok: false as const, mensaje: MENSAJE_ENLACE_INVALIDO, errores: {} }))
        .then((resultado) => {
          if (actual !== consulta) {
            return;
          }
          setFase(resultado.ok ? { tipo: "listo", token } : { tipo: "invalido", mensaje: resultado.mensaje });
        });
    }

    function alCambiarEnlace() {
      setFase({ tipo: "comprobando" });
      comprobar();
    }

    comprobar();
    window.addEventListener("hashchange", alCambiarEnlace);
    return () => {
      consulta += 1;
      window.removeEventListener("hashchange", alCambiarEnlace);
    };
  }, []);

  if (fase.tipo !== "listo") {
    return (
      <section aria-labelledby={idTitulo} className="min-h-40 w-full">
        <MensajeDeEstado fase={fase} />
      </section>
    );
  }

  const token = fase.token;

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente) {
      return;
    }

    const encontrados = erroresDeClaveNueva(valores);
    if (encontrados.nueva || encontrados.confirmacion) {
      setErrores(encontrados);
      avisar("error", MENSAJE_REVISAR_CAMPOS);
      enfocarPrimerInvalido(formulario.current);
      return;
    }

    limpiarAviso();
    enviar(
      () => restablecerClave({ token, ...valores }),
      (resultado) => {
        if (resultado.ok) {
          window.history.replaceState(null, "", window.location.pathname);
          setFase({ tipo: "hecho", mensaje: resultado.mensaje });
          return;
        }
        if (resultado.mensaje === MENSAJE_ENLACE_INVALIDO) {
          setFase({ tipo: "invalido", mensaje: resultado.mensaje });
          return;
        }
        setErrores(resultado.errores);
        avisar("error", resultado.mensaje);
        enfocarPrimerInvalido(formulario.current);
      },
    );
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate aria-labelledby={idTitulo} className="w-full">
      <div className="flex flex-col gap-3">
        <CampoDeContrasena
          etiqueta="Contraseña nueva"
          nombre="nueva"
          autocompletar="new-password"
          valor={valores.nueva}
          error={errores.nueva}
          ayuda={AYUDA_DE_CLAVE}
          alCambiar={(valor) => cambiar("nueva", valor)}
        />
        <CampoDeContrasena
          etiqueta="Repite la contraseña nueva"
          nombre="confirmacion"
          autocompletar="new-password"
          valor={valores.confirmacion}
          error={errores.confirmacion}
          alCambiar={(valor) => cambiar("confirmacion", valor)}
        />
      </div>
      <Boton
        type="submit"
        cargando={pendiente}
        textoCargando="Guardando"
        className="mt-3 h-12 w-full text-base"
      >
        <KeyRound aria-hidden="true" size={18} />
        Guardar contraseña nueva
      </Boton>
      <ZonaDeAviso aviso={aviso} className="mt-4 min-h-12" />
    </form>
  );
}

"use client";

import { ArrowRight, CircleAlert, Eye, EyeOff, Info } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { RUTA_PORTAL } from "@/lib/sesion/cookie";

const CARGA_MINIMA_MS = 400;
const DESTINO_VALIDO = /^\/portal(?:[/?]|$)/;

const MENSAJE_SIN_RED = "No hay conexión con el portal. Revisa tu red y vuelve a intentarlo.";
const MENSAJE_GENERICO = "No se pudo iniciar la sesión. Vuelve a intentarlo.";

type Errores = {
  identificador?: string;
  password?: string;
  general?: string;
};

const sinSuscripcion = () => () => {};
const sesionExpiradaEnCliente = () =>
  new URLSearchParams(window.location.search).get("sesion") === "expirada";
const sesionExpiradaEnServidor = () => false;

function destinoTrasEntrar(): string {
  const destino = new URLSearchParams(window.location.search).get("destino");
  return destino && DESTINO_VALIDO.test(destino) ? destino : RUTA_PORTAL;
}

function esperar(milisegundos: number) {
  return new Promise<void>((resolver) => setTimeout(resolver, milisegundos));
}

export function FormularioAcceso() {
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const refIdentificador = useRef<HTMLInputElement>(null);
  const refPassword = useRef<HTMLInputElement>(null);
  const sesionExpirada = useSyncExternalStore(
    sinSuscripcion,
    sesionExpiradaEnCliente,
    sesionExpiradaEnServidor,
  );

  function limpiarError(campo: "identificador" | "password") {
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: undefined } : previos));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) {
      return;
    }

    const datos = new FormData(evento.currentTarget);
    const identificador = String(datos.get("identificador") ?? "").trim();
    const password = String(datos.get("password") ?? "");

    if (!identificador || !password) {
      setErrores((previos) => ({
        general: previos.general,
        identificador: identificador ? undefined : "Escribe tu usuario o tu correo.",
        password: password ? undefined : "Escribe tu contraseña.",
      }));
      (identificador ? refPassword : refIdentificador).current?.focus();
      return;
    }

    setEnviando(true);
    setErrores((previos) => ({ general: previos.general }));
    const inicio = performance.now();
    let mensaje = MENSAJE_GENERICO;

    try {
      const respuesta = await fetch("/api/auth/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, password }),
      });

      if (respuesta.ok) {
        window.location.replace(destinoTrasEntrar());
        return;
      }

      const cuerpo: { mensaje?: string } | null = await respuesta.json().catch(() => null);
      mensaje = cuerpo?.mensaje ?? MENSAJE_GENERICO;
    } catch {
      mensaje = MENSAJE_SIN_RED;
    }

    const restante = CARGA_MINIMA_MS - (performance.now() - inicio);
    if (restante > 0) {
      await esperar(restante);
    }

    setErrores({ general: mensaje });
    setEnviando(false);
    refPassword.current?.focus();
    refPassword.current?.select();
  }

  return (
    <form onSubmit={enviar} noValidate aria-labelledby="titulo-acceso" className="w-full">
      <div className="flex flex-col gap-3">
        <Campo
          ref={refIdentificador}
          etiqueta="Usuario o correo"
          name="identificador"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={200}
          error={errores.identificador}
          onInput={() => limpiarError("identificador")}
        />
        <Campo
          ref={refPassword}
          etiqueta="Contraseña"
          name="password"
          type={passwordVisible ? "text" : "password"}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={200}
          error={errores.password}
          onInput={() => limpiarError("password")}
          accion={
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-pressed={passwordVisible}
              aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="grid size-10 select-none place-items-center rounded-[8px] text-tenue transition-[transform,color] duration-150 ease-salida hover:text-tinta active:scale-[0.97]"
            >
              {passwordVisible ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          }
        />
      </div>

      <Boton
        type="submit"
        cargando={enviando}
        textoCargando="Entrando"
        className="mt-3 h-12 w-full text-base"
      >
        Entrar al portal
        <ArrowRight aria-hidden="true" size={18} />
      </Boton>

      <div role="alert" className="mt-4 min-h-12 text-sm">
        {errores.general ? (
          <p key={errores.general} className="entrada-mensaje flex items-start gap-2 text-error">
            <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {errores.general}
          </p>
        ) : sesionExpirada ? (
          <p className="flex items-start gap-2 text-tenue">
            <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            Tu sesión terminó. Entra de nuevo para continuar.
          </p>
        ) : null}
      </div>
    </form>
  );
}

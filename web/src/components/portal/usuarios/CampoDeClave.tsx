"use client";

import { Check, Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { LIMITES_DE_USUARIO, generarClaveTemporal } from "@/lib/portal/reglas-usuarios";

type Props = {
  etiqueta: string;
  valor: string;
  error?: string;
  ayuda: string;
  deshabilitado?: boolean;
  alCambiar: (valor: string) => void;
};

const ESPERA_DE_COPIADO_MS = 1600;

export function CampoDeClave({ etiqueta, valor, error, ayuda, deshabilitado = false, alCambiar }: Props) {
  const [visible, setVisible] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [avisoDeCopia, setAvisoDeCopia] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
    };
  }, []);

  function generar() {
    alCambiar(generarClaveTemporal());
    setVisible(true);
    setCopiado(false);
    setAvisoDeCopia("Se generó una contraseña temporal segura.");
  }

  async function copiar() {
    if (!valor) {
      return;
    }
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setAvisoDeCopia("Contraseña copiada al portapapeles.");
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
      temporizador.current = setTimeout(() => setCopiado(false), ESPERA_DE_COPIADO_MS);
    } catch {
      setVisible(true);
      setAvisoDeCopia("No se pudo copiar. Selecciona la contraseña y cópiala a mano.");
    }
  }

  return (
    <div className="min-w-0">
      <Campo
        etiqueta={etiqueta}
        name="passwordTemporal"
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        autoCapitalize="off"
        spellCheck={false}
        required
        maxLength={LIMITES_DE_USUARIO.passwordTemporal}
        className="cifras"
        value={valor}
        error={error}
        ayuda={ayuda}
        disabled={deshabilitado}
        onChange={(evento) => alCambiar(evento.target.value)}
        accion={
          <button
            type="button"
            onClick={() => setVisible((previo) => !previo)}
            aria-pressed={visible}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            disabled={deshabilitado}
            className="grid size-10 place-items-center rounded-control text-tenue transition-[transform,background-color,color] duration-150 ease-salida hover:bg-superficie-alta hover:text-tinta active:scale-[0.97] disabled:pointer-events-none"
          >
            {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Boton
          variante="elevado"
          tamano="compacto"
          textoCargando=""
          disabled={deshabilitado}
          onClick={generar}
        >
          <KeyRound aria-hidden="true" size={16} />
          Generar una segura
        </Boton>
        <Boton
          variante="elevado"
          tamano="compacto"
          textoCargando=""
          disabled={deshabilitado || !valor}
          onClick={copiar}
        >
          {copiado ? (
            <Check aria-hidden="true" size={16} className="text-exito" />
          ) : (
            <Copy aria-hidden="true" size={16} />
          )}
          {copiado ? "Copiada" : "Copiar"}
        </Boton>
      </div>
      <p role="status" className="sr-only">
        {avisoDeCopia}
      </p>
    </div>
  );
}

"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Campo } from "@/components/ui/Campo";
import { LONGITUD_MAXIMA_DE_CLAVE } from "@/lib/acceso/reglas-clave";

type Props = {
  etiqueta: string;
  nombre: string;
  valor: string;
  autocompletar: "current-password" | "new-password";
  error?: string;
  ayuda?: string;
  deshabilitado?: boolean;
  alCambiar: (valor: string) => void;
};

export function CampoDeContrasena({
  etiqueta,
  nombre,
  valor,
  autocompletar,
  error,
  ayuda,
  deshabilitado = false,
  alCambiar,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <Campo
      etiqueta={etiqueta}
      name={nombre}
      type={visible ? "text" : "password"}
      autoComplete={autocompletar}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      maxLength={LONGITUD_MAXIMA_DE_CLAVE}
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
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          disabled={deshabilitado}
          className="grid size-10 select-none place-items-center rounded-[8px] text-tenue transition-[transform,color] duration-150 ease-salida hover:text-tinta active:scale-[0.97] disabled:pointer-events-none"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      }
    />
  );
}

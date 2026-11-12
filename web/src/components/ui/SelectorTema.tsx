"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { CURVA_SALIDA, DURACION, resorteFirme } from "@/lib/motion";

const ICONO_OCULTO = { opacity: 0, scale: 0.9, rotate: -40 };
const ICONO_VISIBLE = { opacity: 1, scale: 1, rotate: 0, transition: resorteFirme };
const ICONO_FUERA = {
  opacity: 0,
  scale: 0.9,
  rotate: 40,
  transition: { duration: DURACION.pulsacion, ease: CURVA_SALIDA },
};

const sinSuscripcion = () => () => {};
const enCliente = () => true;
const enServidor = () => false;

export function SelectorTema({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useSyncExternalStore(sinSuscripcion, enCliente, enServidor);
  const [usado, setUsado] = useState(false);

  const oscuro = resolvedTheme !== "light";
  const Icono = oscuro ? Sun : Moon;
  const etiqueta = montado
    ? oscuro
      ? "Cambiar a tema claro"
      : "Cambiar a tema oscuro"
    : "Cambiar tema";

  function alternar() {
    setUsado(true);
    setTheme(oscuro ? "light" : "dark");
  }

  return (
    <MotionConfig reducedMotion="user">
      <button
        type="button"
        onClick={alternar}
        aria-label={etiqueta}
        title={etiqueta}
        className={`relative grid size-11 shrink-0 select-none place-items-center rounded-control text-tenue transition-[transform,background-color,color] duration-150 ease-salida hover:bg-superficie hover:text-tinta active:scale-[0.97] ${className}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {montado ? (
            <motion.span
              key={oscuro ? "sol" : "luna"}
              initial={usado ? ICONO_OCULTO : false}
              animate={ICONO_VISIBLE}
              exit={ICONO_FUERA}
              className="grid place-items-center"
            >
              <Icono aria-hidden="true" size={18} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>
    </MotionConfig>
  );
}

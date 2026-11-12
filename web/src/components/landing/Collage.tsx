"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Bot,
  CalendarCheck,
  Check,
  FileText,
  ImageIcon,
  Pause,
  Play,
  UserRound,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { entradaGrupo, entradaPieza } from "@/lib/motion";

const INTERVALO_MS = 3200;
const CONSULTA_ESCRITORIO = "(min-width: 1024px)";

const ARRIBA = "lg:right-0 lg:top-0 lg:w-[74%]";
const CENTRO = "lg:left-0 lg:top-[35%] lg:z-10 lg:w-[76%]";
const ABAJO = "lg:bottom-0 lg:right-0 lg:w-[70%]";

type Tono = "exito" | "aviso" | "error";

type Pieza = {
  id: string;
  posicion: string;
  elevada?: boolean;
  contenido: ReactNode;
};

type Conjunto = {
  id: string;
  descripcion: string;
  piezas: Pieza[];
};

const ASISTENCIA: { codigo: string; tono: Tono; texto: string }[] = [
  { codigo: "EST-0142", tono: "exito", texto: "Presente" },
  { codigo: "EST-0143", tono: "exito", texto: "Presente" },
  { codigo: "EST-0147", tono: "aviso", texto: "Justificado" },
  { codigo: "EST-0151", tono: "error", texto: "Ausente" },
];

function Estado({ tono, children }: { tono: Tono; children: ReactNode }) {
  const color = { exito: "bg-exito", aviso: "bg-aviso", error: "bg-error" }[tono];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-tinta">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${color}`} />
      {children}
    </span>
  );
}

function Icono({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-control bg-acento/15 text-acento"
    >
      {children}
    </span>
  );
}

const CONJUNTOS: Conjunto[] = [
  {
    id: "club",
    descripcion:
      "Ejemplo de un club: 18 de 20 cupos ocupados, horario de lunes y miércoles y su docente coordinador.",
    piezas: [
      {
        id: "club-ficha",
        posicion: ARRIBA,
        contenido: (
          <>
            <div className="flex items-start gap-3">
              <Icono>
                <Bot size={20} strokeWidth={1.75} />
              </Icono>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Club de Robótica</p>
                  <Estado tono="exito">Activo</Estado>
                </div>
                <p className="mt-0.5 text-sm text-tenue">
                  Unidad educativa fiscal · AMIE <span className="font-mono">09H00000</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-tenue">Cupos</span>
                <span className="cifras">18 de 20</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-linea">
                <div className="h-full w-[90%] rounded-full bg-acento" />
              </div>
            </div>
          </>
        ),
      },
      {
        id: "club-horario",
        posicion: CENTRO,
        elevada: true,
        contenido: (
          <>
            <p className="text-sm text-tenue">Horario del curso</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center justify-between gap-3">
                <span>Lunes</span>
                <span className="cifras text-tenue">14:00 a 16:00</span>
              </li>
              <li className="flex items-center justify-between gap-3 border-t border-linea pt-2">
                <span>Miércoles</span>
                <span className="cifras text-tenue">14:00 a 16:00</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "club-docente",
        posicion: ABAJO,
        contenido: (
          <div className="flex items-center gap-3">
            <Icono>
              <UserRound size={20} strokeWidth={1.75} />
            </Icono>
            <div>
              <p className="font-medium">Docente coordinador</p>
              <p className="text-sm text-tenue">2 clubes a su cargo</p>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "sesion",
    descripcion:
      "Ejemplo de una sesión ejecutada sobre sensores de línea, con la asistencia de cada estudiante: 17 de 18 presentes.",
    piezas: [
      {
        id: "sesion-ficha",
        posicion: ARRIBA,
        contenido: (
          <div className="flex items-start gap-3">
            <Icono>
              <CalendarCheck size={20} strokeWidth={1.75} />
            </Icono>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Sesión 12</p>
                <Estado tono="exito">Ejecutada</Estado>
              </div>
              <p className="mt-0.5 text-sm text-tenue">Sensores de línea · miércoles, 2 horas</p>
            </div>
          </div>
        ),
      },
      {
        id: "sesion-asistencia",
        posicion: "lg:left-0 lg:top-[24%] lg:z-10 lg:w-[76%]",
        elevada: true,
        contenido: (
          <>
            <p className="text-sm text-tenue">Asistencia</p>
            <ul className="mt-2">
              {ASISTENCIA.map((fila, indice) => (
                <li
                  key={fila.codigo}
                  className={`flex items-center justify-between gap-3 py-1.5 ${
                    indice > 0 ? "border-t border-linea" : ""
                  }`}
                >
                  <span className="font-mono text-sm">{fila.codigo}</span>
                  <Estado tono={fila.tono}>{fila.texto}</Estado>
                </li>
              ))}
            </ul>
          </>
        ),
      },
      {
        id: "sesion-resumen",
        posicion: ABAJO,
        contenido: (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-tenue">Presentes</span>
            <span className="cifras text-2xl font-medium tracking-tight">17 de 18</span>
          </div>
        ),
      },
    ],
  },
  {
    id: "evidencia",
    descripcion:
      "Ejemplo de evidencias de una sesión: una fotografía con autorización de imagen, un informe en PDF y un certificado verificable.",
    piezas: [
      {
        id: "evidencia-foto",
        posicion: ARRIBA,
        contenido: (
          <div className="flex items-start gap-3">
            <Icono>
              <ImageIcon size={20} strokeWidth={1.75} />
            </Icono>
            <div>
              <p className="font-medium">Fotografía del prototipo</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-tenue">
                <Check aria-hidden="true" size={15} className="shrink-0 text-exito" />
                Autorización de imagen comprobada
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "evidencia-informe",
        posicion: CENTRO,
        elevada: true,
        contenido: (
          <div className="flex items-start gap-3">
            <Icono>
              <FileText size={20} strokeWidth={1.75} />
            </Icono>
            <div>
              <p className="font-medium">Informe de sesión.pdf</p>
              <p className="mt-0.5 text-sm text-tenue">
                <span className="cifras">64 kB</span> · ligado a la sesión 12
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "evidencia-certificado",
        posicion: ABAJO,
        contenido: (
          <div className="flex items-start gap-3">
            <Icono>
              <Award size={20} strokeWidth={1.75} />
            </Icono>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Certificado</p>
                <Estado tono="exito">Válido</Estado>
              </div>
              <p className="mt-0.5 font-mono text-sm text-tenue">TIPI-7F3K-92QX</p>
            </div>
          </div>
        ),
      },
    ],
  },
];

function suscribirEscritorio(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_ESCRITORIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

function leerEscritorio() {
  return window.matchMedia(CONSULTA_ESCRITORIO).matches;
}

export function Collage() {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const reducir = useReducedMotion();
  const escritorio = useSyncExternalStore(suscribirEscritorio, leerEscritorio, () => false);
  const rota = escritorio && !reducir;

  useEffect(() => {
    if (!rota || pausado) {
      return;
    }
    const temporizador = window.setInterval(() => {
      setIndice((actual) => (actual + 1) % CONJUNTOS.length);
    }, INTERVALO_MS);
    return () => window.clearInterval(temporizador);
  }, [rota, pausado]);

  const conjunto = CONJUNTOS[indice];

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative lg:h-[27rem]">
        <p className="sr-only">{conjunto.descripcion}</p>
        <AnimatePresence mode="wait" initial>
          <motion.div
            key={conjunto.id}
            aria-hidden="true"
            variants={entradaGrupo}
            initial="oculto"
            animate="visible"
            exit="fuera"
            className="flex flex-col gap-3 lg:absolute lg:inset-0 lg:block"
          >
            {conjunto.piezas.map((pieza) => (
              <motion.div
                key={pieza.id}
                variants={entradaPieza}
                className={`rounded-pieza p-5 shadow-pieza lg:absolute ${pieza.posicion} ${
                  pieza.elevada ? "bg-superficie-alta" : "bg-superficie"
                }`}
              >
                {pieza.contenido}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        {rota ? (
          <button
            type="button"
            onClick={() => setPausado((valor) => !valor)}
            aria-pressed={pausado}
            aria-label={pausado ? "Reanudar el cambio de ejemplos" : "Pausar el cambio de ejemplos"}
            className="absolute -bottom-5 -right-5 z-20 flex size-11 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-pieza transition-[transform,background-color] duration-150 ease-salida hover:bg-acento/90 active:scale-[0.97]"
          >
            {pausado ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
    </MotionConfig>
  );
}

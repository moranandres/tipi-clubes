"use client";

import { MotionConfig, motion } from "framer-motion";
import {
  Activity,
  Award,
  BookOpen,
  Bot,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  FolderKanban,
  GraduationCap,
  History,
  Images,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Presentation,
  ShieldCheck,
  Tags,
  TrendingUp,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { empujeIcono, pulsacion, resorteFirme } from "@/lib/motion";
import type { IdOpcion, SeccionMenu } from "@/lib/portal/menu";

const ICONOS: Record<IdOpcion, LucideIcon> = {
  panel: LayoutDashboard,
  catalogo: LayoutGrid,
  instituciones: Landmark,
  clubes: Bot,
  docentes: Presentation,
  periodos: CalendarRange,
  estudiantes: GraduationCap,
  historial: History,
  solicitudes: UserPlus,
  retiros: UserMinus,
  cursos: BookOpen,
  competencias: Trophy,
  certificados: Award,
  actividades: CalendarCheck,
  asistencia: ClipboardCheck,
  evidencias: Images,
  proyectos: FolderKanban,
  avances: TrendingUp,
  seguimiento: Activity,
  usuarios: Users,
  contenidos: Tags,
  auditoria: ShieldCheck,
};

const RUTA_PANEL = "/portal";

const EnlaceAnimado = motion.create(Link);

type Props = {
  secciones: SeccionMenu[];
  identificador: string;
  alNavegar?: () => void;
};

function estaActiva(ruta: string, href: string): boolean {
  if (href === RUTA_PANEL) {
    return ruta === RUTA_PANEL;
  }
  return ruta === href || ruta.startsWith(`${href}/`);
}

export function MenuLateral({ secciones, identificador, alNavegar }: Props) {
  const ruta = usePathname();

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label="Secciones del portal" className="flex-1 overflow-y-auto px-3 py-4">
        {secciones.map((seccion, indice) => {
          const idTitulo = `${identificador}-seccion-${indice}`;
          return (
            <section key={seccion.titulo} aria-labelledby={idTitulo} className="mb-5 last:mb-0">
              <h2 id={idTitulo} className="px-3 pb-1.5 text-xs font-medium text-tenue">
                {seccion.titulo}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {seccion.opciones.map((opcion) => {
                  const Icono = ICONOS[opcion.id];
                  const activa = estaActiva(ruta, opcion.href);
                  return (
                    <li key={opcion.id}>
                      <EnlaceAnimado
                        href={opcion.href}
                        onClick={alNavegar}
                        aria-current={activa ? "page" : undefined}
                        initial="reposo"
                        animate="reposo"
                        whileHover="sobre"
                        whileTap={pulsacion}
                        className={`relative flex h-10 select-none items-center gap-3 rounded-control px-3 text-[0.9375rem] transition-colors duration-150 ease-salida ${
                          activa
                            ? "font-medium text-tinta"
                            : "text-tenue hover:bg-superficie hover:text-tinta"
                        }`}
                      >
                        {activa ? (
                          <motion.span
                            layoutId={`${identificador}-activa`}
                            transition={resorteFirme}
                            className="absolute inset-0 rounded-control bg-superficie-alta"
                          />
                        ) : null}
                        <motion.span
                          variants={empujeIcono}
                          className={`relative grid shrink-0 place-items-center ${activa ? "text-acento" : ""}`}
                        >
                          <Icono aria-hidden="true" size={18} />
                        </motion.span>
                        <span className="relative truncate">{opcion.etiqueta}</span>
                      </EnlaceAnimado>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>
    </MotionConfig>
  );
}

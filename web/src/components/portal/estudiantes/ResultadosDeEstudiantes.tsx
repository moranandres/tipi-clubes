import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, SearchX, ShieldAlert, Users } from "lucide-react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { BotonReintentar } from "@/components/portal/Busqueda";
import { Paginacion } from "@/components/portal/Paginacion";
import { listarEstudiantes } from "@/lib/api/estudiantes";
import {
  ESTUDIANTES_POR_PAGINA,
  RUTA_ESTUDIANTES,
  RUTA_HISTORIAL,
  hayFiltrosDeEstudiantes,
  rutaDeEstudiantes,
  rutaDeHistorial,
  type FiltrosEstudiantes,
} from "@/lib/portal/filtros-estudiantes";
import { tieneAlcanceGlobal } from "@/lib/portal/menu";
import { puedeRegistrarEstudiantes, soloVeDatosMinimos } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";
import { TablaEstudiantes } from "./TablaEstudiantes";

type Props = {
  filtros: FiltrosEstudiantes;
  destino: "estudiantes" | "historial";
};

const FORMATO_NUMERO = new Intl.NumberFormat("es-EC");

function alcanceDe(rol?: string): string {
  return tieneAlcanceGlobal(rol) ? "en todas las instituciones" : "en tu institución";
}

export async function ResultadosDeEstudiantes({ filtros, destino }: Props) {
  const [usuario, resultado] = await Promise.all([exigirSesion(), listarEstudiantes(filtros)]);
  const rutaDe = destino === "historial" ? rutaDeHistorial : rutaDeEstudiantes;
  const rutaBase = destino === "historial" ? RUTA_HISTORIAL : RUTA_ESTUDIANTES;

  if (resultado.estado === "sin-servicio") {
    return (
      <AvisoDeLista
        urgente
        icono={<CircleAlert size={20} />}
        titulo="No pudimos cargar los estudiantes"
        accion={<BotonReintentar />}
      >
        El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada y los
        filtros se conservan.
      </AvisoDeLista>
    );
  }

  if (resultado.estado === "denegado") {
    return (
      <AvisoDeLista urgente icono={<ShieldAlert size={20} />} titulo="No tienes acceso a esta lista">
        {resultado.mensaje}
      </AvisoDeLista>
    );
  }

  const { elementos, total, pagina, totalPaginas } = resultado.datos;

  if (elementos.length === 0 && total > 0) {
    redirect(rutaDe({ ...filtros, pagina: totalPaginas }));
  }

  if (total === 0) {
    return hayFiltrosDeEstudiantes(filtros) ? (
      <AvisoDeLista
        icono={<SearchX size={20} />}
        titulo="Ningún estudiante coincide con los filtros"
        accion={
          <Link href={rutaBase} className="font-medium text-acento">
            Ver todos los estudiantes
          </Link>
        }
      >
        Prueba con otro nombre o código, o cambia el curso, el estado o la institución.
      </AvisoDeLista>
    ) : (
      <AvisoDeLista icono={<Users size={20} />} titulo="Todavía no hay estudiantes">
        {puedeRegistrarEstudiantes(usuario?.rol)
          ? "Registra al primer estudiante con el botón Nuevo estudiante de la sección Estudiantes."
          : "Cuando se registre el primer estudiante aparecerá en esta lista."}
      </AvisoDeLista>
    );
  }

  const primero = (pagina - 1) * ESTUDIANTES_POR_PAGINA + 1;
  const ultimo = primero + elementos.length - 1;
  const global = tieneAlcanceGlobal(usuario?.rol);

  return (
    <>
      <p role="status" className="cifras text-[0.9375rem] text-tenue">
        {total === 1
          ? `1 estudiante ${alcanceDe(usuario?.rol)}`
          : `${FORMATO_NUMERO.format(total)} estudiantes ${alcanceDe(usuario?.rol)}`}
        {totalPaginas > 1 ? `, del ${primero} al ${ultimo}` : ""}.
      </p>
      <div className="mt-4">
        <TablaEstudiantes
          estudiantes={elementos}
          mostrarInstitucion={global}
          minima={soloVeDatosMinimos(usuario?.rol)}
          enlace={destino === "historial" ? "historial" : "ficha"}
        />
      </div>
      <Paginacion
        etiqueta="Páginas de la lista de estudiantes"
        pagina={pagina}
        totalPaginas={totalPaginas}
        rutaAnterior={pagina > 1 ? rutaDe({ ...filtros, pagina: pagina - 1 }) : null}
        rutaSiguiente={pagina < totalPaginas ? rutaDe({ ...filtros, pagina: pagina + 1 }) : null}
      />
    </>
  );
}

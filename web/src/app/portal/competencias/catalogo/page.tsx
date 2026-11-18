import type { Metadata } from "next";
import { BookMarked, CircleAlert, ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { AvisoDeLista } from "@/components/portal/AvisoDeLista";
import { FormularioCompetencia } from "@/components/portal/competencias/FormularioCompetencia";
import { EstadoDeCatalogo } from "@/components/portal/competencias/PiezasDeCompetencia";
import { BotonRecargar } from "@/components/portal/formularios/BotonRecargar";
import {
  COLUMNAS_DE_GESTION,
  CONTENEDOR_DE_GESTION,
  EncabezadoDeGestion,
  EnlaceVolver,
  EsqueletoDeGestion,
} from "@/components/portal/formularios/PiezasDeGestion";
import { EnlaceBoton } from "@/components/ui/EnlaceBoton";
import { listarCompetencias, type Competencia } from "@/lib/api/competencias";
import { RUTA_COMPETENCIAS, rutaDeCompetenciaDelCatalogo } from "@/lib/portal/filtros-competencias";
import { puedeAdministrarCatalogoDeCompetencias } from "@/lib/portal/permisos";
import { exigirSesion } from "@/lib/sesion/usuario";

export const metadata: Metadata = {
  title: "Catálogo de competencias",
};

const COMPETENCIA_VACIA = { nombre: "", organizador: "", sitioWeb: "" };

function plural(cantidad: number, singular: string, varias: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varias}`;
}

function TarjetaDeCompetencia({ competencia, gestionable }: { competencia: Competencia; gestionable: boolean }) {
  const categorias = (competencia.categoriasBasicas ?? 0) + (competencia.categoriasAvanzadas ?? 0);
  return (
    <li className="flex flex-col rounded-pieza bg-superficie p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 break-words font-medium">{competencia.nombre}</p>
        <span className="shrink-0 text-sm">
          <EstadoDeCatalogo activa={competencia.activa} />
        </span>
      </div>
      {competencia.organizador ? (
        <p className="mt-1 break-words text-[0.9375rem] text-tenue">{competencia.organizador}</p>
      ) : null}
      <p className="cifras mt-3 text-sm text-tenue">
        {plural(competencia.ediciones ?? 0, "edición", "ediciones")} ·{" "}
        {plural(categorias, "categoría", "categorías")} ({competencia.categoriasBasicas ?? 0} básicas,{" "}
        {competencia.categoriasAvanzadas ?? 0} avanzadas)
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <EnlaceBoton
          href={rutaDeCompetenciaDelCatalogo(competencia.id ?? 0)}
          variante="elevado"
          tamano="compacto"
        >
          {gestionable ? "Gestionar" : "Ver ediciones y categorías"}
          <span className="sr-only"> de {competencia.nombre}</span>
        </EnlaceBoton>
        {competencia.sitioWeb ? (
          <a
            href={competencia.sitioWeb}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-acento transition-[background-color] duration-150 ease-salida hover:bg-superficie-alta"
          >
            Sitio web
            <ExternalLink aria-hidden="true" size={14} />
            <span className="sr-only"> de {competencia.nombre} (se abre en otra pestaña)</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}

async function Contenido() {
  const [usuario, competencias] = await Promise.all([exigirSesion(), listarCompetencias()]);
  const gestionable = puedeAdministrarCatalogoDeCompetencias(usuario?.rol);

  if (!competencias) {
    return (
      <div className="mt-8">
        <AvisoDeLista
          urgente
          icono={<CircleAlert size={20} />}
          titulo="No pudimos cargar el catálogo"
          accion={<BotonRecargar />}
        >
          El servidor de TIPI 3.0 no responde en este momento. Tu sesión sigue guardada.
        </AvisoDeLista>
      </div>
    );
  }

  return (
    <div className={COLUMNAS_DE_GESTION}>
      <section aria-labelledby="lista-de-competencias" className="min-w-0">
        <h2 id="lista-de-competencias" className="text-lg font-medium">
          {competencias.length === 1 ? "1 competencia" : `${competencias.length} competencias`}
        </h2>
        {competencias.length === 0 ? (
          <div className="mt-4">
            <AvisoDeLista icono={<BookMarked size={20} />} titulo="El catálogo está vacío">
              {gestionable
                ? "Agrega la primera competencia con el formulario. Después le sumarás sus ediciones y categorías."
                : "Cuando el administrador agregue competencias aparecerán aquí."}
            </AvisoDeLista>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {competencias.map((competencia) => (
              <TarjetaDeCompetencia key={competencia.id} competencia={competencia} gestionable={gestionable} />
            ))}
          </ul>
        )}
      </section>
      {gestionable ? (
        <section aria-labelledby="nueva-competencia" className="rounded-pieza border border-linea p-5">
          <h2 id="nueva-competencia" className="text-lg font-medium">
            Agregar competencia
          </h2>
          <p className="mt-2 text-[0.9375rem] text-tenue">
            Se crea activa. Luego agrega sus ediciones y categorías para poder inscribir estudiantes.
          </p>
          <div className="mt-4">
            <FormularioCompetencia competenciaId={null} iniciales={COMPETENCIA_VACIA} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function PaginaCatalogoDeCompetencias() {
  return (
    <div className={CONTENEDOR_DE_GESTION}>
      <EnlaceVolver href={RUTA_COMPETENCIAS}>Volver a competencias</EnlaceVolver>
      <EncabezadoDeGestion
        titulo="Catálogo de competencias"
        detalle="Competencias en las que participan los clubes, con sus ediciones por año y sus categorías básicas y avanzadas. Lo administra el administrador del sistema."
      />
      <Suspense fallback={<EsqueletoDeGestion mensaje="Cargando el catálogo de competencias." />}>
        <Contenido />
      </Suspense>
    </div>
  );
}

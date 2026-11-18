"use client";

import { Pencil, Power, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useAlOcultar, useEnvio } from "@/components/portal/formularios/ganchos";
import { ZonaDeAviso } from "@/components/portal/formularios/ZonaDeAviso";
import { Boton } from "@/components/ui/Boton";
import type { ResultadoDeAccion } from "@/lib/acciones/resultado";
import { EstadoDeCatalogo } from "./PiezasDeCompetencia";

type Props = {
  titulo: string;
  detalle: ReactNode;
  activa: boolean;
  gestionable: boolean;
  formulario: ReactNode;
  cambiarEstado: (estado: string) => Promise<ResultadoDeAccion>;
};

export function ElementoDelCatalogo({
  titulo,
  detalle,
  activa,
  gestionable,
  formulario,
  cambiarEstado,
}: Props) {
  const idPanel = useId();
  const [editando, setEditando] = useState(false);
  const { pendiente, aviso, enviar, avisar, limpiarAviso } = useEnvio();

  useAlOcultar(() => setEditando(false));

  function alternarEstado() {
    limpiarAviso();
    enviar(
      () => cambiarEstado(activa ? "INACTIVA" : "ACTIVA"),
      (resultado) => avisar(resultado.ok ? "exito" : "error", resultado.mensaje),
    );
  }

  return (
    <li className="rounded-pieza bg-superficie p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 break-words font-medium">{titulo}</span>
            <span className="text-sm">
              <EstadoDeCatalogo activa={activa} />
            </span>
          </p>
          <div className="mt-1 text-sm text-tenue">{detalle}</div>
        </div>
        {gestionable ? (
          <div className="flex shrink-0 gap-2">
            <Boton
              tamano="compacto"
              variante="elevado"
              textoCargando=""
              aria-expanded={editando}
              aria-controls={idPanel}
              onClick={() => setEditando((previo) => !previo)}
            >
              {editando ? <X aria-hidden="true" size={16} /> : <Pencil aria-hidden="true" size={16} />}
              {editando ? "Cerrar" : "Editar"}
              <span className="sr-only"> {titulo}</span>
            </Boton>
            <Boton
              tamano="compacto"
              variante={activa ? "peligro" : "elevado"}
              cargando={pendiente}
              textoCargando={activa ? "Desactivando" : "Activando"}
              onClick={alternarEstado}
            >
              <Power aria-hidden="true" size={16} />
              {activa ? "Desactivar" : "Activar"}
              <span className="sr-only"> {titulo}</span>
            </Boton>
          </div>
        ) : null}
      </div>
      {gestionable && aviso ? <ZonaDeAviso aviso={aviso} className="mt-2" /> : null}
      {editando ? (
        <div id={idPanel} className="entrada-mensaje mt-3 border-t border-linea pt-4">
          {formulario}
        </div>
      ) : null}
    </li>
  );
}

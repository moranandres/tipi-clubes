"use client";

import { Campo } from "@/components/ui/Campo";
import { CampoTextoLargo } from "@/components/ui/CampoTextoLargo";
import { LIMITES_DE_PARTICIPACION, type DatosDeResultado } from "@/lib/portal/reglas-competencias";
import { fechaCorta } from "@/lib/portal/tiempo";

type Props = {
  valores: DatosDeResultado;
  errores: Partial<Record<keyof DatosDeResultado, string>>;
  inicioPendiente: string | null;
  cambiar: (campo: keyof DatosDeResultado, valor: string) => void;
};

export function CamposDeResultado({ valores, errores, inicioPendiente, cambiar }: Props) {
  const ayudaDeResultado = inicioPendiente
    ? `Se registra desde el inicio de la edición, el ${fechaCorta(inicioPendiente)}.`
    : undefined;

  return (
    <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Campo
          etiqueta="Equipo (opcional)"
          name="equipoNombre"
          type="text"
          autoComplete="off"
          maxLength={LIMITES_DE_PARTICIPACION.equipo}
          value={valores.equipoNombre}
          error={errores.equipoNombre}
          ayuda="Escribe el mismo nombre para todos los integrantes del equipo."
          onChange={(evento) => cambiar("equipoNombre", evento.target.value)}
        />
      </div>
      <Campo
        etiqueta="Puesto (opcional)"
        name="puesto"
        type="number"
        inputMode="numeric"
        min={LIMITES_DE_PARTICIPACION.puestoMinimo}
        max={LIMITES_DE_PARTICIPACION.puestoMaximo}
        step={1}
        className="cifras"
        value={valores.puesto}
        error={errores.puesto}
        ayuda={ayudaDeResultado ?? "Lugar obtenido, del 1 al 999."}
        onChange={(evento) => cambiar("puesto", evento.target.value)}
      />
      <Campo
        etiqueta="Reconocimiento (opcional)"
        name="reconocimiento"
        type="text"
        autoComplete="off"
        maxLength={LIMITES_DE_PARTICIPACION.reconocimiento}
        placeholder="Mejor diseño, mención de honor"
        value={valores.reconocimiento}
        error={errores.reconocimiento}
        ayuda={ayudaDeResultado ?? "Premio o mención distinta del puesto."}
        onChange={(evento) => cambiar("reconocimiento", evento.target.value)}
      />
      <div className="sm:col-span-2">
        <CampoTextoLargo
          etiqueta="Observaciones (opcional)"
          name="observaciones"
          rows={3}
          maxLength={LIMITES_DE_PARTICIPACION.observaciones}
          value={valores.observaciones}
          error={errores.observaciones}
          ayuda={`${valores.observaciones.trim().length} de ${LIMITES_DE_PARTICIPACION.observaciones} caracteres.`}
          onChange={(evento) => cambiar("observaciones", evento.target.value)}
        />
      </div>
    </div>
  );
}

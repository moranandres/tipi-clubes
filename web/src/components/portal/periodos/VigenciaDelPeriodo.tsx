"use client";

import { CambioDeEstado } from "@/components/portal/formularios/CambioDeEstado";
import { activarPeriodo } from "@/lib/acciones/periodos";
import { PUNTO_NO_VIGENTE, PUNTO_VIGENTE } from "@/lib/portal/reglas-periodos";

type Props = {
  periodoId: number;
  vigente: boolean;
  vigenteActual: string | null;
};

const ESTADO_VIGENTE = "VIGENTE";

export function VigenciaDelPeriodo({ periodoId, vigente, vigenteActual }: Props) {
  const opciones = vigente
    ? []
    : [
        {
          estado: ESTADO_VIGENTE,
          accion: "Marcar como vigente",
          descripcion: "Será el período que se propone al crear clubes.",
          exigeMotivo: false,
          bloqueos: [],
          avisos: vigenteActual ? [`${vigenteActual} dejará de ser el período vigente.`] : [],
        },
      ];

  return (
    <CambioDeEstado
      titulo="Vigencia del período"
      estadoActual={vigente ? "Vigente" : "No vigente"}
      puntoActual={vigente ? PUNTO_VIGENTE : PUNTO_NO_VIGENTE}
      opciones={opciones}
      sinOpciones="Este es el período vigente. Para cambiarlo, marca como vigente otro período."
      conMotivo={false}
      cambiar={() => activarPeriodo(periodoId)}
    />
  );
}

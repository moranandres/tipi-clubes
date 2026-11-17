import {
  EsqueletoFichasPorEstado,
  FichasPorEstado,
} from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  PLURALES_DE_TIPO_DE_EVIDENCIA,
  PUNTOS_DE_TIPO_DE_EVIDENCIA,
  TIPOS_DE_EVIDENCIA,
  rutaDeEvidencias,
  type FiltrosEvidencias,
  type TipoEvidencia,
} from "@/lib/portal/filtros-evidencias";

type Props = {
  filtros: FiltrosEvidencias;
  conteos: ConteosDe<TipoEvidencia>;
};

export function ResumenDeEvidencias({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Evidencias por tipo"
      elegido={filtros.tipo}
      fichas={TIPOS_DE_EVIDENCIA.map((tipo) => ({
        valor: tipo,
        nombre: PLURALES_DE_TIPO_DE_EVIDENCIA[tipo],
        punto: PUNTOS_DE_TIPO_DE_EVIDENCIA[tipo],
        cantidad: conteos[tipo],
        ruta: rutaDeEvidencias({
          ...filtros,
          tipo: filtros.tipo === tipo ? null : tipo,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeEvidencias() {
  return <EsqueletoFichasPorEstado cantidad={TIPOS_DE_EVIDENCIA.length} />;
}

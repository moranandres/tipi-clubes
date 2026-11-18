import { EsqueletoFichasPorEstado, FichasPorEstado } from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ALCANCES_DE_AVANCE,
  PLURALES_DE_ALCANCE,
  PUNTOS_DE_ALCANCE,
  rutaDeAvances,
  type AlcanceAvance,
  type FiltrosAvances,
} from "@/lib/portal/filtros-avances";

type Props = {
  filtros: FiltrosAvances;
  conteos: ConteosDe<AlcanceAvance>;
};

const COLUMNAS = "sm:grid-cols-3 lg:max-w-[54rem]";

export function ResumenDeAvances({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Avances por alcance"
      elegido={filtros.alcance}
      columnas={COLUMNAS}
      fichas={ALCANCES_DE_AVANCE.map((alcance) => ({
        valor: alcance,
        nombre: PLURALES_DE_ALCANCE[alcance],
        punto: PUNTOS_DE_ALCANCE[alcance],
        cantidad: conteos[alcance],
        ruta: rutaDeAvances({ ...filtros, alcance: filtros.alcance === alcance ? null : alcance, pagina: 1 }),
      }))}
    />
  );
}

export function EsqueletoResumenDeAvances() {
  return <EsqueletoFichasPorEstado cantidad={ALCANCES_DE_AVANCE.length} columnas={COLUMNAS} />;
}

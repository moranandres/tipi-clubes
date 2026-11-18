import { EsqueletoFichasPorEstado, FichasPorEstado } from "@/components/portal/FichasPorEstado";
import type { ConteosDe } from "@/lib/api/lista";
import {
  ESTADOS_DE_CERTIFICADO,
  PLURALES_DE_ESTADO_DE_CERTIFICADO,
  PUNTOS_DE_ESTADO_DE_CERTIFICADO,
  rutaDeCertificados,
  type EstadoCertificado,
  type FiltrosCertificados,
} from "@/lib/portal/filtros-certificados";

type Props = {
  filtros: FiltrosCertificados;
  conteos: ConteosDe<EstadoCertificado>;
};

const COLUMNAS = "sm:grid-cols-2 lg:max-w-[36rem]";

export function ResumenDeCertificados({ filtros, conteos }: Props) {
  return (
    <FichasPorEstado
      etiqueta="Certificados por estado"
      elegido={filtros.estado}
      columnas={COLUMNAS}
      fichas={ESTADOS_DE_CERTIFICADO.map((estado) => ({
        valor: estado,
        nombre: PLURALES_DE_ESTADO_DE_CERTIFICADO[estado],
        punto: PUNTOS_DE_ESTADO_DE_CERTIFICADO[estado],
        cantidad: conteos[estado],
        ruta: rutaDeCertificados({
          ...filtros,
          estado: filtros.estado === estado ? null : estado,
          pagina: 1,
        }),
      }))}
    />
  );
}

export function EsqueletoResumenDeCertificados() {
  return <EsqueletoFichasPorEstado cantidad={ESTADOS_DE_CERTIFICADO.length} columnas={COLUMNAS} />;
}

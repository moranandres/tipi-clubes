package ec.edu.ups.tipi.seguimiento.dto;

import java.time.LocalDate;
import java.util.List;

public record ResumenSeguimientoResponse(
        Integer periodoId, String periodoNombre, Long institucionId, LocalDate desde, LocalDate hasta,
        LocalDate fechaCorte, LocalDate exigibleHasta, ParametrosSeguimientoResponse parametros,
        long totalClubes, long clubesAdecuados, long clubesEnRiesgo, long clubesCriticos, long clubesSinDatos,
        IndicadoresSeguimiento totales, List<InstitucionSeguimientoResponse> instituciones,
        List<ClubSeguimientoResponse> clubes, List<MesSeguimientoResponse> meses) {
}

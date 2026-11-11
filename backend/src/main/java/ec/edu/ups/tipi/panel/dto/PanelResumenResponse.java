package ec.edu.ups.tipi.panel.dto;

import java.time.Instant;
import java.time.LocalDate;

public record PanelResumenResponse(
        String rol,
        boolean alcanceGlobal,
        Long institucionId,
        String institucionNombre,
        PeriodoPanel periodoActivo,
        LocalDate fechaCorte,
        IndicadoresPanel indicadores,
        PendientesPanel pendientes,
        SeguimientoPanel seguimiento,
        Instant generadoEn) {

    public record PeriodoPanel(Integer id, String nombre, LocalDate fechaInicio, LocalDate fechaFin) {
    }

    public record IndicadoresPanel(long instituciones, long clubes, long clubesActivos, long docentesActivos,
                                   Long usuariosActivos) {
    }

    public record PendientesPanel(long sesionesSinEjecucion, long sesionesProximosSieteDias,
                                  long solicitudesInscripcionPorResolver, long solicitudesRetiroPorResolver) {
    }

    public record SeguimientoPanel(long totalClubes, long clubesAdecuados, long clubesEnRiesgo, long clubesCriticos,
                                   long clubesSinDatos) {
    }
}

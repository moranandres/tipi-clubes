package ec.edu.ups.tipi.seguimiento.dto;

import ec.edu.ups.tipi.clubes.EstadoClub;

import java.time.LocalDate;
import java.util.List;

public record SeguimientoClubResponse(
        Long clubId, String clubNombre, EstadoClub estadoClub, Long institucionId, String institucionNombre,
        String docenteNombre, Integer periodoId, String periodoNombre, LocalDate desde, LocalDate hasta,
        LocalDate fechaCorte, LocalDate exigibleHasta, ParametrosSeguimientoResponse parametros,
        IndicadoresSeguimiento indicadores, List<MesSeguimientoResponse> meses,
        List<ActividadSeguimientoResponse> actividades) {
}

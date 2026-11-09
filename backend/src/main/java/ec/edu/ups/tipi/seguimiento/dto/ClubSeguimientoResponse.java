package ec.edu.ups.tipi.seguimiento.dto;

import ec.edu.ups.tipi.clubes.EstadoClub;

import java.time.LocalDate;

public record ClubSeguimientoResponse(
        Long clubId, String clubNombre, EstadoClub estadoClub, Long institucionId, String institucionNombre,
        String docenteNombre, LocalDate ultimaEjecucion, LocalDate proximaActividad,
        IndicadoresSeguimiento indicadores) {
}

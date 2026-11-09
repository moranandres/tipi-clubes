package ec.edu.ups.tipi.avances.dto;

import ec.edu.ups.tipi.avances.NivelLogro;

import java.time.LocalDate;

public record EvaluacionCompetenciaResponse(Long avanceId, LocalDate fecha, Long clubId, String clubNombre,
                                            NivelLogro nivel) {
}

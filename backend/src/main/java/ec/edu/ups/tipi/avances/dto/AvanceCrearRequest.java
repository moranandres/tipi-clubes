package ec.edu.ups.tipi.avances.dto;

import ec.edu.ups.tipi.avances.AlcanceAvance;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record AvanceCrearRequest(
        @NotNull(message = "El club es obligatorio")
        Long clubId,

        @NotNull(message = "Indique el alcance: CLUB, ESTUDIANTE o PROYECTO")
        AlcanceAvance alcance,

        Long estudianteId,

        Long proyectoId,

        Long actividadId,

        LocalDate fecha,

        @NotBlank(message = "Describa los resultados obtenidos")
        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String resultados,

        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String logros,

        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String dificultades,

        @Size(max = 1000, message = "Máximo 1000 caracteres")
        String proximosPasos,

        @Min(value = 0, message = "El porcentaje de avance va de 0 a 100")
        @Max(value = 100, message = "El porcentaje de avance va de 0 a 100")
        Integer porcentajeAvance,

        @Size(max = 15, message = "Máximo 15 competencias por avance")
        List<@Valid @NotNull(message = "La competencia no puede ser nula") CompetenciaEvaluadaRequest> competencias) {
}

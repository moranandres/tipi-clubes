package ec.edu.ups.tipi.clubes.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;

public record ClubCrearRequest(
        @NotNull(message = "La institución es obligatoria")
        Long institucionId,

        @NotNull(message = "El período es obligatorio")
        Integer periodoId,

        @NotNull(message = "El docente responsable es obligatorio")
        Long docenteId,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String nombre,

        @NotBlank(message = "El objetivo es obligatorio")
        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String objetivo,

        @PastOrPresent(message = "La fecha de creación no puede ser futura")
        LocalDate fechaCreacion,

        @Min(value = 1, message = "El día de la semana va de 1 (lunes) a 7 (domingo)")
        @Max(value = 7, message = "El día de la semana va de 1 (lunes) a 7 (domingo)")
        Short diaSemana,

        LocalTime horaInicio,

        LocalTime horaFin,

        @Size(max = 150, message = "Máximo 150 caracteres")
        String lugar,

        @NotNull(message = "El cupo máximo es obligatorio")
        @Min(value = 1, message = "El cupo mínimo es 1")
        @Max(value = 500, message = "El cupo máximo permitido es 500")
        Integer cupoMaximo) {
}
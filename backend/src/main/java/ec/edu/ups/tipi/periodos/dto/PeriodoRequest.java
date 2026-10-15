package ec.edu.ups.tipi.periodos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PeriodoRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 50, message = "Máximo 50 caracteres")
        String nombre,

        @NotNull(message = "La fecha de inicio es obligatoria")
        LocalDate fechaInicio,

        @NotNull(message = "La fecha de fin es obligatoria")
        LocalDate fechaFin) {
}
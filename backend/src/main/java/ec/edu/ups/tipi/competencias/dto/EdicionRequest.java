package ec.edu.ups.tipi.competencias.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EdicionRequest(
        @NotBlank(message = "El nombre de la edición es obligatorio")
        @Size(max = 100, message = "Máximo 100 caracteres")
        String nombre,

        @NotNull(message = "El año es obligatorio")
        @Min(value = 2000, message = "El año debe estar entre 2000 y 2100")
        @Max(value = 2100, message = "El año debe estar entre 2000 y 2100")
        Integer anio,

        LocalDate fechaInicio,

        LocalDate fechaFin,

        @Size(max = 150, message = "Máximo 150 caracteres")
        String sede) {
}

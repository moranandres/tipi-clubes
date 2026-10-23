package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.EstadoAutorizacion;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AutorizacionRequest(
        @NotNull(message = "El estado es obligatorio")
        EstadoAutorizacion estado,

        @PastOrPresent(message = "La fecha de la autorización no puede ser futura")
        LocalDate fechaRegistro,

        @Size(max = 255, message = "Máximo 255 caracteres")
        String observacion) {
}
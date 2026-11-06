package ec.edu.ups.tipi.actividades.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record EjecucionActividadRequest(
        @NotBlank(message = "Describa los contenidos impartidos en la sesión")
        @Size(max = 4000, message = "Máximo 4000 caracteres")
        String resumen,

        @Size(max = 4000, message = "Máximo 4000 caracteres")
        String observaciones,

        @NotEmpty(message = "Indique al menos una herramienta, lenguaje, componente o competencia trabajada")
        @Size(max = 30, message = "Máximo 30 contenidos por actividad")
        List<@NotNull(message = "El identificador del contenido no puede ser nulo") Integer> contenidoIds) {
}

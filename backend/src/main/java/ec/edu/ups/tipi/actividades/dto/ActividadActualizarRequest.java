package ec.edu.ups.tipi.actividades.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ActividadActualizarRequest(
        Long cursoId,

        Long responsableId,

        @NotNull(message = "La fecha es obligatoria")
        LocalDate fecha,

        @NotNull(message = "La hora de inicio es obligatoria")
        LocalTime horaInicio,

        @NotNull(message = "La hora de fin es obligatoria")
        LocalTime horaFin,

        @NotBlank(message = "El tema es obligatorio")
        @Size(max = 200, message = "Máximo 200 caracteres")
        String tema,

        @NotBlank(message = "El objetivo es obligatorio")
        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String objetivo,

        @Size(max = 4000, message = "Máximo 4000 caracteres")
        String descripcion,

        @Size(max = 150, message = "Máximo 150 caracteres")
        String lugar,

        @Size(max = 30, message = "Máximo 30 contenidos por actividad")
        List<@NotNull(message = "El identificador del contenido no puede ser nulo") Integer> contenidoIds,

        @Size(max = 500, message = "Máximo 500 caracteres")
        String motivoReprogramacion) {
}

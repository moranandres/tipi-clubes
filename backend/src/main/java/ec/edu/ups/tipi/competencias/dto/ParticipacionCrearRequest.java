package ec.edu.ups.tipi.competencias.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ParticipacionCrearRequest(
        @NotNull(message = "La inscripción es obligatoria")
        Long inscripcionId,

        @NotNull(message = "La edición es obligatoria")
        Integer edicionId,

        @NotNull(message = "La categoría es obligatoria")
        Integer categoriaId,

        @Size(max = 150, message = "El nombre del equipo admite máximo 150 caracteres")
        String equipoNombre,

        @Min(value = 1, message = "El puesto debe estar entre 1 y 999")
        @Max(value = 999, message = "El puesto debe estar entre 1 y 999")
        Integer puesto,

        @Size(max = 100, message = "El reconocimiento admite máximo 100 caracteres")
        String reconocimiento,

        @Size(max = 1000, message = "Las observaciones admiten máximo 1000 caracteres")
        String observaciones) {

    public ParticipacionActualizarRequest datos() {
        return new ParticipacionActualizarRequest(equipoNombre, puesto, reconocimiento, observaciones);
    }
}

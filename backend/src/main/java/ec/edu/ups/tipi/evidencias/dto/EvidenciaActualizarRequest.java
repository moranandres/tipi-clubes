package ec.edu.ups.tipi.evidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record EvidenciaActualizarRequest(
        @NotBlank(message = "Indique el título de la evidencia")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String titulo,

        @NotBlank(message = "Describa la evidencia")
        @Size(max = 1000, message = "Máximo 1000 caracteres")
        String descripcion,

        @NotNull(message = "Indique la fecha de la evidencia")
        LocalDate fechaEvidencia,

        @Size(max = 60, message = "Máximo 60 estudiantes por evidencia")
        List<@NotNull(message = "El estudiante no puede ser nulo") Long> estudianteIds,

        Boolean sinEstudiantesIdentificables) {
}

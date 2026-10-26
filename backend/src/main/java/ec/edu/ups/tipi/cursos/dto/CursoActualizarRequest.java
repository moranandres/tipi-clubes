package ec.edu.ups.tipi.cursos.dto;

import ec.edu.ups.tipi.cursos.ModalidadCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record CursoActualizarRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String nombre,

        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String descripcion,

        @NotNull(message = "El nivel es obligatorio")
        NivelCurso nivel,

        @NotNull(message = "La modalidad es obligatoria")
        ModalidadCurso modalidad,

        @Size(max = 150, message = "Máximo 150 caracteres")
        String lugar,

        @Size(max = 300, message = "Máximo 300 caracteres")
        @Pattern(regexp = "^https://[^\\s<>\"]+$", message = "El enlace virtual debe ser una dirección https válida")
        String enlaceVirtual,

        @NotNull(message = "La fecha de inicio es obligatoria")
        LocalDate fechaInicio,

        @NotNull(message = "La fecha de fin es obligatoria")
        LocalDate fechaFin,

        @Min(value = 1, message = "La duración mínima es 1 hora")
        @Max(value = 500, message = "La duración máxima es 500 horas")
        Integer duracionHoras,

        @NotNull(message = "El cupo máximo es obligatorio")
        @Min(value = 1, message = "El cupo mínimo es 1")
        @Max(value = 500, message = "El cupo máximo permitido es 500")
        Integer cupoMaximo) {
}
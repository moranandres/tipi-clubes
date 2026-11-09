package ec.edu.ups.tipi.proyectos.dto;

import ec.edu.ups.tipi.proyectos.TipoProyecto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record ProyectoActualizarRequest(
        @NotNull(message = "Indique el tipo: PROTOTIPO, SOFTWARE u OTRO")
        TipoProyecto tipo,

        @NotBlank(message = "Indique el título del proyecto")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String titulo,

        @NotBlank(message = "Indique el objetivo del proyecto")
        @Size(max = 1000, message = "Máximo 1000 caracteres")
        String objetivo,

        @Size(max = 4000, message = "Máximo 4000 caracteres")
        String descripcion,

        @NotNull(message = "Indique el docente tutor del proyecto")
        Long docenteId,

        @NotNull(message = "Indique la fecha de inicio del proyecto")
        LocalDate fechaInicio,

        LocalDate fechaFinPrevista,

        @NotEmpty(message = "Indique al menos un estudiante integrante del proyecto")
        @Size(max = 30, message = "Máximo 30 integrantes por proyecto")
        List<@NotNull(message = "El estudiante no puede ser nulo") Long> estudianteIds) {
}

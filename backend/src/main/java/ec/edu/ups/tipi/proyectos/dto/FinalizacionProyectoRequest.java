package ec.edu.ups.tipi.proyectos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record FinalizacionProyectoRequest(
        @NotBlank(message = "Describa el resultado final del proyecto")
        @Size(max = 2000, message = "Máximo 2000 caracteres")
        String resultadoFinal,

        LocalDate fechaFinalizacion,

        @Size(max = 30, message = "Máximo 30 evidencias por proyecto")
        List<@NotNull(message = "La evidencia no puede ser nula") Long> evidenciaIds) {
}

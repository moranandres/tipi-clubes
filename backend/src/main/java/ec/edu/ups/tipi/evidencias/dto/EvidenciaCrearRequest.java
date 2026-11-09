package ec.edu.ups.tipi.evidencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;

public record EvidenciaCrearRequest(
        @NotBlank(message = "Indique el tipo: FOTOGRAFIA, DOCUMENTO, ENLACE o PRODUCTO")
        @Pattern(regexp = "FOTOGRAFIA|DOCUMENTO|ENLACE|PRODUCTO",
                message = "El tipo debe ser FOTOGRAFIA, DOCUMENTO, ENLACE o PRODUCTO")
        String tipo,

        @NotBlank(message = "Indique el título de la evidencia")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String titulo,

        @NotBlank(message = "Describa la evidencia")
        @Size(max = 1000, message = "Máximo 1000 caracteres")
        String descripcion,

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate fechaEvidencia,

        @Size(max = 500, message = "Máximo 500 caracteres")
        String url,

        @Size(max = 60, message = "Máximo 60 estudiantes por evidencia")
        List<@NotNull(message = "El estudiante no puede ser nulo") Long> estudianteIds,

        Boolean sinEstudiantesIdentificables) {
}

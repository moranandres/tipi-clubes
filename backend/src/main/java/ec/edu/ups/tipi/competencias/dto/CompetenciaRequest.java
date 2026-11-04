package ec.edu.ups.tipi.competencias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CompetenciaRequest(
        @NotBlank(message = "El nombre de la competencia es obligatorio")
        @Size(max = 100, message = "Máximo 100 caracteres")
        String nombre,

        @Size(max = 200, message = "Máximo 200 caracteres")
        String organizador,

        @Size(max = 200, message = "Máximo 200 caracteres")
        @Pattern(regexp = "^\\s*$|^https?://\\S+$", message = "El sitio web debe empezar con http:// o https://")
        String sitioWeb) {
}

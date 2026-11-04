package ec.edu.ups.tipi.competencias.dto;

import ec.edu.ups.tipi.competencias.NivelCategoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoriaRequest(
        @NotNull(message = "El nivel es obligatorio")
        NivelCategoria nivel,

        @NotBlank(message = "El nombre de la categoría es obligatorio")
        @Size(max = 150, message = "Máximo 150 caracteres")
        String nombre,

        @Size(max = 500, message = "Máximo 500 caracteres")
        String descripcion) {
}

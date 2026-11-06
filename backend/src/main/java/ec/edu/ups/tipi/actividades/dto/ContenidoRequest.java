package ec.edu.ups.tipi.actividades.dto;

import ec.edu.ups.tipi.actividades.TipoContenido;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ContenidoRequest(
        @NotNull(message = "El tipo es obligatorio")
        TipoContenido tipo,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "Máximo 100 caracteres")
        String nombre,

        @Size(max = 255, message = "Máximo 255 caracteres")
        String descripcion) {
}

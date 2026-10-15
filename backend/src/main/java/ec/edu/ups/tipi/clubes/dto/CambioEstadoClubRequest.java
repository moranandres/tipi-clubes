package ec.edu.ups.tipi.clubes.dto;

import ec.edu.ups.tipi.clubes.EstadoClub;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CambioEstadoClubRequest(
        @NotNull(message = "El estado es obligatorio")
        EstadoClub estado,

        @Size(max = 255, message = "Máximo 255 caracteres")
        String motivo) {
}
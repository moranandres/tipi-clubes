package ec.edu.ups.tipi.proyectos.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record EvidenciasProyectoRequest(
        @NotNull(message = "Indique la lista de evidencias; envíe una lista vacía para quitar todas")
        @Size(max = 30, message = "Máximo 30 evidencias por proyecto")
        List<@NotNull(message = "La evidencia no puede ser nula") Long> evidenciaIds) {
}

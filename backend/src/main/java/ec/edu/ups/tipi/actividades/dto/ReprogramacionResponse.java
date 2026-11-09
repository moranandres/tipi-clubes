package ec.edu.ups.tipi.actividades.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record ReprogramacionResponse(
        Long id, LocalDate fechaAnterior, LocalTime horaInicioAnterior, LocalTime horaFinAnterior,
        LocalDate fechaNueva, LocalTime horaInicioNueva, LocalTime horaFinNueva, long diasDeDesplazamiento,
        String motivo, String registradoPorNombre, Instant fechaRegistro) {
}

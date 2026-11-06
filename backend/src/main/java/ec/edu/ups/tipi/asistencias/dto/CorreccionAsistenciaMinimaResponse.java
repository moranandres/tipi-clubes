package ec.edu.ups.tipi.asistencias.dto;

import ec.edu.ups.tipi.asistencias.EstadoAsistencia;

import java.time.Instant;

public record CorreccionAsistenciaMinimaResponse(
        Long id, Long asistenciaId, Long estudianteId, String estudianteCodigo,
        EstadoAsistencia estadoAnterior, EstadoAsistencia estadoNuevo, String motivo, String corregidoPorNombre,
        Instant fecha) implements CorreccionAsistenciaVista {
}

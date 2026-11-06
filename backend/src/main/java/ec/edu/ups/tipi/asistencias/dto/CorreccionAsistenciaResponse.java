package ec.edu.ups.tipi.asistencias.dto;

import ec.edu.ups.tipi.asistencias.EstadoAsistencia;

import java.time.Instant;

public record CorreccionAsistenciaResponse(
        Long id, Long asistenciaId, Long estudianteId, String estudianteCodigo, String estudianteNombres,
        String estudianteApellidos, EstadoAsistencia estadoAnterior, EstadoAsistencia estadoNuevo,
        String observacionAnterior, String observacionNueva, String motivo, String corregidoPorNombre,
        Instant fecha) implements CorreccionAsistenciaVista {
}

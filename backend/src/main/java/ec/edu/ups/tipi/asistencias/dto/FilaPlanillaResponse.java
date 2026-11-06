package ec.edu.ups.tipi.asistencias.dto;

import ec.edu.ups.tipi.asistencias.EstadoAsistencia;

import java.time.Instant;

public record FilaPlanillaResponse(
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        Long inscripcionId, Long asistenciaId, EstadoAsistencia estado, String observacion,
        String registradoPorNombre, Instant fechaRegistro, boolean corregida, String corregidoPorNombre,
        Instant fechaCorreccion, String motivoCorreccion) implements FilaPlanillaVista {
}

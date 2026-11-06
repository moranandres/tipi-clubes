package ec.edu.ups.tipi.asistencias.dto;

import ec.edu.ups.tipi.asistencias.EstadoAsistencia;

import java.time.Instant;

public record FilaPlanillaMinimaResponse(
        Long estudianteId, String estudianteCodigo, Long asistenciaId, EstadoAsistencia estado,
        Instant fechaRegistro, boolean corregida) implements FilaPlanillaVista {
}

package ec.edu.ups.tipi.asistencias.dto;

import ec.edu.ups.tipi.asistencias.EstadoAsistencia;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record AsistenciaMinimaResponse(
        Long id, Long actividadId, String actividadTema, LocalDate fecha, LocalTime horaInicio,
        Long clubId, String clubNombre, Long cursoId, String cursoNombre,
        Long estudianteId, String estudianteCodigo, EstadoAsistencia estado, Instant fechaRegistro,
        boolean corregida) implements AsistenciaVista {
}

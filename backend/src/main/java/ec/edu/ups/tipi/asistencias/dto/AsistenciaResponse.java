package ec.edu.ups.tipi.asistencias.dto;

import ec.edu.ups.tipi.asistencias.EstadoAsistencia;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record AsistenciaResponse(
        Long id, Long actividadId, String actividadTema, LocalDate fecha, LocalTime horaInicio,
        Long clubId, String clubNombre, Long cursoId, String cursoNombre,
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        EstadoAsistencia estado, String observacion, String registradoPorNombre, Instant fechaRegistro,
        boolean corregida, String corregidoPorNombre, Instant fechaCorreccion, String motivoCorreccion)
        implements AsistenciaVista {
}

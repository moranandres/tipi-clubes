package ec.edu.ups.tipi.seguimiento.dto;

import ec.edu.ups.tipi.actividades.EstadoActividad;
import ec.edu.ups.tipi.seguimiento.SituacionActividad;

import java.time.LocalDate;
import java.time.LocalTime;

public record ActividadSeguimientoResponse(
        Long id, LocalDate fecha, LocalTime horaInicio, LocalTime horaFin, long duracionMinutos, String tema,
        Long cursoId, String cursoNombre, String responsableNombre, EstadoActividad estado,
        SituacionActividad situacion, LocalDate fechaOriginal, LocalTime horaInicioOriginal,
        LocalTime horaFinOriginal, long reprogramaciones, Long diasDeAtraso, LocalDate fechaRegistroEjecucion,
        Long diasHastaRegistro, Boolean registroOportuno, String motivoCancelacion) {
}

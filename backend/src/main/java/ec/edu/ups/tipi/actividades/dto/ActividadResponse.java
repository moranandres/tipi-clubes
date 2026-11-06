package ec.edu.ups.tipi.actividades.dto;

import ec.edu.ups.tipi.actividades.EstadoActividad;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ActividadResponse(
        Long id, Long clubId, String clubNombre, Long institucionId, String institucionNombre,
        Long cursoId, String cursoNombre, Long responsableId, String responsableNombre,
        LocalDate fecha, LocalTime horaInicio, LocalTime horaFin, long duracionMinutos,
        String tema, String objetivo, String descripcion, String lugar,
        EstadoActividad estado, boolean pendienteDeRegistro, List<ContenidoResumen> contenidos,
        String resumenEjecucion, String observaciones, String ejecutadaPorNombre, Instant fechaRegistroEjecucion,
        String motivoCancelacion, String canceladaPorNombre, Instant fechaCancelacion,
        String creadoPorNombre, Instant createdAt, Instant actualizadoEn) {
}

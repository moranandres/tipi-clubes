package ec.edu.ups.tipi.asistencias.dto;

import ec.edu.ups.tipi.actividades.EstadoActividad;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record PlanillaAsistenciaResponse(
        Long actividadId, String actividadTema, LocalDate fecha, LocalTime horaInicio, LocalTime horaFin,
        EstadoActividad estadoActividad, Long clubId, String clubNombre, Long institucionId,
        String institucionNombre, Long cursoId, String cursoNombre, String responsableNombre,
        boolean editable, String motivoNoEditable, int totalEstudiantes, long registrados, long pendientes,
        ConteoAsistencia conteo, Double porcentajeAsistencia, List<FilaPlanillaVista> estudiantes) {
}

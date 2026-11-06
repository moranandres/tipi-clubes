package ec.edu.ups.tipi.asistencias.dto;

import java.time.LocalDate;
import java.util.List;

public record ResumenAsistenciaResponse(
        Long clubId, String clubNombre, Long cursoId, String cursoNombre, LocalDate desde, LocalDate hasta,
        long sesionesEjecutadas, long registrosEsperados, long registrosTomados, long registrosPendientes,
        Double porcentajeCompletitud, ConteoAsistencia conteo, Double porcentajeAsistencia,
        List<EstudianteAsistenciaVista> estudiantes) {
}

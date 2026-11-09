package ec.edu.ups.tipi.avances.dto;

import ec.edu.ups.tipi.avances.AlcanceAvance;
import ec.edu.ups.tipi.avances.EstadoAvance;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AvanceResponse(
        Long id, Long clubId, String clubNombre, Long institucionId, String institucionNombre, AlcanceAvance alcance,
        EstudianteAvanceVista estudiante, Long proyectoId, String proyectoTitulo, Long actividadId,
        String actividadTema, LocalDate actividadFecha, LocalDate fecha, boolean contenidoReservado,
        String resultados, String logros, String dificultades, String proximosPasos, Integer porcentajeAvance,
        List<CompetenciaEvaluadaResponse> competencias, EstadoAvance estado, String registradoPorNombre,
        Instant fechaRegistro, Instant actualizadoEn, String motivoAnulacion, String anuladoPorNombre,
        Instant fechaAnulacion) {
}

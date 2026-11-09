package ec.edu.ups.tipi.avances.dto;

import java.util.List;

public record ResumenResultadosResponse(
        Integer periodoId, String periodoNombre, Long institucionId, long totalClubes, long participantesUnicos,
        ConteoProyectos proyectos, long proyectosDesarrollados, Double porcentajeFinalizacion,
        long estudiantesEnProyectosUnicos, Double porcentajeParticipantesEnProyectos, ConteoAvances avances,
        long estudiantesConAvanceUnicos, Double porcentajeEstudiantesConAvance,
        List<CompetenciaResultadoResponse> competencias, List<ClubResultadosResponse> clubes) {
}

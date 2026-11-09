package ec.edu.ups.tipi.avances.dto;

import ec.edu.ups.tipi.clubes.EstadoClub;

public record ClubResultadosResponse(
        Long clubId, String clubNombre, EstadoClub estadoClub, Long institucionId, String institucionNombre,
        long participantes, ConteoProyectos proyectos, Double porcentajeFinalizacion, long estudiantesEnProyectos,
        ConteoAvances avances, long estudiantesConAvance, Double porcentajeEstudiantesConAvance,
        long competenciasTrabajadas) {
}

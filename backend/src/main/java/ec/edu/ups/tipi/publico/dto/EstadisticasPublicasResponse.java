package ec.edu.ups.tipi.publico.dto;

import java.time.Instant;

public record EstadisticasPublicasResponse(
        String periodoActivo,
        long instituciones,
        long institucionesConClubes,
        long clubes,
        long clubesActivos,
        long docentesActivos,
        long estudiantesParticipantes,
        long sesionesEjecutadas,
        long horasEjecutadas,
        long evidenciasRegistradas,
        long proyectos,
        long certificadosEmitidos,
        Instant actualizadoEn) {
}

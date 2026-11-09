package ec.edu.ups.tipi.avances.dto;

public record CompetenciaResultadoResponse(
        Integer contenidoId, String nombre, long sesionesTrabajadas, long clubesQueLaTrabajaron,
        long estudiantesEvaluados, ConteoNiveles nivelesActuales, Double porcentajeLogrado) {
}

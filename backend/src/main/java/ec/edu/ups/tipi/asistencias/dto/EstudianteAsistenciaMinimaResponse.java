package ec.edu.ups.tipi.asistencias.dto;

public record EstudianteAsistenciaMinimaResponse(
        Long estudianteId, String estudianteCodigo, long sesionesEsperadas, long registradas, long sinRegistro,
        ConteoAsistencia conteo, Double porcentajeAsistencia) implements EstudianteAsistenciaVista {
}

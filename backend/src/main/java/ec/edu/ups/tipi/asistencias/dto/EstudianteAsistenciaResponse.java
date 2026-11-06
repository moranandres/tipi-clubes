package ec.edu.ups.tipi.asistencias.dto;

public record EstudianteAsistenciaResponse(
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        long sesionesEsperadas, long registradas, long sinRegistro, ConteoAsistencia conteo,
        Double porcentajeAsistencia) implements EstudianteAsistenciaVista {
}

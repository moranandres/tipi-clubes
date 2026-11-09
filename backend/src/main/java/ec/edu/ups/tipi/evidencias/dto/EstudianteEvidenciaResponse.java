package ec.edu.ups.tipi.evidencias.dto;

public record EstudianteEvidenciaResponse(
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        boolean autorizacionImagenVigente) implements EstudianteEvidenciaVista {
}

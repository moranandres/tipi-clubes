package ec.edu.ups.tipi.evidencias.dto;

public record EstudianteEvidenciaMinimaResponse(
        Long estudianteId, String estudianteCodigo, boolean autorizacionImagenVigente)
        implements EstudianteEvidenciaVista {
}

package ec.edu.ups.tipi.avances.dto;

public record EstudianteAvanceResponse(
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos)
        implements EstudianteAvanceVista {
}

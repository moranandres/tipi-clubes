package ec.edu.ups.tipi.certificados.dto;

public record ContextoCertificado(String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
                                  String institucionNombre, String clubNombre, String emitidoPorNombre,
                                  String anuladoPorNombre, String urlVerificacion) {
}

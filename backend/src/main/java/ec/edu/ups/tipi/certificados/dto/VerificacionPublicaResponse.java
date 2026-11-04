package ec.edu.ups.tipi.certificados.dto;

import ec.edu.ups.tipi.certificados.EstadoCertificado;
import ec.edu.ups.tipi.certificados.TipoCertificado;

import java.time.LocalDate;

public record VerificacionPublicaResponse(String codigoVerificacion, boolean valido, EstadoCertificado estado,
                                          TipoCertificado tipo, String titulo, String institucionNombre,
                                          LocalDate fechaEmision, LocalDate fechaAnulacion, String archivoHash,
                                          String mensaje) {
}

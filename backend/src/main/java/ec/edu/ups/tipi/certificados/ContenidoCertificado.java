package ec.edu.ups.tipi.certificados;

import java.time.LocalDate;

public record ContenidoCertificado(TipoCertificado tipo, String codigoVerificacion, String titulo,
                                   String estudianteNombre, String institucionNombre, String cuerpo,
                                   LocalDate fechaEmision, String emisorNombre, String emisorCargo,
                                   String urlVerificacion) {
}

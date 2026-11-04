package ec.edu.ups.tipi.certificados.dto;

import ec.edu.ups.tipi.certificados.Certificado;
import ec.edu.ups.tipi.certificados.EstadoCertificado;
import ec.edu.ups.tipi.certificados.TipoCertificado;

import java.time.Instant;
import java.time.LocalDate;

public record CertificadoResumenResponse(
        Long id, String codigoVerificacion, TipoCertificado tipo, String titulo, EstadoCertificado estado,
        Long estudianteId, String estudianteCodigo,
        Long institucionId, String institucionNombre, Long clubId, String clubNombre,
        LocalDate fechaEmision, Instant fechaAnulacion) implements CertificadoVista {

    public static CertificadoResumenResponse de(Certificado c, ContextoCertificado x) {
        return new CertificadoResumenResponse(c.getId(), c.getCodigoVerificacion(), c.getTipo(), c.getTitulo(),
                c.getEstado(), c.getEstudianteId(), x.estudianteCodigo(),
                c.getInstitucionId(), x.institucionNombre(), c.getClubId(), x.clubNombre(),
                c.getFechaEmision(), c.getFechaAnulacion());
    }
}

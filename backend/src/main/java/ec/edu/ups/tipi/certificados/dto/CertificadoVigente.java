package ec.edu.ups.tipi.certificados.dto;

import ec.edu.ups.tipi.certificados.Certificado;
import ec.edu.ups.tipi.certificados.TipoCertificado;

public record CertificadoVigente(Long id, TipoCertificado tipo, String codigoVerificacion) {

    public static CertificadoVigente de(Certificado c) {
        return new CertificadoVigente(c.getId(), c.getTipo(), c.getCodigoVerificacion());
    }
}

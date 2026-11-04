package ec.edu.ups.tipi.certificados.dto;

import ec.edu.ups.tipi.certificados.Certificado;
import ec.edu.ups.tipi.certificados.EstadoCertificado;
import ec.edu.ups.tipi.certificados.TipoCertificado;

import java.time.Instant;
import java.time.LocalDate;

public record CertificadoResponse(
        Long id, String codigoVerificacion, TipoCertificado tipo, String titulo, EstadoCertificado estado,
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        Long institucionId, String institucionNombre, Long clubId, String clubNombre,
        Long inscripcionCursoId, Long participacionId,
        LocalDate fechaEmision, Long emitidoPorId, String emitidoPorNombre,
        Long anuladoPorId, String anuladoPorNombre, Instant fechaAnulacion, String motivoAnulacion,
        String archivoHash, Long archivoTamano, String urlVerificacion, Instant createdAt) implements CertificadoVista {

    public static CertificadoResponse de(Certificado c, ContextoCertificado x) {
        return new CertificadoResponse(c.getId(), c.getCodigoVerificacion(), c.getTipo(), c.getTitulo(), c.getEstado(),
                c.getEstudianteId(), x.estudianteCodigo(), x.estudianteNombres(), x.estudianteApellidos(),
                c.getInstitucionId(), x.institucionNombre(), c.getClubId(), x.clubNombre(),
                c.getInscripcionCursoId(), c.getParticipacionId(),
                c.getFechaEmision(), c.getEmitidoPor(), x.emitidoPorNombre(),
                c.getAnuladoPor(), x.anuladoPorNombre(), c.getFechaAnulacion(), c.getMotivoAnulacion(),
                c.getArchivoHash(), c.getArchivoTamano(), x.urlVerificacion(), c.getCreatedAt());
    }
}

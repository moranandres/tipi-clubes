package ec.edu.ups.tipi.auditoria;

import java.time.Instant;

public record AuditoriaResponse(Long id, Instant fecha, Long usuarioId, String identificador,
                                String accion, String entidad, Long entidadId,
                                String detalle, String ip) {

    public static AuditoriaResponse de(Auditoria a) {
        return new AuditoriaResponse(a.getId(), a.getFecha(), a.getUsuarioId(), a.getIdentificador(),
                a.getAccion(), a.getEntidad(), a.getEntidadId(), a.getDetalle(), a.getIp());
    }
}
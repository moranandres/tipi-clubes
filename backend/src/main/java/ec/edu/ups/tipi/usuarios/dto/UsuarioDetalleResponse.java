package ec.edu.ups.tipi.usuarios.dto;

import ec.edu.ups.tipi.usuarios.Usuario;

import java.time.Instant;

public record UsuarioDetalleResponse(Long id, String username, String email, String nombres,
                                     String apellidos, String rol, Long institucionId, boolean activo,
                                     Instant bloqueadoHasta, Instant ultimoAcceso,
                                     boolean debeCambiarPassword) {

    public static UsuarioDetalleResponse de(Usuario u) {
        return new UsuarioDetalleResponse(u.getId(), u.getUsername(), u.getEmail(), u.getNombres(),
                u.getApellidos(), u.getRol().getCodigo(), u.getInstitucionId(), u.isActivo(),
                u.getBloqueadoHasta(), u.getUltimoAcceso(), u.isDebeCambiarPassword());
    }
}
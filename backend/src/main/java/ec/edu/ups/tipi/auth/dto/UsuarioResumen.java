package ec.edu.ups.tipi.auth.dto;

import ec.edu.ups.tipi.usuarios.Usuario;

public record UsuarioResumen(Long id, String username, String nombres, String apellidos,
                             String rol, Long institucionId) {

    public static UsuarioResumen de(Usuario u) {
        return new UsuarioResumen(u.getId(), u.getUsername(), u.getNombres(),
                u.getApellidos(), u.getRol().getCodigo(), u.getInstitucionId());
    }
}
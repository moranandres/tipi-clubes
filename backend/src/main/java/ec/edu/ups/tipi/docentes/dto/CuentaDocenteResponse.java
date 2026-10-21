package ec.edu.ups.tipi.docentes.dto;

import ec.edu.ups.tipi.usuarios.Usuario;

public record CuentaDocenteResponse(Long id, String username, String nombres, String apellidos) {

    public static CuentaDocenteResponse de(Usuario u) {
        return new CuentaDocenteResponse(u.getId(), u.getUsername(), u.getNombres(), u.getApellidos());
    }
}
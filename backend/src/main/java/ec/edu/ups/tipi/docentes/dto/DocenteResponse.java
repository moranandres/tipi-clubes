package ec.edu.ups.tipi.docentes.dto;

import ec.edu.ups.tipi.docentes.Docente;

public record DocenteResponse(Long id, Long institucionId, Long usuarioId, String nombres,
                              String apellidos, String correo, String telefono, boolean activo) {

    public static DocenteResponse de(Docente d) {
        return new DocenteResponse(d.getId(), d.getInstitucionId(), d.getUsuarioId(), d.getNombres(),
                d.getApellidos(), d.getCorreo(), d.getTelefono(), d.isActivo());
    }
}
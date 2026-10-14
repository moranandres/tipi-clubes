package ec.edu.ups.tipi.instituciones.dto;

import ec.edu.ups.tipi.instituciones.EstadoAdhesion;
import ec.edu.ups.tipi.instituciones.Institucion;

import java.time.LocalDate;

public record InstitucionResponse(
        Long id, String codigoAmie, String nombre, String zona, String circuito,
        String provincia, String canton, String direccion, String telefono,
        String correoContacto, String autoridadNombre, String autoridadCargo,
        EstadoAdhesion estadoAdhesion, LocalDate fechaAdhesion) {

    public static InstitucionResponse de(Institucion i) {
        return new InstitucionResponse(i.getId(), i.getCodigoAmie(), i.getNombre(), i.getZona(),
                i.getCircuito(), i.getProvincia(), i.getCanton(), i.getDireccion(), i.getTelefono(),
                i.getCorreoContacto(), i.getAutoridadNombre(), i.getAutoridadCargo(),
                i.getEstadoAdhesion(), i.getFechaAdhesion());
    }
}
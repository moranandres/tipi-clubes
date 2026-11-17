package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.Autorizacion;
import ec.edu.ups.tipi.estudiantes.Parentesco;

public record RepresentanteResponse(String nombres, String apellidos, String cedula,
                                    Parentesco parentesco, String telefono, String correo) {

    public static RepresentanteResponse de(Autorizacion a) {
        if (a.getRepresentanteCedula() == null) {
            return null;
        }
        return new RepresentanteResponse(a.getRepresentanteNombres(), a.getRepresentanteApellidos(),
                a.getRepresentanteCedula(), a.getRepresentanteParentesco(), a.getRepresentanteTelefono(),
                a.getRepresentanteCorreo());
    }
}

package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.Autorizacion;
import ec.edu.ups.tipi.estudiantes.EstadoAutorizacion;
import ec.edu.ups.tipi.estudiantes.EstadoEstudiante;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.TipoAutorizacion;

import java.time.Instant;
import java.time.LocalDate;

public record AutorizacionListadoResponse(
        Long id, TipoAutorizacion tipo, EstadoAutorizacion estado, LocalDate fechaRegistro,
        String observacion, boolean tieneDocumento, Instant revocadoEn, Instant actualizadoEn,
        Long estudianteId, String estudianteCodigo, String estudianteNombres, String estudianteApellidos,
        EstadoEstudiante estudianteEstado, String estudianteCursoEtiqueta,
        Long institucionId, String institucionNombre,
        RepresentanteResponse representante) {

    public static AutorizacionListadoResponse de(Autorizacion a, Estudiante e, String institucionNombre) {
        return new AutorizacionListadoResponse(a.getId(), a.getTipo(), a.getEstado(), a.getFechaRegistro(),
                a.getObservacion(), a.getDocumentoRuta() != null, a.getRevocadoEn(), a.getActualizadoEn(),
                e.getId(), e.getCodigoInterno(), e.getNombres(), e.getApellidos(),
                e.getEstado(), e.getCurso() == null ? null : e.getCurso().getEtiqueta(),
                e.getInstitucionId(), institucionNombre, RepresentanteResponse.de(a));
    }
}

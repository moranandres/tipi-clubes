package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.CursoEducativo;
import ec.edu.ups.tipi.estudiantes.EstadoAutorizacion;
import ec.edu.ups.tipi.estudiantes.EstadoEstudiante;
import ec.edu.ups.tipi.estudiantes.Estudiante;

import java.time.Instant;

public record EstudianteResponse(
        Long id, String codigoInterno, String nombres, String apellidos,
        Long institucionId, String institucionNombre,
        CursoEducativo curso, String cursoEtiqueta, String nivel,
        EstadoEstudiante estado,
        EstadoAutorizacion autorizacionParticipacion,
        EstadoAutorizacion autorizacionUsoImagen,
        Instant createdAt) implements EstudianteVista {

    public static EstudianteResponse de(Estudiante e, String institucionNombre,
                                        EstadoAutorizacion participacion, EstadoAutorizacion usoImagen) {
        return new EstudianteResponse(e.getId(), e.getCodigoInterno(), e.getNombres(), e.getApellidos(),
                e.getInstitucionId(), institucionNombre,
                e.getCurso(), e.getCurso().getEtiqueta(), e.getCurso().getNivel(),
                e.getEstado(), participacion, usoImagen, e.getCreatedAt());
    }
}
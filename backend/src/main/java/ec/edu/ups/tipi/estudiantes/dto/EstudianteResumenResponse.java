package ec.edu.ups.tipi.estudiantes.dto;

import ec.edu.ups.tipi.estudiantes.CursoEducativo;
import ec.edu.ups.tipi.estudiantes.EstadoEstudiante;
import ec.edu.ups.tipi.estudiantes.Estudiante;

public record EstudianteResumenResponse(
        Long id, String codigoInterno,
        Long institucionId, String institucionNombre,
        CursoEducativo curso, String cursoEtiqueta, String nivel,
        EstadoEstudiante estado) implements EstudianteVista {

    public static EstudianteResumenResponse de(Estudiante e, String institucionNombre) {
        return new EstudianteResumenResponse(e.getId(), e.getCodigoInterno(),
                e.getInstitucionId(), institucionNombre,
                e.getCurso(), e.getCurso().getEtiqueta(), e.getCurso().getNivel(),
                e.getEstado());
    }
}
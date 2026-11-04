package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.estudiantes.AutorizacionRepository;
import ec.edu.ups.tipi.estudiantes.EstadoAutorizacion;
import ec.edu.ups.tipi.estudiantes.TipoAutorizacion;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReglasInscripcion {

    private final InscripcionRepository inscripcionRepository;
    private final InscripcionCursoRepository inscripcionCursoRepository;
    private final AutorizacionRepository autorizacionRepository;

    public boolean esIntegranteActivo(Long estudianteId, Long clubId) {
        return inscripcionRepository.findByEstudianteIdAndClubId(estudianteId, clubId)
                .map(i -> i.getEstado() == EstadoInscripcion.ACTIVA)
                .orElse(false);
    }

    public boolean estaEnCurso(Long estudianteId, Long cursoId) {
        return inscripcionCursoRepository.findByEstudianteIdAndCursoId(estudianteId, cursoId)
                .map(ic -> ic.getEstado() == EstadoInscripcionCurso.ACTIVA)
                .orElse(false);
    }

    public boolean participacionOtorgada(Long estudianteId) {
        return autorizacionRepository.findByEstudianteIdAndTipo(estudianteId, TipoAutorizacion.PARTICIPACION)
                .map(a -> a.getEstado() == EstadoAutorizacion.OTORGADA)
                .orElse(false);
    }
}

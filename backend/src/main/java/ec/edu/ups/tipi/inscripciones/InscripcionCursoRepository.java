package ec.edu.ups.tipi.inscripciones;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InscripcionCursoRepository extends JpaRepository<InscripcionCurso, Long> {

    Optional<InscripcionCurso> findByEstudianteIdAndCursoId(Long estudianteId, Long cursoId);

    long countByCursoIdAndEstado(Long cursoId, EstadoInscripcionCurso estado);

    List<InscripcionCurso> findByClubIdInAndEstudianteIdIn(Collection<Long> clubIds, Collection<Long> estudianteIds);
}

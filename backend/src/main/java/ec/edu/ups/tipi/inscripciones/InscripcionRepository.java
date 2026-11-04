package ec.edu.ups.tipi.inscripciones;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface InscripcionRepository
        extends JpaRepository<Inscripcion, Long>, JpaSpecificationExecutor<Inscripcion> {

    Optional<Inscripcion> findByEstudianteIdAndClubId(Long estudianteId, Long clubId);

    long countByClubIdAndEstado(Long clubId, EstadoInscripcion estado);
}

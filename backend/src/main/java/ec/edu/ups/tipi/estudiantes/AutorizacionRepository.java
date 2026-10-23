package ec.edu.ups.tipi.estudiantes;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AutorizacionRepository extends JpaRepository<Autorizacion, Long> {

    Optional<Autorizacion> findByEstudianteIdAndTipo(Long estudianteId, TipoAutorizacion tipo);

    List<Autorizacion> findByEstudianteIdOrderByTipoAsc(Long estudianteId);

    List<Autorizacion> findByEstudianteIdIn(Collection<Long> estudianteIds);
}
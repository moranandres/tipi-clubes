package ec.edu.ups.tipi.asistencias;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CorreccionAsistenciaRepository extends JpaRepository<CorreccionAsistencia, Long> {

    List<CorreccionAsistencia> findByAsistenciaIdInOrderByFechaDescIdDesc(Collection<Long> asistenciaIds);
}

package ec.edu.ups.tipi.retiros;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface RetiroCursoRepository extends JpaRepository<RetiroCurso, Long> {

    List<RetiroCurso> findBySolicitudRetiroIdInOrderByIdAsc(Collection<Long> solicitudRetiroIds);
}

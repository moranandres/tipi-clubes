package ec.edu.ups.tipi.inscripciones;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SolicitudInscripcionRepository
        extends JpaRepository<SolicitudInscripcion, Long>, JpaSpecificationExecutor<SolicitudInscripcion> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SolicitudInscripcion s where s.id = :id")
    Optional<SolicitudInscripcion> bloquear(@Param("id") Long id);

    boolean existsByEstudianteIdAndClubIdAndEstadoIn(Long estudianteId, Long clubId,
                                                     Collection<EstadoSolicitud> estados);

    List<SolicitudInscripcion> findByEstudianteIdAndClubIdAndEstadoInOrderByIdAsc(Long estudianteId, Long clubId,
                                                                                 Collection<EstadoSolicitud> estados);

    @Query(value = "select fn_cruce_horario_estudiante(:estudianteId, :cursoId)", nativeQuery = true)
    String cruceHorario(@Param("estudianteId") Long estudianteId, @Param("cursoId") Long cursoId);
}

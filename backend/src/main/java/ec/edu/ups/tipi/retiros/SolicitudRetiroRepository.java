package ec.edu.ups.tipi.retiros;

import ec.edu.ups.tipi.inscripciones.Inscripcion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SolicitudRetiroRepository
        extends JpaRepository<SolicitudRetiro, Long>, JpaSpecificationExecutor<SolicitudRetiro> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SolicitudRetiro s where s.id = :id")
    Optional<SolicitudRetiro> bloquear(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inscripcion i where i.id = :id")
    Optional<Inscripcion> bloquearInscripcion(@Param("id") Long id);

    @Query(value = "select id from estudiantes where id = :id for update", nativeQuery = true)
    Long bloquearEstudiante(@Param("id") Long id);

    boolean existsByInscripcionIdAndEstado(Long inscripcionId, EstadoRetiro estado);
}

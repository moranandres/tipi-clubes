package ec.edu.ups.tipi.auditoria;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.Instant;

public interface AuditoriaRepository
        extends JpaRepository<Auditoria, Long>, JpaSpecificationExecutor<Auditoria> {

    long countByAccionAndIpAndFechaAfter(String accion, String ip, Instant fecha);
}
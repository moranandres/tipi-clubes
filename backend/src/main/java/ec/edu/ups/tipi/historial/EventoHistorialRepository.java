package ec.edu.ups.tipi.historial;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EventoHistorialRepository
        extends JpaRepository<EventoHistorial, String>, JpaSpecificationExecutor<EventoHistorial> {
}

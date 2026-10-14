package ec.edu.ups.tipi.instituciones;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InstitucionRepository
        extends JpaRepository<Institucion, Long>, JpaSpecificationExecutor<Institucion> {

    boolean existsByCodigoAmie(String codigoAmie);

    boolean existsByCodigoAmieAndIdNot(String codigoAmie, Long id);
}
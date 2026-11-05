package ec.edu.ups.tipi.catalogo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CatalogoInstitucionRepository
        extends JpaRepository<CatalogoInstitucion, String>, JpaSpecificationExecutor<CatalogoInstitucion> {
}

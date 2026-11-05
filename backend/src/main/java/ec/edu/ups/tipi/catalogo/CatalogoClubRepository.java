package ec.edu.ups.tipi.catalogo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CatalogoClubRepository
        extends JpaRepository<CatalogoClub, Long>, JpaSpecificationExecutor<CatalogoClub> {
}

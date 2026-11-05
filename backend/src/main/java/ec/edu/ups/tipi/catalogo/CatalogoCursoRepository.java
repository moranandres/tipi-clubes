package ec.edu.ups.tipi.catalogo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CatalogoCursoRepository extends JpaRepository<CatalogoCurso, Long> {

    List<CatalogoCurso> findByClubIdOrderByFechaInicioAscNombreAsc(Long clubId);
}

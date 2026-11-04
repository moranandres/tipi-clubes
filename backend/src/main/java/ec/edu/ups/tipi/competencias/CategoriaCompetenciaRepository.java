package ec.edu.ups.tipi.competencias;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CategoriaCompetenciaRepository extends JpaRepository<CategoriaCompetencia, Integer> {

    List<CategoriaCompetencia> findByCompetenciaIdOrderByNivelAscNombreAsc(Integer competenciaId);

    boolean existsByCompetenciaIdAndNivelAndNombreIgnoreCase(Integer competenciaId, NivelCategoria nivel, String nombre);

    boolean existsByCompetenciaIdAndNivelAndNombreIgnoreCaseAndIdNot(Integer competenciaId, NivelCategoria nivel,
                                                                    String nombre, Integer id);

    @Query("select c.competenciaId, c.nivel, count(c) from CategoriaCompetencia c group by c.competenciaId, c.nivel")
    List<Object[]> contarPorCompetenciaYNivel();
}

package ec.edu.ups.tipi.competencias;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EdicionCompetenciaRepository extends JpaRepository<EdicionCompetencia, Integer> {

    List<EdicionCompetencia> findByCompetenciaIdOrderByAnioDescNombreAsc(Integer competenciaId);

    boolean existsByCompetenciaIdAndNombreIgnoreCase(Integer competenciaId, String nombre);

    boolean existsByCompetenciaIdAndNombreIgnoreCaseAndIdNot(Integer competenciaId, String nombre, Integer id);

    @Query("select e.competenciaId, count(e) from EdicionCompetencia e group by e.competenciaId")
    List<Object[]> contarPorCompetencia();
}

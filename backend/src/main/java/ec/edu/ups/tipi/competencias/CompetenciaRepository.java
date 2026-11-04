package ec.edu.ups.tipi.competencias;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompetenciaRepository extends JpaRepository<Competencia, Integer> {

    List<Competencia> findAllByOrderByNombreAsc();

    List<Competencia> findByActivaOrderByNombreAsc(boolean activa);

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Integer id);
}

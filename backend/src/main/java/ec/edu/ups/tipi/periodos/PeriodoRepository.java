package ec.edu.ups.tipi.periodos;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PeriodoRepository extends JpaRepository<PeriodoAcademico, Integer> {

    Optional<PeriodoAcademico> findByActivoTrue();

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Integer id);
}
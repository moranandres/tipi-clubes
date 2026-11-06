package ec.edu.ups.tipi.actividades;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;

public interface ActividadRepository extends JpaRepository<Actividad, Long>, JpaSpecificationExecutor<Actividad> {

    List<Actividad> findByClubIdAndEstadoAndFechaLessThanEqualOrderByFechaAscHoraInicioAsc(
            Long clubId, EstadoActividad estado, LocalDate fecha);

    List<Actividad> findByClubIdAndEstadoAndFechaGreaterThanOrderByFechaAscHoraInicioAsc(
            Long clubId, EstadoActividad estado, LocalDate fecha);

    List<Actividad> findByCursoIdAndEstadoAndFechaLessThanEqualOrderByFechaAscHoraInicioAsc(
            Long cursoId, EstadoActividad estado, LocalDate fecha);

    List<Actividad> findByCursoIdAndEstadoAndFechaGreaterThanOrderByFechaAscHoraInicioAsc(
            Long cursoId, EstadoActividad estado, LocalDate fecha);
}

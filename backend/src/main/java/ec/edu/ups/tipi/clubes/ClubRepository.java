package ec.edu.ups.tipi.clubes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ClubRepository extends JpaRepository<Club, Long>, JpaSpecificationExecutor<Club> {

    boolean existsByInstitucionIdAndPeriodoIdAndNombreIgnoreCase(Long institucionId, Integer periodoId,
                                                                 String nombre);

    boolean existsByInstitucionIdAndPeriodoIdAndNombreIgnoreCaseAndIdNot(Long institucionId,
                                                                         Integer periodoId,
                                                                         String nombre, Long id);

    boolean existsByDocenteIdAndEstadoIn(Long docenteId, Collection<EstadoClub> estados);

    @Query(value = """
            select club_id, count(*)
            from inscripciones
            where estado = 'ACTIVA' and club_id in (:ids)
            group by club_id
            """, nativeQuery = true)
    List<Object[]> contarIntegrantesActivos(@Param("ids") Collection<Long> ids);
}
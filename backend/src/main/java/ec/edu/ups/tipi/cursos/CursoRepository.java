package ec.edu.ups.tipi.cursos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CursoRepository extends JpaRepository<Curso, Long>, JpaSpecificationExecutor<Curso> {

    boolean existsByClubIdAndNombreIgnoreCase(Long clubId, String nombre);

    boolean existsByClubIdAndNombreIgnoreCaseAndIdNot(Long clubId, String nombre, Long id);

    @Query(value = """
            select curso_id, count(*)
            from inscripciones_curso
            where estado = 'ACTIVA' and curso_id in (:ids)
            group by curso_id
            """, nativeQuery = true)
    List<Object[]> contarInscritosActivos(@Param("ids") Collection<Long> ids);

    @Query(value = """
            select (select count(*) from inscripciones_curso where curso_id = :id)
                 + (select count(*) from solicitudes_inscripcion where curso_id = :id)
            """, nativeQuery = true)
    long contarRegistrosVinculados(@Param("id") Long id);

    @Modifying
    @Query(value = """
            update inscripciones_curso
            set estado = :estado, fecha_fin = greatest(current_date, fecha_ingreso)
            where curso_id = :id and estado = 'ACTIVA'
            """, nativeQuery = true)
    int cerrarInscripcionesActivas(@Param("id") Long id, @Param("estado") String estado);
}
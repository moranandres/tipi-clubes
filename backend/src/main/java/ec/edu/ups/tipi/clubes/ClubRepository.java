package ec.edu.ups.tipi.clubes;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ClubRepository extends JpaRepository<Club, Long>, JpaSpecificationExecutor<Club> {

    boolean existsByInstitucionIdAndPeriodoIdAndNombreIgnoreCase(Long institucionId, Integer periodoId,
                                                                 String nombre);

    boolean existsByInstitucionIdAndPeriodoIdAndNombreIgnoreCaseAndIdNot(Long institucionId,
                                                                         Integer periodoId,
                                                                         String nombre, Long id);

    boolean existsByDocenteIdAndEstadoIn(Long docenteId, Collection<EstadoClub> estados);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Club c where c.id = :id")
    Optional<Club> bloquear(@Param("id") Long id);

    @Query(value = """
            select club_id, count(*)
            from inscripciones
            where estado = 'ACTIVA' and club_id in (:ids)
            group by club_id
            """, nativeQuery = true)
    List<Object[]> contarIntegrantesActivos(@Param("ids") Collection<Long> ids);

    @Query(value = """
            select id, nombre, estado
            from cursos
            where club_id = :id and estado in ('PLANIFICADO', 'EN_CURSO')
            order by nombre
            """, nativeQuery = true)
    List<Object[]> cursosAbiertos(@Param("id") Long clubId);

    @Query(value = """
            select s.id, s.estado, e.codigo_interno
            from solicitudes_inscripcion s
            join estudiantes e on e.id = s.estudiante_id
            where s.club_id = :id and s.estado in ('PENDIENTE', 'EN_REVISION')
            order by s.id
            """, nativeQuery = true)
    List<Object[]> solicitudesInscripcionAbiertas(@Param("id") Long clubId);

    @Query(value = """
            select r.id, e.codigo_interno
            from solicitudes_retiro r
            join inscripciones i on i.id = r.inscripcion_id
            join estudiantes e on e.id = i.estudiante_id
            where i.club_id = :id and r.estado = 'PENDIENTE'
            order by r.id
            """, nativeQuery = true)
    List<Object[]> solicitudesRetiroPendientes(@Param("id") Long clubId);

    @Modifying
    @Query(value = """
            update solicitudes_inscripcion
            set estado = 'CANCELADA', resuelto_por = :usuarioId, fecha_resolucion = now(),
                observacion_resolucion = :observacion
            where club_id = :id and estado in ('PENDIENTE', 'EN_REVISION')
            """, nativeQuery = true)
    int cancelarSolicitudesInscripcion(@Param("id") Long clubId, @Param("usuarioId") Long usuarioId,
                                       @Param("observacion") String observacion);

    @Modifying
    @Query(value = """
            update solicitudes_retiro r
            set estado = 'CANCELADA', resuelto_por = :usuarioId, fecha_resolucion = now(),
                observacion_resolucion = :observacion
            from inscripciones i
            where i.id = r.inscripcion_id and i.club_id = :id and r.estado = 'PENDIENTE'
            """, nativeQuery = true)
    int cancelarSolicitudesRetiro(@Param("id") Long clubId, @Param("usuarioId") Long usuarioId,
                                  @Param("observacion") String observacion);
}

package ec.edu.ups.tipi.asistencias;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AsistenciaRepository extends JpaRepository<Asistencia, Long>, JpaSpecificationExecutor<Asistencia> {

    List<Asistencia> findByActividadId(Long actividadId);

    @Query(value = "select id from actividades where id = :id for no key update", nativeQuery = true)
    Optional<Long> bloquearActividad(@Param("id") Long actividadId);

    @Query(value = """
            select i.id, i.estudiante_id
            from inscripciones i
            where i.club_id = :clubId
              and i.fecha_ingreso <= :fecha
              and (i.fecha_retiro is null or i.fecha_retiro >= :fecha)
            """, nativeQuery = true)
    List<Object[]> elegiblesDelClub(@Param("clubId") Long clubId, @Param("fecha") LocalDate fecha);

    @Query(value = """
            select i.id, i.estudiante_id
            from inscripciones i
            join inscripciones_curso ic on ic.estudiante_id = i.estudiante_id and ic.club_id = i.club_id
            where i.club_id = :clubId
              and ic.curso_id = :cursoId
              and i.fecha_ingreso <= :fecha
              and (i.fecha_retiro is null or i.fecha_retiro >= :fecha)
              and ic.fecha_ingreso <= :fecha
              and (ic.fecha_fin is null or ic.fecha_fin >= :fecha)
            """, nativeQuery = true)
    List<Object[]> elegiblesDelCurso(@Param("clubId") Long clubId, @Param("cursoId") Long cursoId,
                                     @Param("fecha") LocalDate fecha);

    @Query(value = """
            select count(*)
            from actividades a
            where a.club_id = :clubId
              and a.estado = 'EJECUTADA'
              and a.fecha between :desde and :hasta
              and (:cursoId = 0 or a.curso_id = :cursoId)
            """, nativeQuery = true)
    long contarSesionesEjecutadas(@Param("clubId") Long clubId, @Param("cursoId") long cursoId,
                                  @Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    @Query(value = """
            with sesiones as (
                select a.id, a.fecha, a.curso_id
                from actividades a
                where a.club_id = :clubId
                  and a.estado = 'EJECUTADA'
                  and a.fecha between :desde and :hasta
                  and (:cursoId = 0 or a.curso_id = :cursoId)
            ),
            esperados as (
                select se.id as actividad_id, i.estudiante_id
                from sesiones se
                join inscripciones i on i.club_id = :clubId
                    and i.fecha_ingreso <= se.fecha
                    and (i.fecha_retiro is null or i.fecha_retiro >= se.fecha)
                where se.curso_id is null
                   or exists (
                       select 1 from inscripciones_curso ic
                       where ic.curso_id = se.curso_id
                         and ic.estudiante_id = i.estudiante_id
                         and ic.fecha_ingreso <= se.fecha
                         and (ic.fecha_fin is null or ic.fecha_fin >= se.fecha))
                union
                select s.actividad_id, s.estudiante_id
                from asistencias s
                join sesiones se on se.id = s.actividad_id
            )
            select e.estudiante_id,
                   count(*),
                   count(s.id),
                   count(*) filter (where s.estado = 'PRESENTE'),
                   count(*) filter (where s.estado = 'ATRASADO'),
                   count(*) filter (where s.estado = 'AUSENTE'),
                   count(*) filter (where s.estado = 'JUSTIFICADO')
            from esperados e
            left join asistencias s on s.actividad_id = e.actividad_id and s.estudiante_id = e.estudiante_id
            group by e.estudiante_id
            """, nativeQuery = true)
    List<Object[]> resumenPorEstudiante(@Param("clubId") Long clubId, @Param("cursoId") long cursoId,
                                        @Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);
}

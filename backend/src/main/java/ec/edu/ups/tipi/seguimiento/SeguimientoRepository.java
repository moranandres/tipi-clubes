package ec.edu.ups.tipi.seguimiento;

import ec.edu.ups.tipi.actividades.Actividad;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SeguimientoRepository extends Repository<Actividad, Long> {

    @Query(value = """
            select c.id,
                   c.nombre,
                   c.estado,
                   c.institucion_id,
                   i.nombre,
                   d.apellidos || ' ' || d.nombres
            from clubes c
            join instituciones i on i.id = c.institucion_id
            join docentes d on d.id = c.docente_id
            where c.periodo_id = :periodoId
              and (:institucionId = 0 or c.institucion_id = :institucionId)
              and (:docenteId = 0 or c.docente_id = :docenteId)
              and (c.estado <> 'PLANIFICADO'
                   or exists (select 1 from actividades a
                              where a.club_id = c.id and a.fecha between :desde and :hasta))
            order by i.nombre, c.nombre
            """, nativeQuery = true)
    List<Object[]> clubesDelAlcance(@Param("periodoId") Integer periodoId,
                                    @Param("institucionId") long institucionId,
                                    @Param("docenteId") long docenteId,
                                    @Param("desde") LocalDate desde,
                                    @Param("hasta") LocalDate hasta);

    @Query(value = """
            select a.id,
                   a.club_id,
                   a.fecha,
                   a.hora_inicio,
                   a.hora_fin,
                   a.tema,
                   a.estado,
                   a.curso_id,
                   cu.nombre,
                   d.apellidos || ' ' || d.nombres,
                   (a.fecha_registro_ejecucion at time zone 'America/Guayaquil')::date,
                   a.motivo_cancelacion,
                   coalesce(r.total, 0),
                   r.fecha_anterior,
                   r.hora_inicio_anterior,
                   r.hora_fin_anterior
            from actividades a
            join clubes c on c.id = a.club_id
            join docentes d on d.id = a.responsable_id
            left join cursos cu on cu.id = a.curso_id
            left join lateral (
                select count(*) over () as total, x.fecha_anterior, x.hora_inicio_anterior, x.hora_fin_anterior
                from actividad_reprogramaciones x
                where x.actividad_id = a.id
                order by x.id
                limit 1
            ) r on true
            where c.periodo_id = :periodoId
              and (:institucionId = 0 or c.institucion_id = :institucionId)
              and (:docenteId = 0 or c.docente_id = :docenteId)
              and (:clubId = 0 or c.id = :clubId)
              and a.fecha between :desde and :hasta
            order by a.fecha, a.hora_inicio, a.id
            """, nativeQuery = true)
    List<Object[]> actividadesDelAlcance(@Param("periodoId") Integer periodoId,
                                         @Param("institucionId") long institucionId,
                                         @Param("docenteId") long docenteId,
                                         @Param("clubId") long clubId,
                                         @Param("desde") LocalDate desde,
                                         @Param("hasta") LocalDate hasta);
}

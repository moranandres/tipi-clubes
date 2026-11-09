package ec.edu.ups.tipi.avances;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface AvanceRepository extends JpaRepository<Avance, Long>, JpaSpecificationExecutor<Avance> {

    @Query("""
            select a from Avance a
            where a.estado = ec.edu.ups.tipi.avances.EstadoAvance.ACTIVO
              and a.alcance = :alcance
              and a.clubId = :clubId
              and a.fecha = :fecha
              and (:estudianteId is null or a.estudianteId = :estudianteId)
              and (:proyectoId is null or a.proyectoId = :proyectoId)
              and (:excluirId is null or a.id <> :excluirId)
            """)
    List<Avance> duplicados(@Param("alcance") AlcanceAvance alcance, @Param("clubId") Long clubId,
                            @Param("fecha") LocalDate fecha, @Param("estudianteId") Long estudianteId,
                            @Param("proyectoId") Long proyectoId, @Param("excluirId") Long excluirId);

    @Query(value = """
            select exists (
                select 1 from inscripciones i
                where i.estudiante_id = :estudianteId
                  and i.club_id = :clubId
                  and i.fecha_ingreso <= :fecha
                  and (i.fecha_retiro is null or i.fecha_retiro >= :fecha))
            """, nativeQuery = true)
    boolean integranteEnFecha(@Param("clubId") Long clubId, @Param("estudianteId") Long estudianteId,
                              @Param("fecha") LocalDate fecha);

    @Query(value = """
            select exists (
                select 1 from inscripciones i
                join clubes c on c.id = i.club_id
                where i.estudiante_id = :estudianteId and c.docente_id = :docenteId)
            or exists (
                select 1 from proyecto_integrantes pi
                join proyectos p on p.id = pi.proyecto_id
                where pi.estudiante_id = :estudianteId and p.docente_id = :docenteId)
            """, nativeQuery = true)
    boolean estudianteRelacionadoConDocente(@Param("estudianteId") Long estudianteId,
                                            @Param("docenteId") Long docenteId);

    @Query(value = """
            select c.id,
                   c.nombre,
                   c.estado,
                   c.institucion_id,
                   i.nombre,
                   (select count(distinct ins.estudiante_id) from inscripciones ins where ins.club_id = c.id),
                   (select count(*) from proyectos p where p.club_id = c.id and p.estado = 'EN_DESARROLLO'),
                   (select count(*) from proyectos p where p.club_id = c.id and p.estado = 'FINALIZADO'),
                   (select count(*) from proyectos p
                    where p.club_id = c.id and p.estado = 'FINALIZADO' and p.tipo = 'PROTOTIPO'),
                   (select count(*) from proyectos p where p.club_id = c.id and p.estado = 'CANCELADO'),
                   (select count(distinct pi.estudiante_id)
                    from proyecto_integrantes pi
                    join proyectos p on p.id = pi.proyecto_id
                    where p.club_id = c.id and p.estado <> 'CANCELADO'),
                   (select count(*) from avances a
                    where a.club_id = c.id and a.estado = 'ACTIVO' and a.alcance = 'CLUB'),
                   (select count(*) from avances a
                    where a.club_id = c.id and a.estado = 'ACTIVO' and a.alcance = 'ESTUDIANTE'),
                   (select count(*) from avances a
                    where a.club_id = c.id and a.estado = 'ACTIVO' and a.alcance = 'PROYECTO'),
                   (select count(distinct a.estudiante_id) from avances a
                    where a.club_id = c.id and a.estado = 'ACTIVO' and a.alcance = 'ESTUDIANTE'),
                   (select count(distinct ac.contenido_id)
                    from actividades act
                    join actividad_contenidos ac on ac.actividad_id = act.id
                    join catalogo_contenidos cc on cc.id = ac.contenido_id
                    where act.club_id = c.id and act.estado = 'EJECUTADA' and cc.tipo = 'COMPETENCIA')
            from clubes c
            join instituciones i on i.id = c.institucion_id
            where c.periodo_id = :periodoId
              and c.estado <> 'PLANIFICADO'
              and (:institucionId = 0 or c.institucion_id = :institucionId)
              and (:docenteId = 0 or c.docente_id = :docenteId)
            order by i.nombre, c.nombre
            """, nativeQuery = true)
    List<Object[]> resultadosPorClub(@Param("periodoId") Integer periodoId, @Param("institucionId") long institucionId,
                                     @Param("docenteId") long docenteId);

    @Query(value = """
            with alcance_clubes as (
                select c.id
                from clubes c
                where c.periodo_id = :periodoId
                  and c.estado <> 'PLANIFICADO'
                  and (:institucionId = 0 or c.institucion_id = :institucionId)
                  and (:docenteId = 0 or c.docente_id = :docenteId)
            )
            select (select count(distinct ins.estudiante_id)
                    from inscripciones ins
                    where ins.club_id in (select id from alcance_clubes)),
                   (select count(distinct pi.estudiante_id)
                    from proyecto_integrantes pi
                    join proyectos p on p.id = pi.proyecto_id
                    where p.estado <> 'CANCELADO' and p.club_id in (select id from alcance_clubes)),
                   (select count(distinct a.estudiante_id)
                    from avances a
                    where a.estado = 'ACTIVO' and a.alcance = 'ESTUDIANTE'
                      and a.club_id in (select id from alcance_clubes))
            """, nativeQuery = true)
    List<Object[]> estudiantesUnicos(@Param("periodoId") Integer periodoId, @Param("institucionId") long institucionId,
                                     @Param("docenteId") long docenteId);

    @Query(value = """
            with alcance_clubes as (
                select c.id
                from clubes c
                where c.periodo_id = :periodoId
                  and c.estado <> 'PLANIFICADO'
                  and (:institucionId = 0 or c.institucion_id = :institucionId)
                  and (:docenteId = 0 or c.docente_id = :docenteId)
            ),
            trabajadas as (
                select ac.contenido_id, count(distinct act.id) as sesiones, count(distinct act.club_id) as clubes
                from actividades act
                join actividad_contenidos ac on ac.actividad_id = act.id
                where act.estado = 'EJECUTADA' and act.club_id in (select id from alcance_clubes)
                group by ac.contenido_id
            ),
            ultimas as (
                select distinct on (a.estudiante_id, ev.contenido_id) a.estudiante_id, ev.contenido_id, ev.nivel
                from avances a
                join avance_competencias ev on ev.avance_id = a.id
                where a.estado = 'ACTIVO' and a.club_id in (select id from alcance_clubes)
                order by a.estudiante_id, ev.contenido_id, a.fecha desc, a.id desc
            ),
            evaluadas as (
                select contenido_id,
                       count(*) as evaluados,
                       count(*) filter (where nivel = 'INICIAL') as inicial,
                       count(*) filter (where nivel = 'EN_PROCESO') as en_proceso,
                       count(*) filter (where nivel = 'LOGRADO') as logrado,
                       count(*) filter (where nivel = 'DESTACADO') as destacado
                from ultimas
                group by contenido_id
            )
            select cc.id,
                   cc.nombre,
                   coalesce(t.sesiones, 0),
                   coalesce(t.clubes, 0),
                   coalesce(e.evaluados, 0),
                   coalesce(e.inicial, 0),
                   coalesce(e.en_proceso, 0),
                   coalesce(e.logrado, 0),
                   coalesce(e.destacado, 0)
            from catalogo_contenidos cc
            left join trabajadas t on t.contenido_id = cc.id
            left join evaluadas e on e.contenido_id = cc.id
            where cc.tipo = 'COMPETENCIA'
              and (t.contenido_id is not null or e.contenido_id is not null)
            order by cc.nombre
            """, nativeQuery = true)
    List<Object[]> resultadosPorCompetencia(@Param("periodoId") Integer periodoId,
                                            @Param("institucionId") long institucionId,
                                            @Param("docenteId") long docenteId);
}

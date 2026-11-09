package ec.edu.ups.tipi.evidencias;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EvidenciaRepository extends JpaRepository<Evidencia, Long>, JpaSpecificationExecutor<Evidencia> {

    List<Evidencia> findByActividadIdOrderByEstadoAscFechaEvidenciaDescIdDesc(Long actividadId);

    long countByActividadIdAndEstado(Long actividadId, EstadoEvidencia estado);

    Optional<Evidencia> findFirstByActividadIdAndEstadoAndArchivoHash(Long actividadId, EstadoEvidencia estado,
                                                                      String archivoHash);

    Optional<Evidencia> findFirstByActividadIdAndEstadoAndUrl(Long actividadId, EstadoEvidencia estado, String url);

    @Query(value = "select id from actividades where id = :id for no key update", nativeQuery = true)
    Optional<Long> bloquearActividad(@Param("id") Long actividadId);

    @Query(value = """
            select i.estudiante_id
            from inscripciones i
            where i.club_id = :clubId
              and i.estudiante_id in (:ids)
              and i.fecha_ingreso <= :fecha
              and (i.fecha_retiro is null or i.fecha_retiro >= :fecha)
            """, nativeQuery = true)
    List<Long> integrantesEnFecha(@Param("clubId") Long clubId, @Param("ids") Collection<Long> estudianteIds,
                                  @Param("fecha") LocalDate fecha);

    @Query(value = """
            select a.estudiante_id
            from autorizaciones_estudiante a
            where a.estudiante_id in (:ids)
              and a.tipo = 'USO_IMAGEN'
              and a.estado = 'OTORGADA'
            """, nativeQuery = true)
    List<Long> conAutorizacionDeImagen(@Param("ids") Collection<Long> estudianteIds);

    @Query(value = """
            select c.id,
                   c.nombre,
                   c.estado,
                   c.institucion_id,
                   i.nombre,
                   (select count(*) from actividades a where a.club_id = c.id and a.estado = 'EJECUTADA'),
                   count(distinct e.actividad_id),
                   count(e.id) filter (where e.tipo = 'FOTOGRAFIA'),
                   count(e.id) filter (where e.tipo = 'DOCUMENTO'),
                   count(e.id) filter (where e.tipo = 'ENLACE'),
                   count(e.id) filter (where e.tipo = 'PRODUCTO')
            from clubes c
            join instituciones i on i.id = c.institucion_id
            left join evidencias e on e.club_id = c.id and e.estado = 'ACTIVA'
            where c.periodo_id = :periodoId
              and c.estado <> 'PLANIFICADO'
              and (:institucionId = 0 or c.institucion_id = :institucionId)
              and (:docenteId = 0 or c.docente_id = :docenteId)
            group by c.id, c.nombre, c.estado, c.institucion_id, i.nombre
            order by i.nombre, c.nombre
            """, nativeQuery = true)
    List<Object[]> resumenPorClub(@Param("periodoId") Integer periodoId, @Param("institucionId") long institucionId,
                                  @Param("docenteId") long docenteId);
}

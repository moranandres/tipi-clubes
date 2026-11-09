package ec.edu.ups.tipi.proyectos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProyectoRepository extends JpaRepository<Proyecto, Long>, JpaSpecificationExecutor<Proyecto> {

    List<Proyecto> findByClubIdAndEstadoOrderByTituloAsc(Long clubId, EstadoProyecto estado);

    @Query("""
            select p from Proyecto p
            where p.clubId = :clubId
              and p.estado <> ec.edu.ups.tipi.proyectos.EstadoProyecto.CANCELADO
              and lower(trim(p.titulo)) = lower(trim(:titulo))
              and (:excluirId is null or p.id <> :excluirId)
            """)
    List<Proyecto> conMismoTitulo(@Param("clubId") Long clubId, @Param("titulo") String titulo,
                                  @Param("excluirId") Long excluirId);

    @Query(value = "select id from proyectos where id = :id for no key update", nativeQuery = true)
    Optional<Long> bloquear(@Param("id") Long proyectoId);

    @Query(value = """
            select i.estudiante_id
            from inscripciones i
            where i.club_id = :clubId
              and i.estudiante_id in (:ids)
              and i.estado = 'ACTIVA'
            """, nativeQuery = true)
    List<Long> integrantesActivos(@Param("clubId") Long clubId, @Param("ids") Collection<Long> estudianteIds);

    @Query(value = """
            select a.proyecto_id,
                   count(*),
                   max(a.fecha),
                   (select a2.porcentaje_avance
                    from avances a2
                    where a2.proyecto_id = a.proyecto_id and a2.estado = 'ACTIVO'
                    order by a2.fecha desc, a2.id desc
                    limit 1)
            from avances a
            where a.proyecto_id in (:ids)
              and a.estado = 'ACTIVO'
            group by a.proyecto_id
            """, nativeQuery = true)
    List<Object[]> seguimiento(@Param("ids") Collection<Long> proyectoIds);
}

package ec.edu.ups.tipi.competencias;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ParticipacionCompetenciaRepository
        extends JpaRepository<ParticipacionCompetencia, Long>, JpaSpecificationExecutor<ParticipacionCompetencia> {

    boolean existsByEstudianteIdAndEdicionIdAndCategoriaId(Long estudianteId, Integer edicionId, Integer categoriaId);

    boolean existsByCategoriaId(Integer categoriaId);

    @Query("""
            select count(p) > 0 from ParticipacionCompetencia p
            where p.edicionId = :edicionId and p.categoriaId = :categoriaId
              and lower(p.equipoNombre) = lower(:equipo) and p.clubId <> :clubId
            """)
    boolean equipoEnOtroClub(@Param("edicionId") Integer edicionId, @Param("categoriaId") Integer categoriaId,
                             @Param("equipo") String equipo, @Param("clubId") Long clubId);

    @Query("""
            select p.equipoNombre from ParticipacionCompetencia p
            where p.edicionId = :edicionId and p.categoriaId = :categoriaId and p.clubId = :clubId
              and lower(p.equipoNombre) = lower(:equipo) and p.id <> :excluirId
            order by p.id
            """)
    List<String> nombresEquipoEnClub(@Param("edicionId") Integer edicionId, @Param("categoriaId") Integer categoriaId,
                                     @Param("clubId") Long clubId, @Param("equipo") String equipo,
                                     @Param("excluirId") Long excluirId);

    @Query("""
            select count(p) from ParticipacionCompetencia p
            where p.edicionId = :edicionId and p.categoriaId = :categoriaId
              and lower(p.equipoNombre) = lower(:equipo)
            """)
    long contarIntegrantesEquipo(@Param("edicionId") Integer edicionId, @Param("categoriaId") Integer categoriaId,
                                 @Param("equipo") String equipo);

    @Query("select p.edicionId, count(p) from ParticipacionCompetencia p where p.edicionId in :ids group by p.edicionId")
    List<Object[]> contarPorEdicion(@Param("ids") Collection<Integer> ids);

    @Query("select p.categoriaId, count(p) from ParticipacionCompetencia p where p.categoriaId in :ids group by p.categoriaId")
    List<Object[]> contarPorCategoria(@Param("ids") Collection<Integer> ids);

    @Query(value = "select count(*) from certificados where participacion_id = :id", nativeQuery = true)
    long contarCertificados(@Param("id") Long id);
}

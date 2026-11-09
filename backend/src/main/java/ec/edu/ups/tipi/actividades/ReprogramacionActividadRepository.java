package ec.edu.ups.tipi.actividades;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ReprogramacionActividadRepository extends JpaRepository<ReprogramacionActividad, Long> {

    List<ReprogramacionActividad> findByActividadIdOrderByIdAsc(Long actividadId);

    List<ReprogramacionActividad> findByActividadIdInOrderByIdAsc(Collection<Long> actividadIds);

    boolean existsByActividadId(Long actividadId);

    @Query(value = """
            select set_config('tipi.motivo_reprogramacion', :motivo, true)
                   || '|' || set_config('tipi.usuario_id', :usuarioId, true)
            """, nativeQuery = true)
    String prepararContexto(@Param("motivo") String motivo, @Param("usuarioId") String usuarioId);
}

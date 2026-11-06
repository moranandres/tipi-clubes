package ec.edu.ups.tipi.actividades;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ContenidoCatalogoRepository
        extends JpaRepository<ContenidoCatalogo, Integer>, JpaSpecificationExecutor<ContenidoCatalogo> {

    boolean existsByTipoAndNombreIgnoreCase(TipoContenido tipo, String nombre);

    boolean existsByTipoAndNombreIgnoreCaseAndIdNot(TipoContenido tipo, String nombre, Integer id);

    @Query(value = """
            select contenido_id, count(*)
            from actividad_contenidos
            where contenido_id in (:ids)
            group by contenido_id
            """, nativeQuery = true)
    List<Object[]> contarActividades(@Param("ids") Collection<Integer> ids);
}

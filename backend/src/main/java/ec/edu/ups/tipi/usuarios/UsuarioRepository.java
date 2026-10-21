package ec.edu.ups.tipi.usuarios;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository
        extends JpaRepository<Usuario, Long>, JpaSpecificationExecutor<Usuario> {

    @Query("""
           select u from Usuario u join fetch u.rol
           where lower(u.username) = lower(:identificador)
              or lower(u.email) = lower(:identificador)
           """)
    Optional<Usuario> buscarPorIdentificador(@Param("identificador") String identificador);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    long countByRolCodigoAndActivoTrue(String codigo);

    @Query("""
           select u from Usuario u
           where u.rol.codigo = 'DOCENTE'
             and u.institucionId = :institucionId
             and u.activo = true
             and (not exists (select d.id from Docente d where d.usuarioId = u.id)
                  or exists (select e.id from Docente e where e.usuarioId = u.id and e.id = :docenteId))
           order by u.apellidos, u.nombres
           """)
    List<Usuario> cuentasDocenteDisponibles(@Param("institucionId") Long institucionId,
                                            @Param("docenteId") Long docenteId);
}
package ec.edu.ups.tipi.usuarios;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    @Query("""
           select u from Usuario u join fetch u.rol
           where lower(u.username) = lower(:identificador)
              or lower(u.email) = lower(:identificador)
           """)
    Optional<Usuario> buscarPorIdentificador(@Param("identificador") String identificador);
}
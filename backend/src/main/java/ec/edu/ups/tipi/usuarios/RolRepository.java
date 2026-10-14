package ec.edu.ups.tipi.usuarios;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RolRepository extends JpaRepository<Rol, Integer> {
    Optional<Rol> findByCodigo(String codigo);
}
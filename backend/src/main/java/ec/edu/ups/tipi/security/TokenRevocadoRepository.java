package ec.edu.ups.tipi.security;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface TokenRevocadoRepository extends JpaRepository<TokenRevocado, UUID> {

    @Modifying
    @Query("delete from TokenRevocado t where t.expiraEn < :limite")
    int eliminarExpirados(@Param("limite") Instant limite);
}
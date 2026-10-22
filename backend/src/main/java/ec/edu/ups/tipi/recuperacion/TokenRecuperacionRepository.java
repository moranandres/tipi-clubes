package ec.edu.ups.tipi.recuperacion;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface TokenRecuperacionRepository extends JpaRepository<TokenRecuperacion, Long> {

    Optional<TokenRecuperacion> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TokenRecuperacion t where t.tokenHash = :hash")
    Optional<TokenRecuperacion> buscarParaUso(@Param("hash") String hash);

    long countByUsuarioIdAndCreatedAtAfter(Long usuarioId, Instant desde);

    @Modifying
    @Query("""
           update TokenRecuperacion t set t.invalidadoEn = :ahora
           where t.usuarioId = :usuarioId
             and t.id <> :idExcluido
             and t.usadoEn is null
             and t.invalidadoEn is null
           """)
    int invalidarOtrosVigentes(@Param("usuarioId") Long usuarioId,
                               @Param("idExcluido") Long idExcluido,
                               @Param("ahora") Instant ahora);

    @Modifying
    @Query("delete from TokenRecuperacion t where t.expiraEn < :limite")
    int eliminarAnterioresA(@Param("limite") Instant limite);
}
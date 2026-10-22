package ec.edu.ups.tipi.security;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tokens_revocados")
@Getter @Setter
public class TokenRevocado {

    @Id
    @Column(name = "jti", nullable = false, updatable = false)
    private UUID jti;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Column(name = "expira_en", nullable = false, updatable = false)
    private Instant expiraEn;

    @Column(name = "revocado_en", nullable = false, updatable = false)
    private Instant revocadoEn = Instant.now();
}
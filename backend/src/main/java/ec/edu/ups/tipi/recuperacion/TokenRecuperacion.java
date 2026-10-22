package ec.edu.ups.tipi.recuperacion;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "tokens_recuperacion")
@Getter @Setter
public class TokenRecuperacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Column(name = "token_hash", nullable = false, length = 64, updatable = false)
    private String tokenHash;

    @Column(name = "expira_en", nullable = false, updatable = false)
    private Instant expiraEn;

    @Column(name = "usado_en")
    private Instant usadoEn;

    @Column(name = "invalidado_en")
    private Instant invalidadoEn;

    @Column(name = "solicitado_ip", length = 45, updatable = false)
    private String solicitadoIp;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean estaVigente(Instant momento) {
        return usadoEn == null && invalidadoEn == null && expiraEn.isAfter(momento);
    }
}
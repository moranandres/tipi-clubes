package ec.edu.ups.tipi.auditoria;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "auditoria")
@Getter @Setter
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", updatable = false)
    private Long usuarioId;

    @Column(length = 150, updatable = false)
    private String identificador;

    @Column(nullable = false, length = 50, updatable = false)
    private String accion;

    @Column(length = 50, updatable = false)
    private String entidad;

    @Column(name = "entidad_id", updatable = false)
    private Long entidadId;

    @Column(columnDefinition = "text", updatable = false)
    private String detalle;

    @Column(length = 45, updatable = false)
    private String ip;

    @Column(nullable = false, updatable = false)
    private Instant fecha = Instant.now();
}
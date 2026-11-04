package ec.edu.ups.tipi.retiros;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "solicitudes_retiro")
@Getter @Setter
public class SolicitudRetiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inscripcion_id", nullable = false, updatable = false)
    private Long inscripcionId;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Column(nullable = false, length = 500, updatable = false)
    private String motivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoRetiro estado = EstadoRetiro.PENDIENTE;

    @Column(name = "solicitado_por", nullable = false, updatable = false)
    private Long solicitadoPor;

    @Column(name = "fecha_solicitud", nullable = false, updatable = false)
    private Instant fechaSolicitud = Instant.now();

    @Column(name = "resuelto_por")
    private Long resueltoPor;

    @Column(name = "fecha_resolucion")
    private Instant fechaResolucion;

    @Column(name = "observacion_resolucion", length = 500)
    private String observacionResolucion;

    @Column(name = "fecha_retiro")
    private LocalDate fechaRetiro;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

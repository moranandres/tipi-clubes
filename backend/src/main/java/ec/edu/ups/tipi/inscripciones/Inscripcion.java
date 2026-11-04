package ec.edu.ups.tipi.inscripciones;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "inscripciones")
@Getter @Setter
public class Inscripcion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "estudiante_id", nullable = false, updatable = false)
    private Long estudianteId;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Column(name = "periodo_id", nullable = false, updatable = false)
    private Integer periodoId;

    @Column(name = "fecha_ingreso", nullable = false)
    private LocalDate fechaIngreso;

    @Column(name = "fecha_retiro")
    private LocalDate fechaRetiro;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoInscripcion estado = EstadoInscripcion.ACTIVA;

    @Column(name = "sobrecupo_autorizado", nullable = false)
    private boolean sobrecupoAutorizado;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

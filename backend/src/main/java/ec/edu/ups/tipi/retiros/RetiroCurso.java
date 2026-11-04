package ec.edu.ups.tipi.retiros;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "solicitudes_retiro_cursos")
@Getter @Setter
public class RetiroCurso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "solicitud_retiro_id", nullable = false, updatable = false)
    private Long solicitudRetiroId;

    @Column(name = "inscripcion_curso_id", nullable = false, updatable = false)
    private Long inscripcionCursoId;

    @Column(name = "fecha_fin", nullable = false, updatable = false)
    private LocalDate fechaFin;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

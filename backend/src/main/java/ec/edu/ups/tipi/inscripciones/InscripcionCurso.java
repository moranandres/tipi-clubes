package ec.edu.ups.tipi.inscripciones;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "inscripciones_curso")
@Getter @Setter
public class InscripcionCurso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "estudiante_id", nullable = false, updatable = false)
    private Long estudianteId;

    @Column(name = "curso_id", nullable = false, updatable = false)
    private Long cursoId;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Column(name = "fecha_ingreso", nullable = false)
    private LocalDate fechaIngreso;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoInscripcionCurso estado = EstadoInscripcionCurso.ACTIVA;

    @Enumerated(EnumType.STRING)
    @Column(length = 15)
    private ResultadoCurso resultado;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

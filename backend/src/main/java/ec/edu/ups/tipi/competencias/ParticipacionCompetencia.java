package ec.edu.ups.tipi.competencias;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "participaciones_competencia")
@Getter @Setter
public class ParticipacionCompetencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "estudiante_id", nullable = false, updatable = false)
    private Long estudianteId;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Column(name = "inscripcion_id", nullable = false, updatable = false)
    private Long inscripcionId;

    @Column(name = "competencia_id", nullable = false, updatable = false)
    private Integer competenciaId;

    @Column(name = "edicion_id", nullable = false, updatable = false)
    private Integer edicionId;

    @Column(name = "categoria_id", nullable = false, updatable = false)
    private Integer categoriaId;

    @Column(name = "equipo_nombre", length = 150)
    private String equipoNombre;

    private Short puesto;

    @Column(length = 100)
    private String reconocimiento;

    @Column(columnDefinition = "text")
    private String observaciones;

    @Column(name = "registrado_por", nullable = false, updatable = false)
    private Long registradoPor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "actualizado_por")
    private Long actualizadoPor;

    @Column(name = "updated_at")
    private Instant updatedAt;
}

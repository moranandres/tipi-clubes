package ec.edu.ups.tipi.asistencias;

import ec.edu.ups.tipi.actividades.Actividad;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "asistencias")
@Getter @Setter
public class Asistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actividad_id", nullable = false, updatable = false)
    private Long actividadId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actividad_id", insertable = false, updatable = false)
    private Actividad actividad;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Column(name = "estudiante_id", nullable = false, updatable = false)
    private Long estudianteId;

    @Column(name = "inscripcion_id", nullable = false, updatable = false)
    private Long inscripcionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private EstadoAsistencia estado;

    @Column(length = 500)
    private String observacion;

    @Column(name = "registrado_por", nullable = false, updatable = false)
    private Long registradoPor;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private Instant fechaRegistro = Instant.now();

    @Column(name = "corregido_por")
    private Long corregidoPor;

    @Column(name = "fecha_correccion")
    private Instant fechaCorreccion;

    @Column(name = "motivo_correccion", length = 500)
    private String motivoCorreccion;
}

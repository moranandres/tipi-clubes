package ec.edu.ups.tipi.avances;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "avances")
@Getter @Setter
public class Avance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private AlcanceAvance alcance;

    @Column(name = "estudiante_id", updatable = false)
    private Long estudianteId;

    @Column(name = "proyecto_id", updatable = false)
    private Long proyectoId;

    @Column(name = "actividad_id")
    private Long actividadId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 2000)
    private String resultados;

    @Column(length = 2000)
    private String logros;

    @Column(length = 2000)
    private String dificultades;

    @Column(name = "proximos_pasos", length = 1000)
    private String proximosPasos;

    @Column(name = "porcentaje_avance")
    private Short porcentajeAvance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoAvance estado = EstadoAvance.ACTIVO;

    @Column(name = "registrado_por", nullable = false, updatable = false)
    private Long registradoPor;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private Instant fechaRegistro = Instant.now();

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn = Instant.now();

    @Column(name = "motivo_anulacion", length = 500)
    private String motivoAnulacion;

    @Column(name = "anulado_por")
    private Long anuladoPor;

    @Column(name = "fecha_anulacion")
    private Instant fechaAnulacion;

    @ElementCollection
    @BatchSize(size = 50)
    @CollectionTable(name = "avance_competencias", joinColumns = @JoinColumn(name = "avance_id"))
    private Set<CompetenciaEvaluada> competencias = new HashSet<>();
}

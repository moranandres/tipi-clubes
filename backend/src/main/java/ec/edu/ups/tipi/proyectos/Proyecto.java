package ec.edu.ups.tipi.proyectos;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "proyectos")
@Getter @Setter
public class Proyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Column(name = "docente_id", nullable = false)
    private Long docenteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TipoProyecto tipo;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 1000)
    private String objetivo;

    @Column(length = 4000)
    private String descripcion;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin_prevista")
    private LocalDate fechaFinPrevista;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoProyecto estado = EstadoProyecto.EN_DESARROLLO;

    @Column(name = "resultado_final", length = 2000)
    private String resultadoFinal;

    @Column(name = "fecha_finalizacion")
    private LocalDate fechaFinalizacion;

    @Column(name = "finalizado_por")
    private Long finalizadoPor;

    @Column(name = "motivo_cancelacion", length = 500)
    private String motivoCancelacion;

    @Column(name = "cancelado_por")
    private Long canceladoPor;

    @Column(name = "fecha_cancelacion")
    private Instant fechaCancelacion;

    @Column(name = "creado_por", nullable = false, updatable = false)
    private Long creadoPor;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private Instant fechaRegistro = Instant.now();

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn = Instant.now();

    @ElementCollection
    @BatchSize(size = 50)
    @CollectionTable(name = "proyecto_integrantes", joinColumns = @JoinColumn(name = "proyecto_id"))
    @Column(name = "estudiante_id", nullable = false)
    private Set<Long> estudianteIds = new HashSet<>();

    @ElementCollection
    @BatchSize(size = 50)
    @CollectionTable(name = "proyecto_evidencias", joinColumns = @JoinColumn(name = "proyecto_id"))
    @Column(name = "evidencia_id", nullable = false)
    private Set<Long> evidenciaIds = new HashSet<>();
}

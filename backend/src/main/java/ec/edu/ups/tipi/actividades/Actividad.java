package ec.edu.ups.tipi.actividades;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "actividades")
@Getter @Setter
public class Actividad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Column(name = "curso_id")
    private Long cursoId;

    @Column(name = "responsable_id", nullable = false)
    private Long responsableId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @Column(nullable = false, length = 200)
    private String tema;

    @Column(nullable = false, columnDefinition = "text")
    private String objetivo;

    @Column(columnDefinition = "text")
    private String descripcion;

    @Column(length = 150)
    private String lugar;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoActividad estado = EstadoActividad.PLANIFICADA;

    @Column(name = "resumen_ejecucion", columnDefinition = "text")
    private String resumenEjecucion;

    @Column(columnDefinition = "text")
    private String observaciones;

    @Column(name = "ejecutada_por")
    private Long ejecutadaPor;

    @Column(name = "fecha_registro_ejecucion")
    private Instant fechaRegistroEjecucion;

    @Column(name = "motivo_cancelacion", length = 500)
    private String motivoCancelacion;

    @Column(name = "cancelada_por")
    private Long canceladaPor;

    @Column(name = "fecha_cancelacion")
    private Instant fechaCancelacion;

    @Column(name = "creado_por", nullable = false, updatable = false)
    private Long creadoPor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn = Instant.now();

    @ElementCollection
    @BatchSize(size = 50)
    @CollectionTable(name = "actividad_contenidos", joinColumns = @JoinColumn(name = "actividad_id"))
    @Column(name = "contenido_id", nullable = false)
    private Set<Integer> contenidoIds = new HashSet<>();
}

package ec.edu.ups.tipi.evidencias;

import ec.edu.ups.tipi.actividades.Actividad;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "evidencias")
@Getter @Setter
public class Evidencia {

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

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12, updatable = false)
    private TipoEvidencia tipo;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 1000)
    private String descripcion;

    @Column(name = "fecha_evidencia", nullable = false)
    private LocalDate fechaEvidencia;

    @Column(length = 500, updatable = false)
    private String url;

    @Column(name = "archivo_ruta", length = 500)
    private String archivoRuta;

    @Column(name = "archivo_nombre", length = 150, updatable = false)
    private String archivoNombre;

    @Column(name = "archivo_tipo", length = 50, updatable = false)
    private String archivoTipo;

    @Column(name = "archivo_tamano", updatable = false)
    private Long archivoTamano;

    @Column(name = "archivo_hash", length = 64, updatable = false)
    private String archivoHash;

    @Column(name = "sin_estudiantes_identificables", nullable = false)
    private boolean sinEstudiantesIdentificables;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoEvidencia estado = EstadoEvidencia.ACTIVA;

    @Column(name = "registrado_por", nullable = false, updatable = false)
    private Long registradoPor;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private Instant fechaRegistro = Instant.now();

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn = Instant.now();

    @Column(name = "motivo_retiro", length = 500)
    private String motivoRetiro;

    @Column(name = "retirada_por")
    private Long retiradaPor;

    @Column(name = "fecha_retiro")
    private Instant fechaRetiro;

    @ElementCollection
    @BatchSize(size = 50)
    @CollectionTable(name = "evidencia_estudiantes", joinColumns = @JoinColumn(name = "evidencia_id"))
    @Column(name = "estudiante_id", nullable = false)
    private Set<Long> estudianteIds = new HashSet<>();
}

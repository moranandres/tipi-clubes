package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.cursos.NivelCurso;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "solicitudes_inscripcion")
@Getter @Setter
public class SolicitudInscripcion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "estudiante_id", nullable = false, updatable = false)
    private Long estudianteId;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Column(name = "curso_id", updatable = false)
    private Long cursoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15, updatable = false)
    private NivelCurso nivel;

    @Column(name = "experiencia_previa", columnDefinition = "text", updatable = false)
    private String experienciaPrevia;

    @Column(columnDefinition = "text", updatable = false)
    private String conocimientos;

    @Column(nullable = false, columnDefinition = "text", updatable = false)
    private String motivacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoSolicitud estado = EstadoSolicitud.PENDIENTE;

    @Column(name = "solicitado_por", nullable = false, updatable = false)
    private Long solicitadoPor;

    @Column(name = "fecha_solicitud", nullable = false, updatable = false)
    private Instant fechaSolicitud = Instant.now();

    @Column(name = "revisado_por")
    private Long revisadoPor;

    @Column(name = "fecha_revision")
    private Instant fechaRevision;

    @Column(name = "resuelto_por")
    private Long resueltoPor;

    @Column(name = "fecha_resolucion")
    private Instant fechaResolucion;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_asignado", length = 15)
    private NivelCurso nivelAsignado;

    @Column(name = "curso_asignado_id")
    private Long cursoAsignadoId;

    @Column(name = "inscripcion_id")
    private Long inscripcionId;

    @Column(name = "inscripcion_curso_id")
    private Long inscripcionCursoId;

    @Column(name = "sobrecupo_autorizado", nullable = false)
    private boolean sobrecupoAutorizado;

    @Column(name = "observacion_resolucion", length = 500)
    private String observacionResolucion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

package ec.edu.ups.tipi.certificados;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "certificados")
@Getter @Setter
public class Certificado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo_verificacion", nullable = false, updatable = false, length = 24)
    private String codigoVerificacion;

    @Column(name = "estudiante_id", nullable = false, updatable = false)
    private Long estudianteId;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Column(name = "club_id", nullable = false, updatable = false)
    private Long clubId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private TipoCertificado tipo;

    @Column(name = "inscripcion_curso_id", updatable = false)
    private Long inscripcionCursoId;

    @Column(name = "participacion_id", updatable = false)
    private Long participacionId;

    @Column(nullable = false, updatable = false, length = 200)
    private String titulo;

    @Column(name = "fecha_emision", nullable = false, updatable = false)
    private LocalDate fechaEmision;

    @Column(name = "emitido_por", nullable = false, updatable = false)
    private Long emitidoPor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoCertificado estado = EstadoCertificado.EMITIDO;

    @Column(name = "anulado_por")
    private Long anuladoPor;

    @Column(name = "fecha_anulacion")
    private Instant fechaAnulacion;

    @Column(name = "motivo_anulacion", length = 500)
    private String motivoAnulacion;

    @Column(name = "archivo_ruta", nullable = false, updatable = false, length = 500)
    private String archivoRuta;

    @Column(name = "archivo_hash", nullable = false, updatable = false, length = 64)
    private String archivoHash;

    @Column(name = "archivo_tamano", nullable = false, updatable = false)
    private Long archivoTamano;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

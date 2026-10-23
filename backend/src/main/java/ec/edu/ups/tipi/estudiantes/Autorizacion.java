package ec.edu.ups.tipi.estudiantes;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "autorizaciones_estudiante")
@Getter @Setter
public class Autorizacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "estudiante_id", nullable = false, updatable = false)
    private Long estudianteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private TipoAutorizacion tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoAutorizacion estado = EstadoAutorizacion.PENDIENTE;

    @Column(name = "fecha_registro")
    private LocalDate fechaRegistro;

    @Column(name = "documento_ruta", length = 500)
    private String documentoRuta;

    @Column(name = "documento_nombre", length = 150)
    private String documentoNombre;

    @Column(name = "documento_tipo", length = 50)
    private String documentoTipo;

    @Column(name = "documento_tamano")
    private Long documentoTamano;

    @Column(name = "documento_hash", length = 64)
    private String documentoHash;

    @Column(name = "documento_subido_en")
    private Instant documentoSubidoEn;

    @Column(name = "documento_subido_por")
    private Long documentoSubidoPor;

    @Column(name = "revocado_en")
    private Instant revocadoEn;

    @Column(length = 255)
    private String observacion;

    @Column(name = "registrado_por")
    private Long registradoPor;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn = Instant.now();
}
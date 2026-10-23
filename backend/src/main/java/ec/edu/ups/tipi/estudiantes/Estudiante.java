package ec.edu.ups.tipi.estudiantes;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Generated;

import java.time.Instant;

@Entity
@Table(name = "estudiantes")
@Getter @Setter
public class Estudiante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Generated
    @Column(name = "codigo_interno", length = 20, insertable = false, updatable = false)
    private String codigoInterno;

    @Column(nullable = false, length = 100)
    private String nombres;

    @Column(nullable = false, length = 100)
    private String apellidos;

    @Column(name = "institucion_id", nullable = false, updatable = false)
    private Long institucionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CursoEducativo curso;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoEstudiante estado = EstadoEstudiante.ACTIVO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
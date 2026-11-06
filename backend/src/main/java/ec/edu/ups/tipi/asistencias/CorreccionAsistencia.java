package ec.edu.ups.tipi.asistencias;

import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

import java.time.Instant;

@Entity
@Immutable
@Table(name = "asistencia_correcciones")
@Getter
public class CorreccionAsistencia {

    @Id
    private Long id;

    @Column(name = "asistencia_id", nullable = false)
    private Long asistenciaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_anterior", nullable = false, length = 12)
    private EstadoAsistencia estadoAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_nuevo", nullable = false, length = 12)
    private EstadoAsistencia estadoNuevo;

    @Column(name = "observacion_anterior", length = 500)
    private String observacionAnterior;

    @Column(name = "observacion_nueva", length = 500)
    private String observacionNueva;

    @Column(nullable = false, length = 500)
    private String motivo;

    @Column(name = "corregido_por", nullable = false)
    private Long corregidoPor;

    @Column(nullable = false)
    private Instant fecha;
}

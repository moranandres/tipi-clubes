package ec.edu.ups.tipi.actividades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Immutable
@Table(name = "actividad_reprogramaciones")
@Getter
public class ReprogramacionActividad {

    @Id
    private Long id;

    @Column(name = "actividad_id", nullable = false)
    private Long actividadId;

    @Column(name = "fecha_anterior", nullable = false)
    private LocalDate fechaAnterior;

    @Column(name = "hora_inicio_anterior", nullable = false)
    private LocalTime horaInicioAnterior;

    @Column(name = "hora_fin_anterior", nullable = false)
    private LocalTime horaFinAnterior;

    @Column(name = "fecha_nueva", nullable = false)
    private LocalDate fechaNueva;

    @Column(name = "hora_inicio_nueva", nullable = false)
    private LocalTime horaInicioNueva;

    @Column(name = "hora_fin_nueva", nullable = false)
    private LocalTime horaFinNueva;

    @Column(nullable = false, length = 500)
    private String motivo;

    @Column(name = "registrado_por", nullable = false)
    private Long registradoPor;

    @Column(name = "fecha_registro", nullable = false)
    private Instant fechaRegistro;
}

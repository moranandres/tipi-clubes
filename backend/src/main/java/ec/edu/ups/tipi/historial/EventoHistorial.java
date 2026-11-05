package ec.edu.ups.tipi.historial;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

import java.time.LocalDate;

@Entity
@Immutable
@Table(name = "vw_historial_estudiante")
@Getter
public class EventoHistorial {

    @Id
    private String id;

    @Column(name = "estudiante_id")
    private Long estudianteId;

    @Column(name = "institucion_id")
    private Long institucionId;

    @Column(name = "club_id")
    private Long clubId;

    @Column(name = "registrado_por")
    private Long registradoPor;

    private LocalDate fecha;

    private Integer orden;

    @Enumerated(EnumType.STRING)
    private TipoEventoHistorial tipo;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(columnDefinition = "text")
    private String descripcion;
}

package ec.edu.ups.tipi.catalogo;

import ec.edu.ups.tipi.cursos.EstadoCurso;
import ec.edu.ups.tipi.cursos.ModalidadCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;
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
@Table(name = "vw_catalogo_cursos")
@Getter
public class CatalogoCurso {

    @Id
    private Long id;

    @Column(name = "club_id")
    private Long clubId;

    @Column(name = "institucion_id")
    private Long institucionId;

    private String nombre;

    @Column(columnDefinition = "text")
    private String descripcion;

    @Enumerated(EnumType.STRING)
    private NivelCurso nivel;

    @Enumerated(EnumType.STRING)
    private ModalidadCurso modalidad;

    private String lugar;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(name = "duracion_horas")
    private Short duracionHoras;

    @Column(name = "cupo_maximo")
    private Integer cupoMaximo;

    @Enumerated(EnumType.STRING)
    private EstadoCurso estado;

    @Column(name = "inscritos_activos")
    private long inscritosActivos;

    private long finalizados;

    private long aprobados;

    @Column(name = "cupos_disponibles")
    private long cuposDisponibles;

    @Column(name = "admite_inscripciones")
    private boolean admiteInscripciones;
}

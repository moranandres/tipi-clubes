package ec.edu.ups.tipi.catalogo;

import ec.edu.ups.tipi.instituciones.EstadoAdhesion;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "vw_catalogo_instituciones")
@Getter
public class CatalogoInstitucion {

    @Id
    private String id;

    @Column(name = "institucion_id")
    private Long institucionId;

    @Column(name = "codigo_amie")
    private String codigoAmie;

    private String nombre;

    private String provincia;

    private String canton;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_adhesion")
    private EstadoAdhesion estadoAdhesion;

    @Column(name = "periodo_id")
    private Integer periodoId;

    @Column(name = "periodo_nombre")
    private String periodoNombre;

    @Column(name = "periodo_activo")
    private boolean periodoActivo;

    @Column(name = "clubes_total")
    private long clubesTotal;

    @Column(name = "clubes_planificados")
    private long clubesPlanificados;

    @Column(name = "clubes_activos")
    private long clubesActivos;

    @Column(name = "clubes_suspendidos")
    private long clubesSuspendidos;

    @Column(name = "clubes_cerrados")
    private long clubesCerrados;

    @Column(name = "clubes_abiertos")
    private long clubesAbiertos;

    @Column(name = "cupos_disponibles")
    private long cuposDisponibles;

    @Column(name = "cursos_abiertos")
    private long cursosAbiertos;

    @Column(name = "estudiantes_activos")
    private long estudiantesActivos;
}

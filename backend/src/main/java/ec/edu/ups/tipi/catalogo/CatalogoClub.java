package ec.edu.ups.tipi.catalogo;

import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.instituciones.EstadoAdhesion;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Immutable
@Table(name = "vw_catalogo_clubes")
@Getter
public class CatalogoClub {

    @Id
    private Long id;

    @Column(name = "institucion_id")
    private Long institucionId;

    @Column(name = "codigo_amie")
    private String codigoAmie;

    @Column(name = "institucion_nombre")
    private String institucionNombre;

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

    @Column(name = "docente_id")
    private Long docenteId;

    @Column(name = "docente_nombre")
    private String docenteNombre;

    private String nombre;

    @Column(columnDefinition = "text")
    private String objetivo;

    @Column(name = "fecha_creacion")
    private LocalDate fechaCreacion;

    @Column(name = "dia_semana")
    private Short diaSemana;

    @Column(name = "hora_inicio")
    private LocalTime horaInicio;

    @Column(name = "hora_fin")
    private LocalTime horaFin;

    private String lugar;

    @Column(name = "cupo_maximo")
    private Integer cupoMaximo;

    @Enumerated(EnumType.STRING)
    private EstadoClub estado;

    @Column(name = "integrantes_activos")
    private long integrantesActivos;

    @Column(name = "cupos_disponibles")
    private long cuposDisponibles;

    @Column(name = "integrantes_nuevos")
    private long integrantesNuevos;

    @Column(name = "integrantes_antiguos")
    private long integrantesAntiguos;

    @Column(name = "integrantes_historicos")
    private long integrantesHistoricos;

    private long retiros;

    @Column(name = "cursos_abiertos")
    private long cursosAbiertos;

    @Column(name = "cursos_total")
    private long cursosTotal;

    private long participaciones;

    @Column(name = "certificados_vigentes")
    private long certificadosVigentes;

    @Column(name = "admite_inscripciones")
    private boolean admiteInscripciones;
}

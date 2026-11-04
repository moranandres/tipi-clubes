package ec.edu.ups.tipi.competencias;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "ediciones_competencia")
@Getter @Setter
public class EdicionCompetencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "competencia_id", nullable = false, updatable = false)
    private Integer competenciaId;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false)
    private Short anio;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(length = 150)
    private String sede;

    @Column(nullable = false)
    private boolean activa = true;
}

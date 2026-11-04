package ec.edu.ups.tipi.competencias;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "categorias_competencia")
@Getter @Setter
public class CategoriaCompetencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "competencia_id", nullable = false, updatable = false)
    private Integer competenciaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private NivelCategoria nivel;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @Column(nullable = false)
    private boolean activa = true;
}

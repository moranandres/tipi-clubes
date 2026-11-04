package ec.edu.ups.tipi.competencias;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "competencias")
@Getter @Setter
public class Competencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 200)
    private String organizador;

    @Column(name = "sitio_web", length = 200)
    private String sitioWeb;

    @Column(nullable = false)
    private boolean activa = true;
}

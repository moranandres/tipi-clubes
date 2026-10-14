package ec.edu.ups.tipi.usuarios;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "roles")
@Getter @Setter
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(nullable = false, length = 80)
    private String nombre;

    private String descripcion;
}
package ec.edu.ups.tipi.instituciones;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "instituciones")
@Getter @Setter
public class Institucion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo_amie", nullable = false, unique = true, length = 10)
    private String codigoAmie;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(length = 30)
    private String zona;

    @Column(length = 80)
    private String circuito;

    @Column(nullable = false, length = 80)
    private String provincia;

    @Column(nullable = false, length = 80)
    private String canton;

    @Column(length = 255)
    private String direccion;

    @Column(length = 30)
    private String telefono;

    @Column(name = "correo_contacto", length = 150)
    private String correoContacto;

    @Column(name = "autoridad_nombre", length = 150)
    private String autoridadNombre;

    @Column(name = "autoridad_cargo", length = 80)
    private String autoridadCargo;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_adhesion", nullable = false, length = 20)
    private EstadoAdhesion estadoAdhesion = EstadoAdhesion.PENDIENTE;

    @Column(name = "fecha_adhesion")
    private LocalDate fechaAdhesion;

    @Column(name = "responsable_id")
    private Long responsableId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
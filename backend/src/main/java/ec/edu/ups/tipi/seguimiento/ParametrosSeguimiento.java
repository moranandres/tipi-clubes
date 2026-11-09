package ec.edu.ups.tipi.seguimiento;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "parametros_seguimiento")
@Getter @Setter
public class ParametrosSeguimiento {

    public static final short ID_UNICO = 1;

    @Id
    private Short id;

    @Column(name = "dias_gracia_registro", nullable = false)
    private Short diasGraciaRegistro;

    @Column(name = "umbral_adecuado", nullable = false, precision = 4, scale = 1)
    private BigDecimal umbralAdecuado;

    @Column(name = "umbral_minimo", nullable = false, precision = 4, scale = 1)
    private BigDecimal umbralMinimo;

    @Column(name = "actualizado_por")
    private Long actualizadoPor;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;
}

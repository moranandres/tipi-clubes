package ec.edu.ups.tipi.avances;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CompetenciaEvaluada {

    @Column(name = "contenido_id", nullable = false)
    private Integer contenidoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private NivelLogro nivel;
}

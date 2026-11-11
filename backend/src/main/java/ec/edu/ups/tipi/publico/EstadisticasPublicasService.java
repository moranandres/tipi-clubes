package ec.edu.ups.tipi.publico;

import ec.edu.ups.tipi.publico.dto.EstadisticasPublicasResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class EstadisticasPublicasService {

    private final EstadisticasPublicasRepository repository;
    private final Duration vigencia;

    private volatile EstadisticasPublicasResponse ultima;

    public EstadisticasPublicasService(
            EstadisticasPublicasRepository repository,
            @Value("${tipi.publico.estadisticas-cache-segundos}") long segundosDeVigencia) {
        this.repository = repository;
        this.vigencia = Duration.ofSeconds(Math.max(segundosDeVigencia, 0));
    }

    public Duration vigencia() {
        return vigencia;
    }

    @Transactional(readOnly = true)
    public EstadisticasPublicasResponse obtener() {
        EstadisticasPublicasResponse actual = ultima;
        Instant ahora = Instant.now();
        if (actual != null && ahora.isBefore(actual.actualizadoEn().plus(vigencia))) {
            return actual;
        }
        EstadisticasPublicasResponse nueva = calcular(ahora);
        ultima = nueva;
        return nueva;
    }

    private EstadisticasPublicasResponse calcular(Instant ahora) {
        Object[] fila = repository.agregados();
        return new EstadisticasPublicasResponse(
                (String) fila[0],
                numero(fila[1]),
                numero(fila[2]),
                numero(fila[3]),
                numero(fila[4]),
                numero(fila[5]),
                numero(fila[6]),
                numero(fila[7]),
                Math.round(((Number) fila[8]).doubleValue()),
                numero(fila[9]),
                numero(fila[10]),
                numero(fila[11]),
                ahora);
    }

    private long numero(Object valor) {
        return ((Number) valor).longValue();
    }
}

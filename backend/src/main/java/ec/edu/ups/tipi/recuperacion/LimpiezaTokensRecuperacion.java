package ec.edu.ups.tipi.recuperacion;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class LimpiezaTokensRecuperacion {

    private final TokenRecuperacionRepository repository;

    @Scheduled(cron = "${tipi.security.limpieza-cron}", zone = "America/Guayaquil")
    @Transactional
    public void limpiar() {
        int eliminados = repository.eliminarAnterioresA(Instant.now().minus(1, ChronoUnit.DAYS));
        if (eliminados > 0) {
            log.info("Se eliminaron {} enlaces de recuperación vencidos hace más de un día.", eliminados);
        }
    }
}
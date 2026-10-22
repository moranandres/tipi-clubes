package ec.edu.ups.tipi.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class LimpiezaTokensRevocados {

    private final TokenRevocadoRepository repository;

    @Scheduled(cron = "${tipi.security.limpieza-cron}", zone = "America/Guayaquil")
    @Transactional
    public void limpiar() {
        int eliminados = repository.eliminarExpirados(Instant.now());
        if (eliminados > 0) {
            log.info("Se eliminaron {} tokens revocados ya expirados.", eliminados);
        }
    }
}
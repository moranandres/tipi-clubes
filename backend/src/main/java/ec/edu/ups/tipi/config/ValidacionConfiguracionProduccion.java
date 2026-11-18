package ec.edu.ups.tipi.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Slf4j
@Component
@Profile("prod")
public class ValidacionConfiguracionProduccion implements InitializingBean {

    static final int LONGITUD_MINIMA_SECRETO = 64;
    private static final List<String> MARCAS_DE_DESARROLLO = List.of("desarrollo", "cambiala", "changeme", "secret");

    private final String jwtSecret;
    private final String frontendBaseUrl;
    private final String origenesCors;

    public ValidacionConfiguracionProduccion(@Value("${tipi.security.jwt-secret}") String jwtSecret,
                                             @Value("${tipi.frontend.base-url}") String frontendBaseUrl,
                                             @Value("${tipi.cors.allowed-origins}") String origenesCors) {
        this.jwtSecret = jwtSecret;
        this.frontendBaseUrl = frontendBaseUrl;
        this.origenesCors = origenesCors;
    }

    @Override
    public void afterPropertiesSet() {
        List<String> problemas = problemas(jwtSecret, frontendBaseUrl, origenesCors);
        if (!problemas.isEmpty()) {
            throw new IllegalStateException("Configuración de producción incompleta: " + String.join(" ", problemas));
        }
        if (!frontendBaseUrl.startsWith("https://")) {
            log.warn("FRONTEND_BASE_URL no usa HTTPS ({}); los enlaces de certificados y de recuperación no irán cifrados.",
                    frontendBaseUrl);
        }
    }

    static List<String> problemas(String jwtSecret, String frontendBaseUrl, String origenesCors) {
        List<String> problemas = new ArrayList<>();
        String secreto = jwtSecret == null ? "" : jwtSecret;
        if (secreto.getBytes(StandardCharsets.UTF_8).length < LONGITUD_MINIMA_SECRETO) {
            problemas.add("JWT_SECRET debe tener al menos " + LONGITUD_MINIMA_SECRETO + " caracteres aleatorios.");
        }
        String minusculas = secreto.toLowerCase(Locale.ROOT);
        if (MARCAS_DE_DESARROLLO.stream().anyMatch(minusculas::contains)) {
            problemas.add("JWT_SECRET parece una clave de ejemplo; genere una aleatoria.");
        }
        if (!esUrlAbsoluta(frontendBaseUrl)) {
            problemas.add("FRONTEND_BASE_URL debe ser la URL pública de web/ (por ejemplo https://clubes.ejemplo.ec).");
        }
        List<String> origenes = Arrays.stream(origenesCors == null ? new String[0] : origenesCors.split(","))
                .map(String::trim)
                .filter(origen -> !origen.isEmpty())
                .toList();
        if (origenes.isEmpty()) {
            problemas.add("CORS_ALLOWED_ORIGINS debe indicar al menos el dominio público de web/.");
        } else if (origenes.stream().anyMatch(origen -> origen.equals("*") || !esUrlAbsoluta(origen))) {
            problemas.add("CORS_ALLOWED_ORIGINS solo admite orígenes completos separados por comas, sin comodines.");
        }
        return problemas;
    }

    private static boolean esUrlAbsoluta(String valor) {
        if (valor == null || valor.isBlank()) {
            return false;
        }
        try {
            URI uri = URI.create(valor.trim());
            return ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) && uri.getHost() != null;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}

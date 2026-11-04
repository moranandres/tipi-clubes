package ec.edu.ups.tipi.certificados;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

public final class CodigoVerificacion {

    private static final String ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private static final Pattern FORMATO = Pattern.compile("^TIPI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$");
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private CodigoVerificacion() {
    }

    public static String generar() {
        StringBuilder codigo = new StringBuilder("TIPI");
        for (int grupo = 0; grupo < 3; grupo++) {
            codigo.append('-');
            for (int i = 0; i < 4; i++) {
                codigo.append(ALFABETO.charAt(ALEATORIO.nextInt(ALFABETO.length())));
            }
        }
        return codigo.toString();
    }

    public static Optional<String> normalizar(String entrada) {
        if (entrada == null) {
            return Optional.empty();
        }
        String limpio = entrada.trim().toUpperCase(Locale.ROOT).replaceAll("[\\s-]", "")
                .replace('O', '0').replace('I', '1').replace('L', '1');
        if (limpio.startsWith("T1P1")) {
            limpio = "TIPI" + limpio.substring(4);
        }
        if (!limpio.startsWith("TIPI") || limpio.length() != 16) {
            return Optional.empty();
        }
        String cuerpo = limpio.substring(4);
        String codigo = "TIPI-" + cuerpo.substring(0, 4) + "-" + cuerpo.substring(4, 8) + "-" + cuerpo.substring(8);
        return FORMATO.matcher(codigo).matches() ? Optional.of(codigo) : Optional.empty();
    }
}

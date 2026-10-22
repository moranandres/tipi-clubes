package ec.edu.ups.tipi.recuperacion;

import ec.edu.ups.tipi.auditoria.AuditoriaRepository;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RecuperacionService {

    private static final String ACCION_SOLICITUD = "RECUPERACION_SOLICITADA";
    private static final String MENSAJE_ENLACE_INVALIDO = "El enlace no es válido o ya expiró. Solicite uno nuevo.";
    private static final long SIN_EXCLUSION = -1L;

    private final SecureRandom aleatorio = new SecureRandom();
    private final UsuarioRepository usuarioRepository;
    private final TokenRecuperacionRepository tokenRepository;
    private final AuditoriaRepository auditoriaRepository;
    private final AuditoriaService auditoria;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventos;
    private final int minutosValidez;
    private final int maxPorCuentaHora;
    private final int maxPorIp15Minutos;
    private final String frontendBaseUrl;

    public RecuperacionService(UsuarioRepository usuarioRepository,
                               TokenRecuperacionRepository tokenRepository,
                               AuditoriaRepository auditoriaRepository,
                               AuditoriaService auditoria,
                               PasswordEncoder passwordEncoder,
                               ApplicationEventPublisher eventos,
                               @Value("${tipi.recuperacion.minutos-validez}") int minutosValidez,
                               @Value("${tipi.recuperacion.max-por-cuenta-hora}") int maxPorCuentaHora,
                               @Value("${tipi.recuperacion.max-por-ip-15-minutos}") int maxPorIp15Minutos,
                               @Value("${tipi.frontend.base-url}") String frontendBaseUrl) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.auditoriaRepository = auditoriaRepository;
        this.auditoria = auditoria;
        this.passwordEncoder = passwordEncoder;
        this.eventos = eventos;
        this.minutosValidez = minutosValidez;
        this.maxPorCuentaHora = maxPorCuentaHora;
        this.maxPorIp15Minutos = maxPorIp15Minutos;
        this.frontendBaseUrl = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
    }

    @Transactional
    public void solicitar(String identificadorIngresado, String ip) {
        String identificador = identificadorIngresado.trim();
        Instant ahora = Instant.now();

        long solicitudesIp = auditoriaRepository.countByAccionAndIpAndFechaAfter(
                ACCION_SOLICITUD, ip, ahora.minus(15, ChronoUnit.MINUTES));
        if (solicitudesIp >= maxPorIp15Minutos) {
            auditoria.registrarComo(null, identificador, ACCION_SOLICITUD, null, null,
                    "Límite de solicitudes por IP alcanzado; no se envió correo");
            return;
        }

        Usuario usuario = usuarioRepository.buscarPorIdentificador(identificador).orElse(null);
        if (usuario == null) {
            auditoria.registrarComo(null, identificador, ACCION_SOLICITUD, null, null,
                    "Identificador no registrado; no se envió correo");
            return;
        }
        if (!usuario.isActivo()) {
            auditoria.registrarComo(usuario.getId(), usuario.getUsername(), ACCION_SOLICITUD,
                    "USUARIO", usuario.getId(), "Cuenta inactiva; no se envió correo");
            return;
        }

        long solicitudesCuenta = tokenRepository.countByUsuarioIdAndCreatedAtAfter(
                usuario.getId(), ahora.minus(1, ChronoUnit.HOURS));
        if (solicitudesCuenta >= maxPorCuentaHora) {
            auditoria.registrarComo(usuario.getId(), usuario.getUsername(), ACCION_SOLICITUD,
                    "USUARIO", usuario.getId(), "Límite de solicitudes por cuenta alcanzado; no se envió correo");
            return;
        }

        tokenRepository.invalidarOtrosVigentes(usuario.getId(), SIN_EXCLUSION, ahora);

        String token = generarToken();
        TokenRecuperacion registro = new TokenRecuperacion();
        registro.setUsuarioId(usuario.getId());
        registro.setTokenHash(hash(token));
        registro.setCreatedAt(ahora);
        registro.setExpiraEn(ahora.plus(minutosValidez, ChronoUnit.MINUTES));
        registro.setSolicitadoIp(ip);
        tokenRepository.save(registro);

        auditoria.registrarComo(usuario.getId(), usuario.getUsername(), ACCION_SOLICITUD,
                "USUARIO", usuario.getId(), "Enlace de recuperación generado y enviado al correo registrado");

        eventos.publishEvent(new CorreoRecuperacion(
                usuario.getEmail(),
                usuario.getNombres(),
                frontendBaseUrl + "/restablecer.html#token=" + token,
                minutosValidez));
    }

    @Transactional(readOnly = true)
    public void validar(String token) {
        Instant ahora = Instant.now();
        TokenRecuperacion registro = tokenRepository.findByTokenHash(hash(token))
                .filter(t -> t.estaVigente(ahora))
                .orElseThrow(this::enlaceInvalido);
        usuarioRepository.findById(registro.getUsuarioId())
                .filter(Usuario::isActivo)
                .orElseThrow(this::enlaceInvalido);
    }

    @Transactional
    public void restablecer(String token, String passwordNueva) {
        Instant ahora = Instant.now();
        TokenRecuperacion registro = tokenRepository.buscarParaUso(hash(token))
                .filter(t -> t.estaVigente(ahora))
                .orElseThrow(this::enlaceInvalido);
        Usuario usuario = usuarioRepository.findById(registro.getUsuarioId())
                .filter(Usuario::isActivo)
                .orElseThrow(this::enlaceInvalido);

        if (passwordEncoder.matches(passwordNueva, usuario.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La contraseña nueva debe ser distinta de la actual.");
        }

        usuario.setPasswordHash(passwordEncoder.encode(passwordNueva));
        usuario.setDebeCambiarPassword(false);
        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        usuario.invalidarSesiones();

        registro.setUsadoEn(ahora);
        tokenRepository.invalidarOtrosVigentes(usuario.getId(), registro.getId(), ahora);

        auditoria.registrarComo(usuario.getId(), usuario.getUsername(), "PASSWORD_RECUPERADA",
                "USUARIO", usuario.getId(),
                "Contraseña restablecida mediante enlace de recuperación; se cerraron todas las sesiones");
    }

    private ApiException enlaceInvalido() {
        return new ApiException(HttpStatus.BAD_REQUEST, MENSAJE_ENLACE_INVALIDO);
    }

    private String generarToken() {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            byte[] resumen = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumen);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("El algoritmo SHA-256 no está disponible", e);
        }
    }
}
package ec.edu.ups.tipi.auth;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.auth.dto.CambiarPasswordRequest;
import ec.edu.ups.tipi.auth.dto.LoginRequest;
import ec.edu.ups.tipi.auth.dto.LoginResponse;
import ec.edu.ups.tipi.auth.dto.UsuarioResumen;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.CredencialesInvalidasException;
import ec.edu.ups.tipi.security.JwtService;
import ec.edu.ups.tipi.security.TokenRevocado;
import ec.edu.ups.tipi.security.TokenRevocadoRepository;
import ec.edu.ups.tipi.security.TokenValidado;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final TokenRevocadoRepository tokenRevocadoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditoriaService auditoria;
    private final int maxIntentos;
    private final long minutosBloqueo;
    private final String hashFalso;

    public AuthService(UsuarioRepository usuarioRepository,
                       TokenRevocadoRepository tokenRevocadoRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuditoriaService auditoria,
                       @Value("${tipi.security.max-failed-attempts}") int maxIntentos,
                       @Value("${tipi.security.lock-minutes}") long minutosBloqueo) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRevocadoRepository = tokenRevocadoRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditoria = auditoria;
        this.maxIntentos = maxIntentos;
        this.minutosBloqueo = minutosBloqueo;
        this.hashFalso = passwordEncoder.encode("contrasena-falsa-para-igualar-tiempos");
    }

    @Transactional(noRollbackFor = CredencialesInvalidasException.class)
    public LoginResponse login(LoginRequest request) {
        Instant ahora = Instant.now();
        String identificador = request.identificador().trim();

        Usuario usuario = usuarioRepository.buscarPorIdentificador(identificador).orElse(null);

        if (usuario == null) {
            passwordEncoder.matches(request.password(), hashFalso);
            auditoria.registrarComo(null, identificador, "LOGIN_FALLIDO", null, null,
                    "Identificador no registrado");
            throw new CredencialesInvalidasException();
        }

        boolean passwordCorrecta = passwordEncoder.matches(request.password(), usuario.getPasswordHash());
        boolean bloqueado = usuario.getBloqueadoHasta() != null
                && usuario.getBloqueadoHasta().isAfter(ahora);

        if (bloqueado || !usuario.isActivo()) {
            auditoria.registrarComo(usuario.getId(), usuario.getUsername(), "LOGIN_FALLIDO",
                    "USUARIO", usuario.getId(),
                    bloqueado ? "Cuenta bloqueada temporalmente" : "Cuenta inactiva");
            throw new CredencialesInvalidasException();
        }
        if (!passwordCorrecta) {
            registrarFallo(usuario, ahora);
            throw new CredencialesInvalidasException();
        }

        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        usuario.setUltimoAcceso(ahora);
        auditoria.registrarComo(usuario.getId(), usuario.getUsername(), "LOGIN_EXITOSO",
                "USUARIO", usuario.getId(), null);

        return emitir(usuario);
    }

    @Transactional
    public LoginResponse cambiarPassword(UsuarioPrincipal principal, CambiarPasswordRequest request) {
        Usuario usuario = buscar(principal.getId());

        if (!passwordEncoder.matches(request.passwordActual(), usuario.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta.");
        }
        if (passwordEncoder.matches(request.passwordNueva(), usuario.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La contraseña nueva debe ser distinta de la actual.");
        }
        usuario.setPasswordHash(passwordEncoder.encode(request.passwordNueva()));
        usuario.setDebeCambiarPassword(false);
        usuario.invalidarSesiones();
        auditoria.registrar("PASSWORD_CAMBIADA", "USUARIO", usuario.getId(),
                "username=" + usuario.getUsername() + "; se cerraron las demás sesiones abiertas");
        return emitir(usuario);
    }

    @Transactional
    public void logout(UsuarioPrincipal principal, TokenValidado token) {
        if (!tokenRevocadoRepository.existsById(token.jti())) {
            TokenRevocado revocado = new TokenRevocado();
            revocado.setJti(token.jti());
            revocado.setUsuarioId(principal.getId());
            revocado.setExpiraEn(token.expiraEn());
            tokenRevocadoRepository.save(revocado);
        }
        auditoria.registrar("LOGOUT", "USUARIO", principal.getId(), "username=" + principal.getUsername());
    }

    @Transactional
    public void cerrarSesiones(UsuarioPrincipal principal) {
        Usuario usuario = buscar(principal.getId());
        usuario.invalidarSesiones();
        auditoria.registrar("SESIONES_CERRADAS", "USUARIO", usuario.getId(),
                "Motivo: solicitud del propio usuario");
    }

    private Usuario buscar(Long id) {
        return usuarioRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));
    }

    private LoginResponse emitir(Usuario usuario) {
        String token = jwtService.generarToken(new UsuarioPrincipal(usuario));
        return new LoginResponse(token, "Bearer", jwtService.getExpirationSeconds(),
                UsuarioResumen.de(usuario));
    }

    private void registrarFallo(Usuario usuario, Instant ahora) {
        auditoria.registrarComo(usuario.getId(), usuario.getUsername(), "LOGIN_FALLIDO",
                "USUARIO", usuario.getId(), "Contraseña incorrecta");
        int intentos = usuario.getIntentosFallidos() + 1;
        if (intentos >= maxIntentos) {
            usuario.setBloqueadoHasta(ahora.plus(minutosBloqueo, ChronoUnit.MINUTES));
            intentos = 0;
            auditoria.registrarComo(usuario.getId(), usuario.getUsername(), "CUENTA_BLOQUEADA",
                    "USUARIO", usuario.getId(), "Bloqueo de " + minutosBloqueo + " minutos por intentos fallidos");
        }
        usuario.setIntentosFallidos(intentos);
    }
}
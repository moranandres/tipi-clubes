package ec.edu.ups.tipi.auth;

import ec.edu.ups.tipi.auth.dto.LoginRequest;
import ec.edu.ups.tipi.auth.dto.LoginResponse;
import ec.edu.ups.tipi.auth.dto.UsuarioResumen;
import ec.edu.ups.tipi.common.CredencialesInvalidasException;
import ec.edu.ups.tipi.security.JwtService;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final int maxIntentos;
    private final long minutosBloqueo;
    private final String hashFalso; // para igualar tiempos cuando el usuario no existe

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       @Value("${tipi.security.max-failed-attempts}") int maxIntentos,
                       @Value("${tipi.security.lock-minutes}") long minutosBloqueo) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.maxIntentos = maxIntentos;
        this.minutosBloqueo = minutosBloqueo;
        this.hashFalso = passwordEncoder.encode("contrasena-falsa-para-igualar-tiempos");
    }

    // noRollbackFor: si la excepción revirtiera la transacción, el contador de intentos fallidos nunca se guardaría
    @Transactional(noRollbackFor = CredencialesInvalidasException.class)
    public LoginResponse login(LoginRequest request) {
        Instant ahora = Instant.now();

        Usuario usuario = usuarioRepository
                .buscarPorIdentificador(request.identificador().trim())
                .orElse(null);

        if (usuario == null) {
            passwordEncoder.matches(request.password(), hashFalso);
            throw new CredencialesInvalidasException();
        }

        boolean passwordCorrecta = passwordEncoder.matches(request.password(), usuario.getPasswordHash());
        boolean bloqueado = usuario.getBloqueadoHasta() != null
                && usuario.getBloqueadoHasta().isAfter(ahora);

        if (bloqueado || !usuario.isActivo()) {
            throw new CredencialesInvalidasException();
        }
        if (!passwordCorrecta) {
            registrarFallo(usuario, ahora);
            throw new CredencialesInvalidasException();
        }

        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        usuario.setUltimoAcceso(ahora);

        String token = jwtService.generarToken(new UsuarioPrincipal(usuario));
        return new LoginResponse(token, "Bearer", jwtService.getExpirationSeconds(),
                UsuarioResumen.de(usuario));
    }

    private void registrarFallo(Usuario usuario, Instant ahora) {
        int intentos = usuario.getIntentosFallidos() + 1;
        if (intentos >= maxIntentos) {
            usuario.setBloqueadoHasta(ahora.plus(minutosBloqueo, ChronoUnit.MINUTES));
            intentos = 0;
        }
        usuario.setIntentosFallidos(intentos);
    }
}
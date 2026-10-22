package ec.edu.ups.tipi.security;

import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String ATRIBUTO_TOKEN = "tipi.tokenValidado";

    private static final Set<String> RUTAS_CON_PASSWORD_TEMPORAL = Set.of(
            "/api/auth/me",
            "/api/auth/cambiar-password",
            "/api/auth/logout",
            "/api/auth/cerrar-sesiones");

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;
    private final TokenRevocadoRepository tokenRevocadoRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            TokenValidado token = jwtService.validar(header.substring(7)).orElse(null);
            UsuarioPrincipal principal = token == null ? null : autenticar(token);

            if (principal != null) {
                if (principal.getUsuario().isDebeCambiarPassword()
                        && !RUTAS_CON_PASSWORD_TEMPORAL.contains(request.getRequestURI())) {
                    rechazarPorPasswordTemporal(response);
                    return;
                }
                request.setAttribute(ATRIBUTO_TOKEN, token);
                var auth = new UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        chain.doFilter(request, response);
    }

    private UsuarioPrincipal autenticar(TokenValidado token) {
        return usuarioRepository.buscarPorIdentificador(token.username())
                .filter(usuario -> usuario.getVersionToken() == token.version())
                .map(UsuarioPrincipal::new)
                .filter(p -> p.isEnabled() && p.isAccountNonLocked())
                .filter(p -> !tokenRevocadoRepository.existsById(token.jti()))
                .orElse(null);
    }

    private void rechazarPorPasswordTemporal(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"status\":403,\"title\":\"Forbidden\","
                + "\"detail\":\"Debe cambiar su contraseña temporal antes de continuar.\"}");
    }
}
package ec.edu.ups.tipi.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(@Value("${tipi.security.jwt-secret}") String secret,
                      @Value("${tipi.security.jwt-expiration-minutes}") long expirationMinutes) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("tipi.security.jwt-secret debe tener al menos 32 caracteres");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMinutes = expirationMinutes;
    }

    public String generarToken(UsuarioPrincipal principal) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(principal.getUsername())
                .claim("uid", principal.getId())
                .claim("rol", principal.getRolCodigo())
                .claim("ver", principal.getUsuario().getVersionToken())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(expirationMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    public Optional<TokenValidado> validar(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            if (!(claims.get("ver") instanceof Number version)) {
                return Optional.empty();
            }
            if (claims.getSubject() == null || claims.getId() == null || claims.getExpiration() == null) {
                return Optional.empty();
            }
            return Optional.of(new TokenValidado(
                    claims.getSubject(),
                    UUID.fromString(claims.getId()),
                    version.intValue(),
                    claims.getExpiration().toInstant()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public long getExpirationSeconds() {
        return expirationMinutes * 60;
    }
}
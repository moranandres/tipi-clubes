package ec.edu.ups.tipi.security;

import java.time.Instant;
import java.util.UUID;

public record TokenValidado(String username, UUID jti, int version, Instant expiraEn) {
}
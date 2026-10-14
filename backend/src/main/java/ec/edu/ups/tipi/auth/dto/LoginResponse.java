package ec.edu.ups.tipi.auth.dto;

public record LoginResponse(String accessToken, String tokenType,
                            long expiresInSeconds, UsuarioResumen usuario) {
}
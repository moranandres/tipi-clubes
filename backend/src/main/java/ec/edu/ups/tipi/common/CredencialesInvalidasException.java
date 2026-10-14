package ec.edu.ups.tipi.common;

public class CredencialesInvalidasException extends RuntimeException {
    public CredencialesInvalidasException() {
        super("Usuario o contraseña incorrectos, o cuenta temporalmente no disponible.");
    }
}
package ec.edu.ups.tipi.common;

public final class ReglasValidacion {

    private ReglasValidacion() {
    }

    public static final String USERNAME_REGEX = "^[A-Za-z0-9._-]{3,50}$";
    public static final String USERNAME_MSG =
            "El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo";

    public static final String PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{10,128}$";
    public static final String PASSWORD_MSG =
            "La contraseña debe tener entre 10 y 128 caracteres, con mayúscula, minúscula y número";
}
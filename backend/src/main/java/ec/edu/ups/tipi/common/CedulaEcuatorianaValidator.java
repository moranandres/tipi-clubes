package ec.edu.ups.tipi.common;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CedulaEcuatorianaValidator implements ConstraintValidator<CedulaEcuatoriana, String> {

    private static final int LONGITUD = 10;
    private static final int ULTIMA_PROVINCIA = 24;
    private static final int PROVINCIA_EXTERIOR = 30;
    private static final int TERCER_DIGITO_MAXIMO = 5;

    @Override
    public boolean isValid(String valor, ConstraintValidatorContext contexto) {
        return valor == null || valor.isBlank() || esValida(valor);
    }

    public static boolean esValida(String cedula) {
        if (cedula == null || cedula.length() != LONGITUD || !cedula.chars().allMatch(Character::isDigit)) {
            return false;
        }
        int provincia = Integer.parseInt(cedula.substring(0, 2));
        if ((provincia < 1 || provincia > ULTIMA_PROVINCIA) && provincia != PROVINCIA_EXTERIOR) {
            return false;
        }
        if (Character.getNumericValue(cedula.charAt(2)) > TERCER_DIGITO_MAXIMO) {
            return false;
        }
        int suma = 0;
        for (int indice = 0; indice < LONGITUD - 1; indice++) {
            int valor = Character.getNumericValue(cedula.charAt(indice)) * (indice % 2 == 0 ? 2 : 1);
            suma += valor > 9 ? valor - 9 : valor;
        }
        int verificador = (10 - suma % 10) % 10;
        return verificador == Character.getNumericValue(cedula.charAt(LONGITUD - 1));
    }
}

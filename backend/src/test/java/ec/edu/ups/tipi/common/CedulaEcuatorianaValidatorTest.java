package ec.edu.ups.tipi.common;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class CedulaEcuatorianaValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {"1710034065", "0926687856", "0912345675", "0950000000"})
    void aceptaCedulasConDigitoVerificadorCorrecto(String cedula) {
        assertThat(CedulaEcuatorianaValidator.esValida(cedula)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"1712345678", "0102030405", "2510034060", "0960000000", "091234567", "09123456789", "09A2345675", ""})
    void rechazaCedulasInvalidas(String cedula) {
        assertThat(CedulaEcuatorianaValidator.esValida(cedula)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"1712345678", "0102030405"})
    void elValidadorRechazaCedulasConVerificadorIncorrecto(String cedula) {
        assertThat(new CedulaEcuatorianaValidator().isValid(cedula, null)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " "})
    void elValidadorDejaLosVaciosAlControlDeObligatoriedad(String cedula) {
        assertThat(new CedulaEcuatorianaValidator().isValid(cedula, null)).isTrue();
    }
}

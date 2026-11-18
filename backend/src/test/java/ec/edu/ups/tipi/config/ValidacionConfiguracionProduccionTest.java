package ec.edu.ups.tipi.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ValidacionConfiguracionProduccionTest {

    private static final String SECRETO_FUERTE = "q7Vt9pZr2LmX4wNc8KbY1sHd6FgJ3aQe5TuR0oPiWzMnBvCxElKjHgFdSaQwErTy";
    private static final String WEB = "https://clubes.tipi.ec";

    @Test
    void aceptaUnaConfiguracionCompleta() {
        assertThat(ValidacionConfiguracionProduccion.problemas(SECRETO_FUERTE, WEB, WEB)).isEmpty();
    }

    @Test
    void rechazaElSecretoDeDesarrollo() {
        assertThat(ValidacionConfiguracionProduccion.problemas(
                "clave-solo-para-desarrollo-tipi-3-0-cambiala-en-produccion-xxxxxxxxxxxxxxxx", WEB, WEB))
                .anyMatch(problema -> problema.contains("ejemplo"));
    }

    @Test
    void rechazaUnSecretoCorto() {
        assertThat(ValidacionConfiguracionProduccion.problemas("corto", WEB, WEB))
                .anyMatch(problema -> problema.startsWith("JWT_SECRET debe tener"));
    }

    @Test
    void exigeLaUrlPublicaYLosOrigenes() {
        assertThat(ValidacionConfiguracionProduccion.problemas(SECRETO_FUERTE, "", ""))
                .hasSize(2);
        assertThat(ValidacionConfiguracionProduccion.problemas(SECRETO_FUERTE, WEB, "*"))
                .anyMatch(problema -> problema.contains("sin comodines"));
    }

    @Test
    void detieneElArranqueSiFaltaAlgo() {
        ValidacionConfiguracionProduccion validacion =
                new ValidacionConfiguracionProduccion(SECRETO_FUERTE, "", WEB);
        assertThatThrownBy(validacion::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("FRONTEND_BASE_URL");
    }
}

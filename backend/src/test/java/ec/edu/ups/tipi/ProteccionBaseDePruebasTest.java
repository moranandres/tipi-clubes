package ec.edu.ups.tipi;

import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.core.env.MapPropertySource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProteccionBaseDePruebasTest {

    @Test
    void aceptaSoloBasesQueTerminanEnTest() {
        assertThat(ProteccionBaseDePruebas.esBaseDePruebas("jdbc:postgresql://localhost:5432/tipi_clubes_test")).isTrue();
        assertThat(ProteccionBaseDePruebas.esBaseDePruebas("jdbc:postgresql://localhost:5432/tipi_clubes_test?ssl=false")).isTrue();
        assertThat(ProteccionBaseDePruebas.esBaseDePruebas("jdbc:postgresql://localhost:5432/tipi_clubes")).isFalse();
        assertThat(ProteccionBaseDePruebas.esBaseDePruebas("jdbc:postgresql://localhost:5432/tipi_clubes_b85")).isFalse();
        assertThat(ProteccionBaseDePruebas.esBaseDePruebas("jdbc:postgresql://localhost:5432/tipi_clubes?x=_test")).isFalse();
        assertThat(ProteccionBaseDePruebas.esBaseDePruebas("jdbc:postgresql://localhost:5432/_test")).isFalse();
        assertThat(ProteccionBaseDePruebas.esBaseDePruebas("")).isFalse();
        assertThat(ProteccionBaseDePruebas.esBaseDePruebas(null)).isFalse();
    }

    @Test
    void detieneElContextoSiApuntaALaBaseReal() {
        try (GenericApplicationContext contexto = contextoCon("jdbc:postgresql://localhost:5432/tipi_clubes")) {
            assertThatThrownBy(() -> new ProteccionBaseDePruebas().initialize(contexto))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("tipi_clubes");
        }
    }

    @Test
    void permiteElContextoSobreLaBaseDePruebas() {
        try (GenericApplicationContext contexto = contextoCon("jdbc:postgresql://localhost:5432/tipi_clubes_test")) {
            assertThatCode(() -> new ProteccionBaseDePruebas().initialize(contexto)).doesNotThrowAnyException();
        }
    }

    private GenericApplicationContext contextoCon(String url) {
        GenericApplicationContext contexto = new GenericApplicationContext();
        contexto.getEnvironment().getPropertySources()
                .addFirst(new MapPropertySource("prueba", Map.of("spring.datasource.url", url)));
        return contexto;
    }
}

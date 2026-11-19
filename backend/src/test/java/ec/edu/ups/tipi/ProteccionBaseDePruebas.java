package ec.edu.ups.tipi;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

public class ProteccionBaseDePruebas implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    static final String SUFIJO_BASE_DE_PRUEBAS = "_test";

    @Override
    public void initialize(ConfigurableApplicationContext contexto) {
        String url = contexto.getEnvironment().getProperty("spring.datasource.url", "");
        if (!esBaseDePruebas(url)) {
            throw new IllegalStateException("Las pruebas solo pueden conectarse a una base cuyo nombre termine en "
                    + SUFIJO_BASE_DE_PRUEBAS + " y se recibió '" + url
                    + "'. Active el perfil test con @ActiveProfiles(\"test\") y no defina SPRING_DATASOURCE_URL.");
        }
    }

    static boolean esBaseDePruebas(String url) {
        if (url == null || !url.startsWith("jdbc:postgresql:")) {
            return false;
        }
        String sinParametros = url.split("[?;]", 2)[0];
        String base = sinParametros.substring(sinParametros.lastIndexOf('/') + 1);
        return base.length() > SUFIJO_BASE_DE_PRUEBAS.length() && base.endsWith(SUFIJO_BASE_DE_PRUEBAS);
    }
}

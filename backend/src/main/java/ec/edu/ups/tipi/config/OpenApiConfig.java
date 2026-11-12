package ec.edu.ups.tipi.config;

import ec.edu.ups.tipi.common.ProblemaResponse;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.core.converter.ResolvedSchema;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.headers.Header;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String ESQUEMA_JWT = "bearer-jwt";
    private static final String RESPUESTA_PROBLEMA = "Problema";
    private static final String SUFIJO_CONTROLADOR = "Controller";

    @Bean
    public OpenAPI documentacionApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("TIPI 3.0 - API de gestión de clubes")
                        .version("v1")
                        .description("API REST del sistema de información para la gestión de clubes "
                                + "de robótica y programación del proyecto de vinculación TIPI 3.0."))
                .components(new Components()
                        .addSecuritySchemes(ESQUEMA_JWT, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA_JWT));
    }

    @Bean
    public OperationCustomizer identificadorDeOperacion() {
        return (operacion, metodo) -> {
            String recurso = metodo.getBeanType().getSimpleName().replace(SUFIJO_CONTROLADOR, "");
            String accion = metodo.getMethod().getName();
            operacion.setOperationId(Character.toLowerCase(recurso.charAt(0)) + recurso.substring(1)
                    + Character.toUpperCase(accion.charAt(0)) + accion.substring(1));
            return operacion;
        };
    }

    @Bean
    public OpenApiCustomizer respuestasComunes() {
        return documento -> {
            ResolvedSchema problema = ModelConverters.getInstance(true)
                    .readAllAsResolvedSchema(new AnnotatedType(ProblemaResponse.class));
            problema.referencedSchemas.forEach(documento.getComponents()::addSchemas);
            documento.getComponents().addResponses(RESPUESTA_PROBLEMA, new ApiResponse()
                    .description("Error descrito con el formato Problem Details")
                    .content(new Content().addMediaType("application/problem+json", new MediaType()
                            .schema(new Schema<>().$ref("#/components/schemas/ProblemaResponse")))));
            documento.getPaths().values().forEach(ruta -> ruta.readOperations().forEach(operacion -> {
                operacion.getResponses().addApiResponse("default",
                        new ApiResponse().$ref("#/components/responses/" + RESPUESTA_PROBLEMA));
                ApiResponse creado = operacion.getResponses().get("201");
                if (creado != null) {
                    Schema<String> url = new Schema<>();
                    url.addType("string");
                    url.setFormat("uri");
                    creado.addHeaderObject("Location", new Header()
                            .description("URL del recurso creado")
                            .schema(url));
                }
            }));
        };
    }
}

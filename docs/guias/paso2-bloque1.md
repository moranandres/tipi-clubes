# PASO 2 · Bloque 1: OpenAPI, CORS por entorno y contrato ResponseEntity

Este bloque deja lista la base del PASO 2 y aplica el contrato HTTP a la gestión institucional (instituciones, clubes, períodos y docentes). Los cambios ya están aplicados en tu equipo, en la rama `claude/project-thread-kgb12h`, y subidos a GitHub. La guía sirve para revisarlos y verificarlos.

## Qué cambia

| Antes | Ahora |
|---|---|
| Los controladores devolvían el DTO directo | Devuelven `ResponseEntity<DTO>`: `200` en consultas y cambios, `201` más `Location` en altas |
| Sin documentación de la API | `/v3/api-docs` (OpenAPI 3.1) y `/swagger-ui.html` con las 148 operaciones |
| CORS solo para `:5500` | Orígenes por variable `CORS_ALLOWED_ORIGINS`, con `:3000` y `:5500` por defecto |
| Sin pruebas de controladores | `PeriodoControllerTest` con 4 casos |

El frontend actual sigue funcionando igual: para él los códigos de estado no cambian.

## Paso 1. Cambiar a la rama del bloque

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git checkout claude/project-thread-kgb12h
```

## Paso 2. Dependencia de springdoc-openapi

Archivo: `backend/pom.xml`

Se agrega `springdoc-openapi-starter-webmvc-ui` 3.1.1, la versión compilada contra Spring Boot 4.1, que es la línea de tu proyecto (4.1.1). Genera el documento OpenAPI y sirve Swagger UI.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.1.1</version>
        <relativePath/>
    </parent>
    <groupId>ec.edu.ups</groupId>
    <artifactId>tipi-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name/>
    <description/>
    <url/>
    <licenses>
        <license/>
    </licenses>
    <developers>
        <developer/>
    </developers>
    <scm>
        <connection/>
        <developerConnection/>
        <tag/>
        <url/>
    </scm>
    <properties>
        <java.version>17</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-flyway</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>3.1.1</version>
        </dependency>

        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.6</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>

        <dependency>
            <groupId>org.apache.pdfbox</groupId>
            <artifactId>pdfbox</artifactId>
            <version>3.0.5</version>
        </dependency>
        <dependency>
            <groupId>com.google.zxing</groupId>
            <artifactId>core</artifactId>
            <version>3.5.3</version>
        </dependency>

        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-flyway-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <executions>
                    <execution>
                        <id>default-compile</id>
                        <phase>compile</phase>
                        <goals>
                            <goal>compile</goal>
                        </goals>
                        <configuration>
                            <annotationProcessorPaths>
                                <path>
                                    <groupId>org.projectlombok</groupId>
                                    <artifactId>lombok</artifactId>
                                </path>
                            </annotationProcessorPaths>
                        </configuration>
                    </execution>
                    <execution>
                        <id>default-testCompile</id>
                        <phase>test-compile</phase>
                        <goals>
                            <goal>testCompile</goal>
                        </goals>
                        <configuration>
                            <annotationProcessorPaths>
                                <path>
                                    <groupId>org.projectlombok</groupId>
                                    <artifactId>lombok</artifactId>
                                </path>
                            </annotationProcessorPaths>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>

</project>
```

## Paso 3. Configuración por variables de entorno

Archivo: `backend/src/main/resources/application.yml`

Cambios: puerto configurable con `SERVER_PORT`, lectura opcional de un archivo `backend/.env`, cabeceras de proxy (`forward-headers-strategy`) para que `Location` salga con el dominio correcto detrás de Next.js, orígenes CORS con `:3000` y `:5500` por defecto, y el bloque `springdoc` apagado salvo que `OPENAPI_ENABLED` lo active. Las tres líneas de contraseña aparecen aquí como `TU_VALOR_ACTUAL`: conserva los valores que ya tienes en tu archivo.

```yaml
server:
  port: ${SERVER_PORT:8080}
  forward-headers-strategy: framework
  tomcat:
    max-swallow-size: 10MB

spring:
  application:
    name: tipi-backend
  config:
    import: optional:file:.env[.properties]
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}
  autoconfigure:
    exclude: org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration
  datasource:
    url: jdbc:postgresql://localhost:5432/tipi_clubes
    username: postgres
    password: TU_VALOR_ACTUAL
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
  servlet:
    multipart:
      enabled: true
      max-file-size: 5MB
      max-request-size: 6MB
  mail:
    host: ${MAIL_HOST:localhost}
    port: ${MAIL_PORT:1025}
    username: ${MAIL_USERNAME:}
    password: TU_VALOR_ACTUAL
    default-encoding: UTF-8
    properties:
      mail:
        smtp:
          auth: ${MAIL_SMTP_AUTH:false}
          starttls:
            enable: ${MAIL_STARTTLS:false}
          connectiontimeout: 5000
          timeout: 5000
          writetimeout: 5000

tipi:
  security:
    jwt-secret: ${JWT_SECRET:clave-solo-para-desarrollo-tipi-3-0-cambiala-en-produccion}
    jwt-expiration-minutes: ${JWT_EXPIRATION_MINUTES:30}
    max-failed-attempts: 5
    lock-minutes: 15
    limpieza-cron: "${TOKENS_LIMPIEZA_CRON:0 0 3 * * *}"
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500}
  frontend:
    base-url: ${FRONTEND_BASE_URL:http://localhost:5500}
  recuperacion:
    remitente: "${MAIL_FROM:TIPI 3.0 <no-responder@tipi.local>}"
    minutos-validez: ${RECUPERACION_MINUTOS_VALIDEZ:30}
    max-por-cuenta-hora: 3
    max-por-ip-15-minutos: 10
  bootstrap:
    admin-password: TU_VALOR_ACTUAL
  storage:
    directorio: ${STORAGE_DIR:./uploads}

springdoc:
  api-docs:
    enabled: ${OPENAPI_ENABLED:false}
    path: /v3/api-docs
  swagger-ui:
    enabled: ${OPENAPI_ENABLED:false}
    path: /swagger-ui.html
    operations-sorter: alpha
    tags-sorter: alpha
  paths-to-match: /api/**
  default-produces-media-type: application/json
```

## Paso 4. Perfil de desarrollo

Archivo: `backend/src/main/resources/application-dev.yml`

En desarrollo la documentación queda encendida por defecto.

```yaml
spring:
  flyway:
    locations: classpath:db/migration,classpath:db/seed-dev

springdoc:
  api-docs:
    enabled: ${OPENAPI_ENABLED:true}
  swagger-ui:
    enabled: ${OPENAPI_ENABLED:true}
```

## Paso 5. Plantilla de variables de entorno

Archivo: `backend/.env.example`

Copia este archivo como `backend/.env` cuando quieras cambiar valores sin tocar el YAML. `.env` ya está en `.gitignore`. La variable `NEXT_PUBLIC_API_URL` pertenece al frontend de Next.js (irá en su `.env.local` en el PASO 3); del lado del backend, lo que le da acceso es `CORS_ALLOWED_ORIGINS`.

```properties
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500
FRONTEND_BASE_URL=http://localhost:3000
OPENAPI_ENABLED=true
```

## Paso 6. Respuestas HTTP reutilizables

Archivo: `backend/src/main/java/ec/edu/ups/tipi/common/Respuestas.java`

`creado` arma el `201 Created` con la cabecera `Location` apuntando a la URL del recurso nuevo (ruta actual más `/{id}`), y `sinContenido` devuelve el `204` de las bajas.

```java
package ec.edu.ups.tipi.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

public final class Respuestas {

    private Respuestas() {
    }

    public static <T> ResponseEntity<T> creado(Object id, T cuerpo) {
        URI ubicacion = ServletUriComponentsBuilder.fromCurrentRequestUri()
                .path("/{id}")
                .buildAndExpand(id)
                .toUri();
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    public static ResponseEntity<Void> sinContenido() {
        return ResponseEntity.noContent().build();
    }
}
```

## Paso 7. Documento OpenAPI con esquema JWT

Archivo: `backend/src/main/java/ec/edu/ups/tipi/config/OpenApiConfig.java`

Define título, versión y el esquema `bearer-jwt`, de modo que Swagger UI muestre el botón Authorize y los tipos generados sepan que la API usa token.

```java
package ec.edu.ups.tipi.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String ESQUEMA_JWT = "bearer-jwt";

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
}
```

## Paso 8. Seguridad y CORS

Archivo: `backend/src/main/java/ec/edu/ups/tipi/config/SecurityConfig.java`

Se permite leer sin token `/v3/api-docs` y `/swagger-ui`, los orígenes CORS se limpian de espacios y se exponen las cabeceras `Location` y `Content-Disposition` para que el navegador pueda leerlas desde otro origen.

```java
package ec.edu.ups.tipi.config;

import ec.edu.ups.tipi.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${tipi.cors.allowed-origins}")
    private String[] origenesPermitidos;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.POST,
                        "/api/auth/login",
                        "/api/auth/recuperar",
                        "/api/auth/restablecer",
                        "/api/auth/restablecer/validar").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/publico/certificados/*").permitAll()
                .requestMatchers(HttpMethod.GET,
                        "/v3/api-docs",
                        "/v3/api-docs/**",
                        "/swagger-ui.html",
                        "/swagger-ui/**").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(e -> e.authenticationEntryPoint(
                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuracion = new CorsConfiguration();
        configuracion.setAllowedOrigins(Arrays.stream(origenesPermitidos)
                .map(String::trim)
                .filter(origen -> !origen.isEmpty())
                .toList());
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuracion.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        configuracion.setExposedHeaders(List.of("Location", "Content-Disposition"));
        configuracion.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource origen = new UrlBasedCorsConfigurationSource();
        origen.registerCorsConfiguration("/api/**", configuracion);
        return origen;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
```

## Paso 9. Controlador de instituciones

Archivo: `backend/src/main/java/ec/edu/ups/tipi/instituciones/InstitucionController.java`

Todos los métodos devuelven `ResponseEntity<DTO>`: `200` en consultas y actualizaciones, `201` más `Location` en el alta. `@ResponseStatus(CREATED)` se conserva para que el documento OpenAPI declare el 201.

```java
package ec.edu.ups.tipi.instituciones;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.instituciones.dto.InstitucionContactoRequest;
import ec.edu.ups.tipi.instituciones.dto.InstitucionRequest;
import ec.edu.ups.tipi.instituciones.dto.InstitucionResponse;
import ec.edu.ups.tipi.instituciones.dto.ResponsableRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Instituciones", description = "Instituciones educativas adheridas, contacto y responsable institucional")
@RestController
@RequestMapping("/api/instituciones")
@RequiredArgsConstructor
public class InstitucionController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";

    private final InstitucionService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<InstitucionResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String provincia,
            @RequestParam(required = false) String canton,
            @RequestParam(required = false) EstadoAdhesion estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, provincia, canton, estado, pagina, tamano, usuario));
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<InstitucionResponse> obtener(@PathVariable Long id,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InstitucionResponse> crear(@Valid @RequestBody InstitucionRequest request) {
        InstitucionResponse creada = service.crear(request);
        return Respuestas.creado(creada.id(), creada);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InstitucionResponse> actualizar(@PathVariable Long id,
                                                          @Valid @RequestBody InstitucionRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    @PutMapping("/{id}/contacto")
    @PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL')")
    public ResponseEntity<InstitucionResponse> actualizarContacto(
            @PathVariable Long id,
            @Valid @RequestBody InstitucionContactoRequest request,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizarContacto(id, request, usuario));
    }

    @PutMapping("/{id}/responsable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InstitucionResponse> asignarResponsable(@PathVariable Long id,
                                                                  @Valid @RequestBody ResponsableRequest request) {
        return ResponseEntity.ok(service.asignarResponsable(id, request.usuarioId()));
    }
}
```

## Paso 10. Controlador de clubes

Archivo: `backend/src/main/java/ec/edu/ups/tipi/clubes/ClubController.java`

Mismo contrato aplicado a clubes.

```java
package ec.edu.ups.tipi.clubes;

import ec.edu.ups.tipi.clubes.dto.CambioEstadoClubRequest;
import ec.edu.ups.tipi.clubes.dto.CierreClubResponse;
import ec.edu.ups.tipi.clubes.dto.ClubActualizarRequest;
import ec.edu.ups.tipi.clubes.dto.ClubCrearRequest;
import ec.edu.ups.tipi.clubes.dto.ClubResponse;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Clubes", description = "Clubes de robótica y programación, cambios de estado y cierre")
@RestController
@RequestMapping("/api/clubes")
@RequiredArgsConstructor
public class ClubController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final ClubService service;
    private final CierreClubService cierre;

    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<ClubResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) EstadoClub estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, periodoId, estado, pagina, tamano, usuario));
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ClubResponse> obtener(@PathVariable Long id,
                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @GetMapping("/{id}/cierre")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<CierreClubResponse> previsualizarCierre(
            @PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(cierre.previsualizar(id, usuario));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> crear(@Valid @RequestBody ClubCrearRequest request,
                                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        ClubResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> actualizar(@PathVariable Long id,
                                                   @Valid @RequestBody ClubActualizarRequest request,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<ClubResponse> cambiarEstado(@PathVariable Long id,
                                                      @Valid @RequestBody CambioEstadoClubRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request, usuario));
    }
}
```

## Paso 11. Controlador de períodos

Archivo: `backend/src/main/java/ec/edu/ups/tipi/periodos/PeriodoController.java`

Mismo contrato aplicado a períodos académicos.

```java
package ec.edu.ups.tipi.periodos;

import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.periodos.dto.PeriodoRequest;
import ec.edu.ups.tipi.periodos.dto.PeriodoResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Períodos académicos", description = "Períodos académicos y activación del período vigente")
@RestController
@RequestMapping("/api/periodos")
@RequiredArgsConstructor
public class PeriodoController {

    private final PeriodoService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<List<PeriodoResponse>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponse> crear(@Valid @RequestBody PeriodoRequest request) {
        PeriodoResponse creado = service.crear(request);
        return Respuestas.creado(creado.id(), creado);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponse> actualizar(@PathVariable Integer id,
                                                      @Valid @RequestBody PeriodoRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    @PatchMapping("/{id}/activar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponse> activar(@PathVariable Integer id) {
        return ResponseEntity.ok(service.activar(id));
    }
}
```

## Paso 12. Controlador de docentes

Archivo: `backend/src/main/java/ec/edu/ups/tipi/docentes/DocenteController.java`

Mismo contrato aplicado a docentes.

```java
package ec.edu.ups.tipi.docentes;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.docentes.dto.CuentaDocenteResponse;
import ec.edu.ups.tipi.docentes.dto.DocenteActualizarRequest;
import ec.edu.ups.tipi.docentes.dto.DocenteCrearRequest;
import ec.edu.ups.tipi.docentes.dto.DocenteResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.dto.EstadoRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Docentes", description = "Docentes coordinadores de club y sus cuentas de usuario")
@RestController
@RequestMapping("/api/docentes")
@RequiredArgsConstructor
public class DocenteController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String ESCRITURA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final DocenteService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<DocenteResponse>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, activo, pagina, tamano, usuario));
    }

    @GetMapping("/cuentas-disponibles")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<List<CuentaDocenteResponse>> cuentasDisponibles(
            @RequestParam Long institucionId,
            @RequestParam(required = false) Long docenteId,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cuentasDisponibles(institucionId, docenteId, usuario));
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<DocenteResponse> obtener(@PathVariable Long id,
                                                   @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<DocenteResponse> crear(@Valid @RequestBody DocenteCrearRequest request,
                                                 @AuthenticationPrincipal UsuarioPrincipal usuario) {
        DocenteResponse creado = service.crear(request, usuario);
        return Respuestas.creado(creado.id(), creado);
    }

    @PutMapping("/{id}")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<DocenteResponse> actualizar(@PathVariable Long id,
                                                      @Valid @RequestBody DocenteActualizarRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(id, request, usuario));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(ESCRITURA)
    public ResponseEntity<DocenteResponse> cambiarEstado(@PathVariable Long id,
                                                         @Valid @RequestBody EstadoRequest request,
                                                         @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cambiarEstado(id, request.activo(), usuario));
    }
}
```

## Paso 13. Prueba automática del contrato

Archivo: `backend/src/test/java/ec/edu/ups/tipi/periodos/PeriodoControllerTest.java`

Primera prueba del proyecto sobre un controlador: comprueba el `201` con `Location`, el `200` sin `Location` y el `400` ante datos inválidos, sin tocar la base de datos.

```java
package ec.edu.ups.tipi.periodos;

import ec.edu.ups.tipi.periodos.dto.PeriodoRequest;
import ec.edu.ups.tipi.periodos.dto.PeriodoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PeriodoControllerTest {

    private static final String CUERPO =
            "{\"nombre\":\"2027-2028\",\"fechaInicio\":\"2027-09-01\",\"fechaFin\":\"2028-07-31\"}";

    private PeriodoService service;
    private MockMvc mockMvc;

    @BeforeEach
    void preparar() {
        service = mock(PeriodoService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new PeriodoController(service)).build();
    }

    @Test
    void crearRespondeCreadoConUbicacionDelRecurso() throws Exception {
        when(service.crear(any(PeriodoRequest.class))).thenReturn(periodo(7));

        mockMvc.perform(post("/api/periodos").contentType(MediaType.APPLICATION_JSON).content(CUERPO))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/periodos/7"))
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.nombre").value("2027-2028"));
    }

    @Test
    void listarRespondeOkConLaLista() throws Exception {
        when(service.listar()).thenReturn(List.of(periodo(7)));

        mockMvc.perform(get("/api/periodos"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$[0].id").value(7));
    }

    @Test
    void actualizarRespondeOkSinUbicacion() throws Exception {
        when(service.actualizar(eq(7), any(PeriodoRequest.class))).thenReturn(periodo(7));

        mockMvc.perform(put("/api/periodos/7").contentType(MediaType.APPLICATION_JSON).content(CUERPO))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void crearConDatosInvalidosRespondeSolicitudIncorrecta() throws Exception {
        mockMvc.perform(post("/api/periodos").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    private PeriodoResponse periodo(int id) {
        return new PeriodoResponse(id, "2027-2028", LocalDate.of(2027, 9, 1), LocalDate.of(2028, 7, 31), false);
    }
}
```

## Paso 14. Reiniciar el backend

Detén el backend que tienes corriendo (Ctrl + C en su terminal) y vuelve a levantarlo desde la carpeta `backend`:

```bash
./mvnw spring-boot:run
```

Espera la línea `Started TipiBackendApplication`.

## Paso 15. Verificar la documentación

1. Abre `http://localhost:8080/swagger-ui.html`.
2. Ejecuta `POST /api/auth/login` con tu usuario y copia el valor de `accessToken`.
3. Pulsa **Authorize**, pega el token y confirma.
4. Prueba `GET /api/clubes`: debe responder `200`.
5. Revisa que `POST /api/clubes` declare la respuesta `201`.

## Paso 16. Ejecutar la prueba automática

Desde la carpeta `backend`:

```bash
./mvnw -Dtest=PeriodoControllerTest test
```

Debe terminar con `Tests run: 4, Failures: 0, Errors: 0`.

## Resultado de mis comprobaciones

Las hice en una segunda instancia en el puerto 8081, sin tocar la tuya:

- `/v3/api-docs` responde 200 con 108 rutas, 148 operaciones y 189 esquemas.
- Los cuatro `POST` de alta figuran con `201` en el documento.
- Preflight CORS desde `http://localhost:3000`: permitido, con `Location` expuesta. Desde un origen no listado: 403.
- Sin token: 401. Un docente que consulta una institución ajena recibe 403; la propia, 200.
- `PeriodoControllerTest`: 4 de 4 en verde.

## Lo que sigue en el PASO 2

- Bloque 2: `GET /api/panel/resumen` por rol e institución, y `GET /api/publico/estadisticas`.
- Bloque 3: búsqueda ligera `?q=` de clubes e instituciones.
- Bloques 4 a 6: el mismo contrato `ResponseEntity` en los 26 controladores restantes, con sus etiquetas de documentación.
- Cierre: generación de los tipos TypeScript desde `/v3/api-docs`.

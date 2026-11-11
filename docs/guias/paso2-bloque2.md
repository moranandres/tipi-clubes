# PASO 2 · Bloque 2: resumen del panel y estadísticas públicas

Este bloque agrega dos endpoints nuevos sin modificar ninguno de los existentes. Los cambios ya están aplicados en tu equipo, en la rama `claude/project-thread-kgb12h`, y subidos a GitHub.

## Qué agrega

| Endpoint | Acceso | Para qué sirve |
|---|---|---|
| `GET /api/panel/resumen` | Los cinco roles, con token | Reemplaza las 6 llamadas del panel por 1 y añade los pendientes de trabajo y el semáforo |
| `GET /api/publico/estadisticas` | Público, sin token | Cifras agregadas reales para la futura landing |

## Cómo se resuelve el alcance en el servidor

El cliente no envía ningún filtro: el servidor decide qué contar a partir del token.

| Rol | Qué cuenta el panel |
|---|---|
| Administrador | Todo el proyecto, más los usuarios activos |
| Coordinador TIPI y Consulta | Todo el proyecto, sin usuarios |
| Responsable institucional | Solo su institución |
| Docente | Solo los clubes que coordina y las sesiones de las que es responsable |

## Ejemplo de respuesta del panel (administrador, datos reales de tu base)

```json
{
  "rol": "ADMIN",
  "alcanceGlobal": true,
  "institucionId": null,
  "institucionNombre": null,
  "periodoActivo": { "id": 1, "nombre": "2026-2027", "fechaInicio": "2026-09-01", "fechaFin": "2027-07-31" },
  "fechaCorte": "2026-11-11",
  "indicadores": { "instituciones": 7, "clubes": 54, "clubesActivos": 46, "docentesActivos": 47, "usuariosActivos": 120 },
  "pendientes": { "sesionesSinEjecucion": 7, "sesionesProximosSieteDias": 8, "solicitudesInscripcionPorResolver": 6, "solicitudesRetiroPorResolver": 2 },
  "seguimiento": { "totalClubes": 47, "clubesAdecuados": 13, "clubesEnRiesgo": 0, "clubesCriticos": 3, "clubesSinDatos": 31 },
  "generadoEn": "2026-11-11T16:52:18Z"
}
```

## Ejemplo de respuesta pública (datos reales de tu base)

```json
{
  "periodoActivo": "2026-2027",
  "instituciones": 7,
  "institucionesConClubes": 2,
  "clubes": 54,
  "clubesActivos": 46,
  "docentesActivos": 47,
  "estudiantesParticipantes": 77,
  "sesionesEjecutadas": 26,
  "horasEjecutadas": 50,
  "evidenciasRegistradas": 5,
  "proyectos": 0,
  "certificadosEmitidos": 2,
  "actualizadoEn": "2026-11-11T16:52:17Z"
}
```

## Paso 1. Actualizar la rama

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git checkout claude/project-thread-kgb12h
```

## Paso 2. Respuesta del panel

Archivo: `backend/src/main/java/ec/edu/ups/tipi/panel/dto/PanelResumenResponse.java`

Archivo nuevo. Un solo `record` con cuatro bloques: el período activo, los indicadores (los mismos seis del panel actual), los pendientes de trabajo y el semáforo de seguimiento. `usuariosActivos` solo viaja con valor para el administrador; para los demás roles es `null`.

```java
package ec.edu.ups.tipi.panel.dto;

import java.time.Instant;
import java.time.LocalDate;

public record PanelResumenResponse(
        String rol,
        boolean alcanceGlobal,
        Long institucionId,
        String institucionNombre,
        PeriodoPanel periodoActivo,
        LocalDate fechaCorte,
        IndicadoresPanel indicadores,
        PendientesPanel pendientes,
        SeguimientoPanel seguimiento,
        Instant generadoEn) {

    public record PeriodoPanel(Integer id, String nombre, LocalDate fechaInicio, LocalDate fechaFin) {
    }

    public record IndicadoresPanel(long instituciones, long clubes, long clubesActivos, long docentesActivos,
                                   Long usuariosActivos) {
    }

    public record PendientesPanel(long sesionesSinEjecucion, long sesionesProximosSieteDias,
                                  long solicitudesInscripcionPorResolver, long solicitudesRetiroPorResolver) {
    }

    public record SeguimientoPanel(long totalClubes, long clubesAdecuados, long clubesEnRiesgo, long clubesCriticos,
                                   long clubesSinDatos) {
    }
}
```

## Paso 3. Servicio del panel

Archivo: `backend/src/main/java/ec/edu/ups/tipi/panel/PanelService.java`

Archivo nuevo. No escribe consultas propias: llama a los servicios que ya existen pasándoles el usuario autenticado, de modo que cada cifra usa exactamente la misma regla de alcance que su pantalla (el administrador, el coordinador y consulta ven todo; el responsable ve su institución; el docente ve solo los clubes que coordina). Si no hay período activo, el semáforo se omite en lugar de fallar.

```java
package ec.edu.ups.tipi.panel;

import ec.edu.ups.tipi.actividades.ActividadService;
import ec.edu.ups.tipi.actividades.EstadoActividad;
import ec.edu.ups.tipi.clubes.ClubService;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.docentes.DocenteService;
import ec.edu.ups.tipi.inscripciones.EstadoSolicitud;
import ec.edu.ups.tipi.inscripciones.SolicitudInscripcionService;
import ec.edu.ups.tipi.instituciones.InstitucionService;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse.IndicadoresPanel;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse.PendientesPanel;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse.PeriodoPanel;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse.SeguimientoPanel;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.retiros.EstadoRetiro;
import ec.edu.ups.tipi.retiros.SolicitudRetiroService;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.SeguimientoService;
import ec.edu.ups.tipi.seguimiento.dto.ResumenSeguimientoResponse;
import ec.edu.ups.tipi.usuarios.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class PanelService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final String ROL_ADMIN = "ADMIN";
    private static final int DIAS_PROXIMOS = 7;

    private final AlcanceInstitucional alcance;
    private final PeriodoRepository periodoRepository;
    private final InstitucionService institucionService;
    private final ClubService clubService;
    private final DocenteService docenteService;
    private final UsuarioService usuarioService;
    private final ActividadService actividadService;
    private final SolicitudInscripcionService solicitudInscripcionService;
    private final SolicitudRetiroService solicitudRetiroService;
    private final SeguimientoService seguimientoService;

    @Transactional(readOnly = true)
    public PanelResumenResponse resumen(UsuarioPrincipal usuario) {
        boolean global = alcance.esGlobal(usuario);
        Long institucionId = global ? null : alcance.institucionPropia(usuario);
        String institucionNombre = institucionId == null
                ? null
                : institucionService.obtener(institucionId, usuario).nombre();
        PeriodoAcademico periodo = periodoRepository.findByActivoTrue().orElse(null);
        LocalDate hoy = LocalDate.now(ZONA);

        return new PanelResumenResponse(
                usuario.getRolCodigo(),
                global,
                institucionId,
                institucionNombre,
                periodo == null ? null : new PeriodoPanel(periodo.getId(), periodo.getNombre(),
                        periodo.getFechaInicio(), periodo.getFechaFin()),
                hoy,
                indicadores(usuario),
                pendientes(usuario, hoy),
                periodo == null ? null : seguimiento(usuario),
                Instant.now());
    }

    private IndicadoresPanel indicadores(UsuarioPrincipal usuario) {
        long instituciones = institucionService.listar(null, null, null, null, 0, 1, usuario).totalElementos();
        long clubes = clubService.listar(null, null, null, null, 0, 1, usuario).totalElementos();
        long clubesActivos = clubService.listar(null, null, null, EstadoClub.ACTIVO, 0, 1, usuario).totalElementos();
        long docentesActivos = docenteService.listar(null, null, true, 0, 1, usuario).totalElementos();
        Long usuariosActivos = ROL_ADMIN.equals(usuario.getRolCodigo())
                ? usuarioService.listar(null, null, null, true, 0, 1).totalElementos()
                : null;
        return new IndicadoresPanel(instituciones, clubes, clubesActivos, docentesActivos, usuariosActivos);
    }

    private PendientesPanel pendientes(UsuarioPrincipal usuario, LocalDate hoy) {
        long sinEjecucion = actividadService.listar(null, null, null, null, null, null, null, null,
                true, false, 0, 1, usuario).totalElementos();
        long proximas = actividadService.listar(null, null, null, null, null, EstadoActividad.PLANIFICADA, hoy,
                hoy.plusDays(DIAS_PROXIMOS), false, true, 0, 1, usuario).totalElementos();
        long inscripciones = solicitudesInscripcion(EstadoSolicitud.PENDIENTE, usuario)
                + solicitudesInscripcion(EstadoSolicitud.EN_REVISION, usuario);
        long retiros = solicitudRetiroService.listar(null, EstadoRetiro.PENDIENTE, null, null, null, null, 0, 1,
                usuario).totalElementos();
        return new PendientesPanel(sinEjecucion, proximas, inscripciones, retiros);
    }

    private long solicitudesInscripcion(EstadoSolicitud estado, UsuarioPrincipal usuario) {
        return solicitudInscripcionService.listar(null, estado, null, null, null, null, null, 0, 1, usuario)
                .totalElementos();
    }

    private SeguimientoPanel seguimiento(UsuarioPrincipal usuario) {
        ResumenSeguimientoResponse resumen = seguimientoService.resumen(null, null, null, null, usuario);
        return new SeguimientoPanel(resumen.totalClubes(), resumen.clubesAdecuados(), resumen.clubesEnRiesgo(),
                resumen.clubesCriticos(), resumen.clubesSinDatos());
    }
}
```

## Paso 4. Controlador del panel

Archivo: `backend/src/main/java/ec/edu/ups/tipi/panel/PanelController.java`

Archivo nuevo. Expone `GET /api/panel/resumen` para los cinco roles y marca la respuesta como `no-store` porque depende de quién consulta.

```java
package ec.edu.ups.tipi.panel;

import ec.edu.ups.tipi.panel.dto.PanelResumenResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Panel", description = "Resumen del panel principal según el rol y la institución del usuario")
@RestController
@RequestMapping("/api/panel")
@RequiredArgsConstructor
public class PanelController {

    private final PanelService service;

    @Operation(summary = "Indicadores, pendientes y semáforo de seguimiento del usuario autenticado")
    @GetMapping("/resumen")
    @PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
    public ResponseEntity<PanelResumenResponse> resumen(@AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.resumen(usuario));
    }
}
```

## Paso 5. Respuesta de las estadísticas públicas

Archivo: `backend/src/main/java/ec/edu/ups/tipi/publico/dto/EstadisticasPublicasResponse.java`

Archivo nuevo. Solo contiene conteos globales del proyecto: ningún nombre, cédula, institución específica ni desglose que permita identificar a un estudiante.

```java
package ec.edu.ups.tipi.publico.dto;

import java.time.Instant;

public record EstadisticasPublicasResponse(
        String periodoActivo,
        long instituciones,
        long institucionesConClubes,
        long clubes,
        long clubesActivos,
        long docentesActivos,
        long estudiantesParticipantes,
        long sesionesEjecutadas,
        long horasEjecutadas,
        long evidenciasRegistradas,
        long proyectos,
        long certificadosEmitidos,
        Instant actualizadoEn) {
}
```

## Paso 6. Consulta de agregados

Archivo: `backend/src/main/java/ec/edu/ups/tipi/publico/EstadisticasPublicasRepository.java`

Archivo nuevo. Una única consulta SQL trae los doce valores en un solo viaje a PostgreSQL. Las horas se calculan sumando la duración de las sesiones ejecutadas.

```java
package ec.edu.ups.tipi.publico;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

@Repository
public class EstadisticasPublicasRepository {

    private static final String CONSULTA = """
            select
              (select p.nombre from periodos_academicos p where p.activo order by p.fecha_inicio desc limit 1),
              (select count(*) from instituciones),
              (select count(distinct c.institucion_id) from clubes c where c.estado in ('PLANIFICADO', 'ACTIVO')),
              (select count(*) from clubes),
              (select count(*) from clubes c where c.estado = 'ACTIVO'),
              (select count(*) from docentes d where d.activo),
              (select count(distinct i.estudiante_id) from inscripciones i where i.estado = 'ACTIVA'),
              (select count(*) from actividades a where a.estado = 'EJECUTADA'),
              (select coalesce(sum(extract(epoch from (a.hora_fin - a.hora_inicio))), 0) / 3600
                 from actividades a where a.estado = 'EJECUTADA'),
              (select count(*) from evidencias e where e.estado = 'ACTIVA'),
              (select count(*) from proyectos pr where pr.estado <> 'CANCELADO'),
              (select count(*) from certificados ce where ce.estado = 'EMITIDO')
            """;

    @PersistenceContext
    private EntityManager entityManager;

    public Object[] agregados() {
        return (Object[]) entityManager.createNativeQuery(CONSULTA).getSingleResult();
    }
}
```

## Paso 7. Servicio con memoria temporal

Archivo: `backend/src/main/java/ec/edu/ups/tipi/publico/EstadisticasPublicasService.java`

Archivo nuevo. Como el endpoint es público, guarda el último resultado durante 300 segundos (configurable). Así, aunque la landing reciba muchas visitas, la base de datos se consulta como máximo una vez cada cinco minutos.

```java
package ec.edu.ups.tipi.publico;

import ec.edu.ups.tipi.publico.dto.EstadisticasPublicasResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class EstadisticasPublicasService {

    private final EstadisticasPublicasRepository repository;
    private final Duration vigencia;

    private volatile EstadisticasPublicasResponse ultima;

    public EstadisticasPublicasService(
            EstadisticasPublicasRepository repository,
            @Value("${tipi.publico.estadisticas-cache-segundos}") long segundosDeVigencia) {
        this.repository = repository;
        this.vigencia = Duration.ofSeconds(Math.max(segundosDeVigencia, 0));
    }

    public Duration vigencia() {
        return vigencia;
    }

    @Transactional(readOnly = true)
    public EstadisticasPublicasResponse obtener() {
        EstadisticasPublicasResponse actual = ultima;
        Instant ahora = Instant.now();
        if (actual != null && ahora.isBefore(actual.actualizadoEn().plus(vigencia))) {
            return actual;
        }
        EstadisticasPublicasResponse nueva = calcular(ahora);
        ultima = nueva;
        return nueva;
    }

    private EstadisticasPublicasResponse calcular(Instant ahora) {
        Object[] fila = repository.agregados();
        return new EstadisticasPublicasResponse(
                (String) fila[0],
                numero(fila[1]),
                numero(fila[2]),
                numero(fila[3]),
                numero(fila[4]),
                numero(fila[5]),
                numero(fila[6]),
                numero(fila[7]),
                Math.round(((Number) fila[8]).doubleValue()),
                numero(fila[9]),
                numero(fila[10]),
                numero(fila[11]),
                ahora);
    }

    private long numero(Object valor) {
        return ((Number) valor).longValue();
    }
}
```

## Paso 8. Controlador público

Archivo: `backend/src/main/java/ec/edu/ups/tipi/publico/EstadisticasPublicasController.java`

Archivo nuevo. Expone `GET /api/publico/estadisticas` sin autenticación, con `Cache-Control: public, max-age=300`. `@SecurityRequirements` vacío hace que en la documentación aparezca sin candado.

```java
package ec.edu.ups.tipi.publico;

import ec.edu.ups.tipi.publico.dto.EstadisticasPublicasResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Público", description = "Información agregada del proyecto disponible sin iniciar sesión")
@RestController
@RequestMapping("/api/publico/estadisticas")
@RequiredArgsConstructor
public class EstadisticasPublicasController {

    private final EstadisticasPublicasService service;

    @Operation(summary = "Cifras agregadas del proyecto TIPI 3.0, sin datos personales")
    @SecurityRequirements
    @GetMapping
    public ResponseEntity<EstadisticasPublicasResponse> obtener() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(service.vigencia()).cachePublic())
                .body(service.obtener());
    }
}
```

## Paso 9. Seguridad

Archivo: `backend/src/main/java/ec/edu/ups/tipi/config/SecurityConfig.java`

Archivo modificado. Se agrega `/api/publico/estadisticas` a las rutas `GET` que no requieren token. El resto queda igual que en el bloque 1.

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
                .requestMatchers(HttpMethod.GET,
                        "/api/publico/certificados/*",
                        "/api/publico/estadisticas").permitAll()
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

## Paso 10. Configuración

Archivo: `backend/src/main/resources/application.yml`

Archivo modificado. Se agrega `tipi.publico.estadisticas-cache-segundos`, que se puede cambiar con la variable `PUBLIC_STATS_CACHE_SECONDS`. Las contraseñas aparecen aquí como `TU_VALOR_ACTUAL`: conserva las que ya tienes.

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
  publico:
    estadisticas-cache-segundos: ${PUBLIC_STATS_CACHE_SECONDS:300}

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

## Paso 11. Plantilla de variables de entorno

Archivo: `backend/.env.example`

Archivo modificado. Se documenta la nueva variable.

```properties
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500
FRONTEND_BASE_URL=http://localhost:3000
OPENAPI_ENABLED=true
PUBLIC_STATS_CACHE_SECONDS=300
```

## Paso 12. Pruebas del panel

Archivo: `backend/src/test/java/ec/edu/ups/tipi/panel/PanelServiceTest.java`

Archivo nuevo. Cinco casos: el administrador recibe alcance global y usuarios activos; el responsable recibe su institución y no consulta usuarios; el docente consulta con su propio alcance; un usuario sin institución es rechazado; sin período activo no se calcula el semáforo.

```java
package ec.edu.ups.tipi.panel;

import ec.edu.ups.tipi.actividades.ActividadService;
import ec.edu.ups.tipi.clubes.ClubService;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.docentes.DocenteService;
import ec.edu.ups.tipi.inscripciones.EstadoSolicitud;
import ec.edu.ups.tipi.inscripciones.SolicitudInscripcionService;
import ec.edu.ups.tipi.instituciones.InstitucionService;
import ec.edu.ups.tipi.instituciones.dto.InstitucionResponse;
import ec.edu.ups.tipi.panel.dto.PanelResumenResponse;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.retiros.EstadoRetiro;
import ec.edu.ups.tipi.retiros.SolicitudRetiroService;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.SeguimientoService;
import ec.edu.ups.tipi.seguimiento.dto.ResumenSeguimientoResponse;
import ec.edu.ups.tipi.usuarios.Rol;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PanelServiceTest {

    private PeriodoRepository periodoRepository;
    private InstitucionService institucionService;
    private ClubService clubService;
    private DocenteService docenteService;
    private UsuarioService usuarioService;
    private ActividadService actividadService;
    private SolicitudInscripcionService solicitudInscripcionService;
    private SolicitudRetiroService solicitudRetiroService;
    private SeguimientoService seguimientoService;
    private PanelService service;

    @BeforeEach
    void preparar() {
        periodoRepository = mock(PeriodoRepository.class);
        institucionService = mock(InstitucionService.class);
        clubService = mock(ClubService.class);
        docenteService = mock(DocenteService.class);
        usuarioService = mock(UsuarioService.class);
        actividadService = mock(ActividadService.class);
        solicitudInscripcionService = mock(SolicitudInscripcionService.class);
        solicitudRetiroService = mock(SolicitudRetiroService.class);
        seguimientoService = mock(SeguimientoService.class);
        service = new PanelService(new AlcanceInstitucional(), periodoRepository, institucionService, clubService,
                docenteService, usuarioService, actividadService, solicitudInscripcionService,
                solicitudRetiroService, seguimientoService);

        when(periodoRepository.findByActivoTrue()).thenReturn(Optional.of(periodo()));
        when(institucionService.listar(any(), any(), any(), any(), anyInt(), anyInt(), any()))
                .thenReturn(pagina(7));
        when(institucionService.obtener(eq(1L), any())).thenReturn(institucion());
        when(clubService.listar(any(), any(), any(), isNull(), anyInt(), anyInt(), any()))
                .thenReturn(pagina(54));
        when(clubService.listar(any(), any(), any(), eq(EstadoClub.ACTIVO), anyInt(), anyInt(), any()))
                .thenReturn(pagina(46));
        when(docenteService.listar(any(), any(), eq(true), anyInt(), anyInt(), any()))
                .thenReturn(pagina(47));
        when(usuarioService.listar(any(), any(), any(), eq(true), anyInt(), anyInt()))
                .thenReturn(pagina(120));
        when(actividadService.listar(any(), any(), any(), any(), any(), any(), any(), any(), eq(true),
                anyBoolean(), anyInt(), anyInt(), any())).thenReturn(pagina(7));
        when(actividadService.listar(any(), any(), any(), any(), any(), any(), any(), any(), eq(false),
                anyBoolean(), anyInt(), anyInt(), any())).thenReturn(pagina(8));
        when(solicitudInscripcionService.listar(any(), eq(EstadoSolicitud.PENDIENTE), any(), any(), any(), any(),
                any(), anyInt(), anyInt(), any())).thenReturn(pagina(3));
        when(solicitudInscripcionService.listar(any(), eq(EstadoSolicitud.EN_REVISION), any(), any(), any(), any(),
                any(), anyInt(), anyInt(), any())).thenReturn(pagina(2));
        when(solicitudRetiroService.listar(any(), eq(EstadoRetiro.PENDIENTE), any(), any(), any(), any(),
                anyInt(), anyInt(), any())).thenReturn(pagina(1));
        when(seguimientoService.resumen(any(), any(), any(), any(), any())).thenReturn(seguimiento());
    }

    @Test
    void administradorRecibeAlcanceGlobalYUsuariosActivos() {
        PanelResumenResponse resumen = service.resumen(usuario("ADMIN", null));

        assertEquals("ADMIN", resumen.rol());
        assertTrue(resumen.alcanceGlobal());
        assertNull(resumen.institucionId());
        assertNull(resumen.institucionNombre());
        assertEquals("2026-2027", resumen.periodoActivo().nombre());
        assertEquals(7, resumen.indicadores().instituciones());
        assertEquals(54, resumen.indicadores().clubes());
        assertEquals(46, resumen.indicadores().clubesActivos());
        assertEquals(47, resumen.indicadores().docentesActivos());
        assertEquals(120L, resumen.indicadores().usuariosActivos());
        assertEquals(7, resumen.pendientes().sesionesSinEjecucion());
        assertEquals(8, resumen.pendientes().sesionesProximosSieteDias());
        assertEquals(5, resumen.pendientes().solicitudesInscripcionPorResolver());
        assertEquals(1, resumen.pendientes().solicitudesRetiroPorResolver());
        assertEquals(3, resumen.seguimiento().clubesCriticos());
        assertNotNull(resumen.generadoEn());
        verify(institucionService, never()).obtener(any(), any());
    }

    @Test
    void responsableRecibeSuInstitucionYNoVeUsuarios() {
        UsuarioPrincipal responsable = usuario("RESP_INSTITUCIONAL", 1L);

        PanelResumenResponse resumen = service.resumen(responsable);

        assertFalse(resumen.alcanceGlobal());
        assertEquals(1L, resumen.institucionId());
        assertEquals("Unidad Educativa de Prueba", resumen.institucionNombre());
        assertNull(resumen.indicadores().usuariosActivos());
        verifyNoInteractions(usuarioService);
        verify(clubService).listar(isNull(), isNull(), isNull(), isNull(), eq(0), eq(1), eq(responsable));
        verify(seguimientoService).resumen(isNull(), isNull(), isNull(), isNull(), eq(responsable));
    }

    @Test
    void docenteConsultaConSuPropioAlcance() {
        UsuarioPrincipal docente = usuario("DOCENTE", 1L);

        PanelResumenResponse resumen = service.resumen(docente);

        assertEquals("DOCENTE", resumen.rol());
        assertFalse(resumen.alcanceGlobal());
        assertNull(resumen.indicadores().usuariosActivos());
        verifyNoInteractions(usuarioService);
        verify(actividadService).listar(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
                isNull(), eq(true), eq(false), eq(0), eq(1), eq(docente));
    }

    @Test
    void usuarioSinInstitucionAsignadaEsRechazado() {
        assertThrows(ApiException.class, () -> service.resumen(usuario("DOCENTE", null)));
    }

    @Test
    void sinPeriodoActivoNoCalculaSeguimiento() {
        when(periodoRepository.findByActivoTrue()).thenReturn(Optional.empty());

        PanelResumenResponse resumen = service.resumen(usuario("COORDINADOR", null));

        assertNull(resumen.periodoActivo());
        assertNull(resumen.seguimiento());
        verifyNoInteractions(seguimientoService);
    }

    private <T> PaginaResponse<T> pagina(long total) {
        return new PaginaResponse<>(List.of(), 0, 1, total, (int) total);
    }

    private UsuarioPrincipal usuario(String rolCodigo, Long institucionId) {
        Rol rol = new Rol();
        rol.setCodigo(rolCodigo);
        Usuario usuario = new Usuario();
        usuario.setId(10L);
        usuario.setUsername("prueba");
        usuario.setRol(rol);
        usuario.setInstitucionId(institucionId);
        return new UsuarioPrincipal(usuario);
    }

    private PeriodoAcademico periodo() {
        PeriodoAcademico periodo = new PeriodoAcademico();
        periodo.setId(1);
        periodo.setNombre("2026-2027");
        periodo.setFechaInicio(LocalDate.of(2026, 9, 1));
        periodo.setFechaFin(LocalDate.of(2027, 7, 31));
        periodo.setActivo(true);
        return periodo;
    }

    private InstitucionResponse institucion() {
        return new InstitucionResponse(1L, "09H00001", "Unidad Educativa de Prueba", "8", null, "Guayas",
                "Guayaquil", null, null, null, null, null, null, null, null);
    }

    private ResumenSeguimientoResponse seguimiento() {
        return new ResumenSeguimientoResponse(1, "2026-2027", null, null, null, null, null, null,
                53, 13, 0, 3, 37, null, List.of(), List.of(), List.of());
    }
}
```

## Paso 13. Pruebas de las estadísticas

Archivo: `backend/src/test/java/ec/edu/ups/tipi/publico/EstadisticasPublicasServiceTest.java`

Archivo nuevo. Cuatro casos: conversión de los agregados, reutilización del resultado mientras está vigente, recálculo con vigencia cero y ausencia de período activo.

```java
package ec.edu.ups.tipi.publico;

import ec.edu.ups.tipi.publico.dto.EstadisticasPublicasResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EstadisticasPublicasServiceTest {

    private EstadisticasPublicasRepository repository;

    @BeforeEach
    void preparar() {
        repository = mock(EstadisticasPublicasRepository.class);
        when(repository.agregados()).thenReturn(new Object[]{
                "2026-2027", 7L, 5L, 54L, 46L, 47L, 79L, 26L, new BigDecimal("49.5"), 5L, 12L, 2L});
    }

    @Test
    void convierteLosAgregadosEnLaRespuesta() {
        EstadisticasPublicasResponse respuesta = new EstadisticasPublicasService(repository, 300).obtener();

        assertEquals("2026-2027", respuesta.periodoActivo());
        assertEquals(7, respuesta.instituciones());
        assertEquals(5, respuesta.institucionesConClubes());
        assertEquals(54, respuesta.clubes());
        assertEquals(46, respuesta.clubesActivos());
        assertEquals(47, respuesta.docentesActivos());
        assertEquals(79, respuesta.estudiantesParticipantes());
        assertEquals(26, respuesta.sesionesEjecutadas());
        assertEquals(50, respuesta.horasEjecutadas());
        assertEquals(5, respuesta.evidenciasRegistradas());
        assertEquals(12, respuesta.proyectos());
        assertEquals(2, respuesta.certificadosEmitidos());
        assertNotNull(respuesta.actualizadoEn());
    }

    @Test
    void reutilizaElResultadoMientrasEstaVigente() {
        EstadisticasPublicasService service = new EstadisticasPublicasService(repository, 300);

        EstadisticasPublicasResponse primera = service.obtener();
        EstadisticasPublicasResponse segunda = service.obtener();

        assertSame(primera, segunda);
        verify(repository, times(1)).agregados();
    }

    @Test
    void recalculaCuandoLaVigenciaEsCero() {
        EstadisticasPublicasService service = new EstadisticasPublicasService(repository, 0);

        service.obtener();
        service.obtener();

        verify(repository, times(2)).agregados();
    }

    @Test
    void aceptaQueNoExistaPeriodoActivo() {
        when(repository.agregados()).thenReturn(new Object[]{
                null, 0L, 0L, 0L, 0L, 0L, 0L, 0L, BigDecimal.ZERO, 0L, 0L, 0L});

        EstadisticasPublicasResponse respuesta = new EstadisticasPublicasService(repository, 300).obtener();

        assertEquals(null, respuesta.periodoActivo());
        assertEquals(0, respuesta.horasEjecutadas());
    }
}
```

## Paso 14. Reiniciar el backend

Detén el backend (Ctrl + C en su terminal) y vuelve a levantarlo desde la carpeta `backend`:

```bash
./mvnw spring-boot:run
```

## Paso 15. Probar el endpoint público

Abre en el navegador, sin iniciar sesión:

```text
http://localhost:8080/api/publico/estadisticas
```

Debe mostrar el JSON con las cifras. Si recargas antes de cinco minutos, `actualizadoEn` no cambia: es la memoria temporal funcionando.

## Paso 16. Probar el panel por rol

1. Abre `http://localhost:8080/swagger-ui.html`.
2. Ejecuta `POST /api/auth/login` con `admin` y copia el `accessToken`.
3. Pulsa **Authorize**, pega el token y confirma.
4. Ejecuta `GET /api/panel/resumen`, en la sección **Panel**: `alcanceGlobal` debe ser `true` y `usuariosActivos` debe traer un número.
5. Repite con `f9resp1`: `institucionId` debe ser `1` y `usuariosActivos` debe ser `null`.
6. Repite con `f9doc1`: `clubes` debe ser `2`, que son los clubes que coordina.

## Paso 17. Ejecutar las pruebas

Desde la carpeta `backend`:

```bash
./mvnw -Dtest=PanelServiceTest,EstadisticasPublicasServiceTest,PeriodoControllerTest test
```

Debe terminar con `Tests run: 13, Failures: 0, Errors: 0`.

## Resultado de mis comprobaciones

Las hice en una segunda instancia en el puerto 8081, contra tu base real, con siete usuarios:

| Usuario | Rol | Instituciones | Clubes | Sesiones sin ejecución | Clubes críticos | Tiempo |
|---|---|---|---|---|---|---|
| admin | Administrador | 7 | 54 | 7 | 3 | 144 ms |
| f9coord | Coordinador | 7 | 54 | 7 | 3 | 120 ms |
| f9consulta | Consulta | 7 | 54 | 7 | 3 | 89 ms |
| f9resp1 | Responsable, institución 1 | 1 | 38 | 6 | 2 | 75 ms |
| f9resp2 | Responsable, institución 2 | 1 | 16 | 1 | 1 | 43 ms |
| f9doc1 | Docente, institución 1 | 1 | 2 | 0 | 0 | 50 ms |
| f9doc3 | Docente, institución 2 | 1 | 1 | 0 | 0 | 41 ms |

- Para cada usuario comparé las cifras del panel con las de los endpoints de lista y de seguimiento que ya existían: coinciden en los siete casos.
- Sin token, el panel responde 401 y las estadísticas públicas responden 200.
- La primera llamada pública tardó 402 ms y la segunda 21 ms, servida desde la memoria temporal.
- El documento OpenAPI pasó de 148 a 150 operaciones y el endpoint público figura sin candado.
- Pruebas automáticas: 13 de 13 en verde.

## Decisión de diseño que conviene conocer

El panel reutiliza los servicios existentes en lugar de escribir conteos nuevos. La ventaja es que el alcance por rol no se puede desalinear de las pantallas. El costo es que cada cifra ejecuta su consulta de lista con tamaño 1, de modo que el servidor hace varias consultas internas por petición. Con tus datos actuales responde entre 41 y 144 ms. Si más adelante el volumen lo exige, se pueden sustituir por conteos directos sin cambiar el contrato.

## Lo que sigue en el PASO 2

- Bloque 3: búsqueda ligera `?q=` de clubes e instituciones.
- Bloques 4 a 6: el contrato `ResponseEntity` en los 26 controladores restantes, con sus etiquetas de documentación.
- Cierre: generación de los tipos TypeScript desde `/v3/api-docs`.

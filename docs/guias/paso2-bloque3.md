# PASO 2 · Bloque 3: búsqueda ligera para selectores

Este bloque agrega dos endpoints de opciones para alimentar los cuadros combinados del nuevo frontend. Es un módulo nuevo e independiente: no modifica ningún archivo existente del backend. Los cambios ya están aplicados en tu equipo, en la rama `claude/project-thread-kgb12h`, y forman parte del pull request https://github.com/moranandres/tipi-clubes/pull/2.

## Qué agrega

| Endpoint | Parámetros | Devuelve |
|---|---|---|
| `GET /api/opciones/instituciones` | `q` (nombre o código AMIE), `limite` | `{ id, nombre }` |
| `GET /api/opciones/clubes` | `q` (nombre), `institucionId`, `periodoId`, `estado`, `limite` | `{ id, nombre, institucionId }` |

Todos los parámetros son opcionales. `limite` vale 20 por defecto y admite hasta 50.

## Una precisión sobre el diagnóstico

En el diagnóstico escribí que con más de 100 clubes el selector quedaría incompleto. Al revisar `frontend/js/catalogos.js` vi que no es así: el frontend actual recorre todas las páginas, de modo que no pierde registros. El problema real es de peso: descarga el registro completo de cada club (18 campos, más las consultas que arman los nombres y los cupos) cuando el selector solo necesita el nombre. Ya corregí esas tres líneas en `docs/diagnostico/paso1-auditoria.md`.

## Ejemplo de respuesta

Petición: `GET /api/opciones/clubes?q=rob&limite=3`

```json
{
  "opciones": [
    { "id": 6, "nombre": "Club de Robótica TIPI", "institucionId": 1 },
    { "id": 24, "nombre": "F4 Robótica", "institucionId": 1 },
    { "id": 25, "nombre": "F4 Robótica Trujillo", "institucionId": 2 }
  ],
  "hayMas": true
}
```

## Cómo lo usará el frontend

1. Al abrir el cuadro combinado pide las primeras 20 opciones, sin `q`.
2. Mientras la persona escribe, repite la petición con `q` (con una pausa de unos 250 ms entre teclas).
3. Si `hayMas` es `true`, muestra el aviso "Escribe para afinar la búsqueda".
4. Al editar un registro existente no hace falta buscar la opción seleccionada: los DTO ya traen `clubNombre` e `institucionNombre`.

## Paso 1. Actualizar la rama

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git checkout claude/project-thread-kgb12h
```

## Paso 2. Opción genérica

Archivo: `backend/src/main/java/ec/edu/ups/tipi/opciones/dto/OpcionResponse.java`

Archivo nuevo. La forma mínima de una opción de selector: `id` y `nombre`. Es la que usan las instituciones.

```java
package ec.edu.ups.tipi.opciones.dto;

public record OpcionResponse(Long id, String nombre) {
}
```

## Paso 3. Opción de club

Archivo: `backend/src/main/java/ec/edu/ups/tipi/opciones/dto/ClubOpcionResponse.java`

Archivo nuevo. Añade `institucionId` porque los selectores en cascada (institución y luego club) lo necesitan, y porque dos instituciones pueden tener clubes con el mismo nombre.

```java
package ec.edu.ups.tipi.opciones.dto;

public record ClubOpcionResponse(Long id, String nombre, Long institucionId) {
}
```

## Paso 4. Envoltura de la respuesta

Archivo: `backend/src/main/java/ec/edu/ups/tipi/opciones/dto/OpcionesResponse.java`

Archivo nuevo. Lleva la lista y la bandera `hayMas`, con la que el cuadro combinado puede mostrar el aviso de seguir escribiendo para afinar la búsqueda.

```java
package ec.edu.ups.tipi.opciones.dto;

import java.util.List;

public record OpcionesResponse<T>(List<T> opciones, boolean hayMas) {
}
```

## Paso 5. Consultas de proyección

Archivo: `backend/src/main/java/ec/edu/ups/tipi/opciones/OpcionesRepository.java`

Archivo nuevo. Usa la API de criterios de JPA para pedirle a PostgreSQL solo las columnas necesarias (`select id, nombre`), en lugar de cargar la entidad completa. Los filtros se agregan únicamente cuando vienen informados y el `like` se ejecuta con carácter de escape.

```java
package ec.edu.ups.tipi.opciones;

import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.opciones.dto.ClubOpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class OpcionesRepository {

    private static final char ESCAPE = '\\';

    @PersistenceContext
    private EntityManager entityManager;

    public List<OpcionResponse> instituciones(String patron, Long institucionId, int maximo) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<OpcionResponse> consulta = cb.createQuery(OpcionResponse.class);
        Root<Institucion> institucion = consulta.from(Institucion.class);

        List<Predicate> filtros = new ArrayList<>();
        if (institucionId != null) {
            filtros.add(cb.equal(institucion.get("id"), institucionId));
        }
        if (patron != null) {
            filtros.add(cb.or(
                    cb.like(cb.lower(institucion.get("nombre")), patron, ESCAPE),
                    cb.like(cb.lower(institucion.get("codigoAmie")), patron, ESCAPE)));
        }

        consulta.select(cb.construct(OpcionResponse.class, institucion.get("id"), institucion.get("nombre")))
                .where(filtros.toArray(Predicate[]::new))
                .orderBy(cb.asc(institucion.get("nombre")), cb.asc(institucion.get("id")));
        return entityManager.createQuery(consulta).setMaxResults(maximo).getResultList();
    }

    public List<ClubOpcionResponse> clubes(String patron, Long institucionId, Long docenteId, Integer periodoId,
                                           EstadoClub estado, int maximo) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<ClubOpcionResponse> consulta = cb.createQuery(ClubOpcionResponse.class);
        Root<Club> club = consulta.from(Club.class);

        List<Predicate> filtros = new ArrayList<>();
        if (institucionId != null) {
            filtros.add(cb.equal(club.get("institucionId"), institucionId));
        }
        if (docenteId != null) {
            filtros.add(cb.equal(club.get("docenteId"), docenteId));
        }
        if (periodoId != null) {
            filtros.add(cb.equal(club.get("periodoId"), periodoId));
        }
        if (estado != null) {
            filtros.add(cb.equal(club.get("estado"), estado));
        }
        if (patron != null) {
            filtros.add(cb.like(cb.lower(club.get("nombre")), patron, ESCAPE));
        }

        consulta.select(cb.construct(ClubOpcionResponse.class, club.get("id"), club.get("nombre"),
                        club.get("institucionId")))
                .where(filtros.toArray(Predicate[]::new))
                .orderBy(cb.asc(club.get("nombre")), cb.asc(club.get("id")));
        return entityManager.createQuery(consulta).setMaxResults(maximo).getResultList();
    }
}
```

## Paso 6. Servicio con alcance por rol

Archivo: `backend/src/main/java/ec/edu/ups/tipi/opciones/OpcionesService.java`

Archivo nuevo. Aplica las mismas reglas de alcance que las listas: los roles globales buscan en todo, el responsable solo en su institución y el docente solo en los clubes que coordina. Si un usuario no global pide una institución ajena, responde 403. El límite se acota entre 1 y 50, el texto de búsqueda se recorta a 100 caracteres y los comodines `%` y `_` se escapan para que se busquen como texto. Para saber si hay más resultados pide uno adicional al límite.

```java
package ec.edu.ups.tipi.opciones;

import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.opciones.dto.ClubOpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionesResponse;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class OpcionesService {

    static final int LIMITE_MAXIMO = 50;
    static final int LONGITUD_MAXIMA_BUSQUEDA = 100;
    private static final String ROL_DOCENTE = "DOCENTE";

    private final OpcionesRepository repository;
    private final DocenteRepository docenteRepository;
    private final AlcanceInstitucional alcance;

    @Transactional(readOnly = true)
    public OpcionesResponse<OpcionResponse> instituciones(String q, int limite, UsuarioPrincipal usuario) {
        Long institucionId = alcance.esGlobal(usuario) ? null : alcance.institucionPropia(usuario);
        int tope = tope(limite);
        return recortar(repository.instituciones(patron(q), institucionId, tope + 1), tope);
    }

    @Transactional(readOnly = true)
    public OpcionesResponse<ClubOpcionResponse> clubes(String q, Long institucionId, Integer periodoId,
                                                       EstadoClub estado, int limite, UsuarioPrincipal usuario) {
        Long filtroInstitucion = institucionId;
        Long filtroDocente = null;
        if (!alcance.esGlobal(usuario)) {
            Long propia = alcance.institucionPropia(usuario);
            if (institucionId != null) {
                alcance.verificar(usuario, institucionId);
            }
            if (ROL_DOCENTE.equals(usuario.getRolCodigo())) {
                filtroDocente = docenteRepository.findByUsuarioId(usuario.getId())
                        .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN,
                                "Su usuario no está vinculado a un registro de docente."))
                        .getId();
            } else {
                filtroInstitucion = propia;
            }
        }
        int tope = tope(limite);
        return recortar(repository.clubes(patron(q), filtroInstitucion, filtroDocente, periodoId, estado, tope + 1),
                tope);
    }

    private int tope(int limite) {
        return Math.min(Math.max(limite, 1), LIMITE_MAXIMO);
    }

    private String patron(String q) {
        if (!StringUtils.hasText(q)) {
            return null;
        }
        String texto = q.trim();
        if (texto.length() > LONGITUD_MAXIMA_BUSQUEDA) {
            texto = texto.substring(0, LONGITUD_MAXIMA_BUSQUEDA);
        }
        String escapado = texto.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escapado + "%";
    }

    private <T> OpcionesResponse<T> recortar(List<T> encontrados, int tope) {
        boolean hayMas = encontrados.size() > tope;
        return new OpcionesResponse<>(hayMas ? List.copyOf(encontrados.subList(0, tope)) : encontrados, hayMas);
    }
}
```

## Paso 7. Controlador

Archivo: `backend/src/main/java/ec/edu/ups/tipi/opciones/OpcionesController.java`

Archivo nuevo. Expone `GET /api/opciones/instituciones` y `GET /api/opciones/clubes` para los cinco roles.

```java
package ec.edu.ups.tipi.opciones;

import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.opciones.dto.ClubOpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionesResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Opciones", description = "Búsquedas ligeras para alimentar selectores y cuadros combinados")
@RestController
@RequestMapping("/api/opciones")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')")
public class OpcionesController {

    private final OpcionesService service;

    @Operation(summary = "Instituciones por nombre o código AMIE, solo con id y nombre")
    @GetMapping("/instituciones")
    public ResponseEntity<OpcionesResponse<OpcionResponse>> instituciones(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "20") int limite,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.instituciones(q, limite, usuario));
    }

    @Operation(summary = "Clubes por nombre, solo con id, nombre e institución")
    @GetMapping("/clubes")
    public ResponseEntity<OpcionesResponse<ClubOpcionResponse>> clubes(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Integer periodoId,
            @RequestParam(required = false) EstadoClub estado,
            @RequestParam(defaultValue = "20") int limite,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.clubes(q, institucionId, periodoId, estado, limite, usuario));
    }
}
```

## Paso 8. Pruebas

Archivo: `backend/src/test/java/ec/edu/ups/tipi/opciones/OpcionesServiceTest.java`

Archivo nuevo. Once casos: alcance del administrador, del responsable, del docente y del coordinador; rechazo de una institución ajena y de un docente sin registro; acotación del límite; escape de comodines; y la bandera `hayMas` en sus dos estados.

```java
package ec.edu.ups.tipi.opciones;

import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.opciones.dto.ClubOpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionesResponse;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Rol;
import ec.edu.ups.tipi.usuarios.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OpcionesServiceTest {

    private OpcionesRepository repository;
    private DocenteRepository docenteRepository;
    private OpcionesService service;

    @BeforeEach
    void preparar() {
        repository = mock(OpcionesRepository.class);
        docenteRepository = mock(DocenteRepository.class);
        service = new OpcionesService(repository, docenteRepository, new AlcanceInstitucional());
        when(repository.instituciones(any(), any(), anyInt())).thenReturn(List.of());
        when(repository.clubes(any(), any(), any(), any(), any(), anyInt())).thenReturn(List.of());
    }

    @Test
    void administradorBuscaInstitucionesSinRestriccion() {
        service.instituciones("  Eloy  ", 20, usuario("ADMIN", null));

        verify(repository).instituciones("%eloy%", null, 21);
    }

    @Test
    void responsableSoloObtieneSuInstitucion() {
        service.instituciones(null, 20, usuario("RESP_INSTITUCIONAL", 2L));

        verify(repository).instituciones(null, 2L, 21);
    }

    @Test
    void responsableSoloObtieneClubesDeSuInstitucion() {
        service.clubes("robot", null, 1, EstadoClub.ACTIVO, 20, usuario("RESP_INSTITUCIONAL", 2L));

        verify(repository).clubes("%robot%", 2L, null, 1, EstadoClub.ACTIVO, 21);
    }

    @Test
    void responsableNoPuedePedirOtraInstitucion() {
        assertThrows(ApiException.class,
                () -> service.clubes(null, 9L, null, null, 20, usuario("RESP_INSTITUCIONAL", 2L)));

        verify(repository, never()).clubes(any(), any(), any(), any(), any(), anyInt());
    }

    @Test
    void docenteSoloObtieneLosClubesQueCoordina() {
        Docente docente = new Docente();
        docente.setId(31L);
        when(docenteRepository.findByUsuarioId(10L)).thenReturn(Optional.of(docente));

        service.clubes(null, null, null, null, 20, usuario("DOCENTE", 1L));

        verify(repository).clubes(isNull(), isNull(), eq(31L), isNull(), isNull(), eq(21));
    }

    @Test
    void docenteSinRegistroDeDocenteEsRechazado() {
        when(docenteRepository.findByUsuarioId(10L)).thenReturn(Optional.empty());

        assertThrows(ApiException.class,
                () -> service.clubes(null, null, null, null, 20, usuario("DOCENTE", 1L)));
    }

    @Test
    void coordinadorPuedeFiltrarPorCualquierInstitucion() {
        service.clubes(null, 9L, null, null, 20, usuario("COORDINADOR", null));

        verify(repository).clubes(null, 9L, null, null, null, 21);
        verifyNoInteractions(docenteRepository);
    }

    @Test
    void elLimiteSeAcotaEntreUnoYCincuenta() {
        service.instituciones(null, 0, usuario("ADMIN", null));
        service.instituciones(null, 500, usuario("ADMIN", null));

        verify(repository).instituciones(null, null, 2);
        verify(repository).instituciones(null, null, 51);
    }

    @Test
    void losComodinesDeLaBusquedaSeEscapan() {
        service.instituciones("100%_a\\b", 20, usuario("ADMIN", null));

        verify(repository).instituciones("%100\\%\\_a\\\\b%", null, 21);
    }

    @Test
    void indicaCuandoHayMasResultadosQueElLimite() {
        when(repository.clubes(any(), any(), any(), any(), any(), anyInt())).thenReturn(clubes(3));

        OpcionesResponse<ClubOpcionResponse> respuesta =
                service.clubes(null, null, null, null, 2, usuario("ADMIN", null));

        assertTrue(respuesta.hayMas());
        assertEquals(2, respuesta.opciones().size());
        assertEquals(1L, respuesta.opciones().get(0).id());
    }

    @Test
    void noIndicaMasResultadosCuandoCabenEnElLimite() {
        when(repository.instituciones(any(), any(), anyInt()))
                .thenReturn(List.of(new OpcionResponse(1L, "Unidad Educativa de Prueba")));

        OpcionesResponse<OpcionResponse> respuesta = service.instituciones(null, 20, usuario("ADMIN", null));

        assertFalse(respuesta.hayMas());
        assertEquals(1, respuesta.opciones().size());
    }

    private List<ClubOpcionResponse> clubes(int cantidad) {
        List<ClubOpcionResponse> lista = new ArrayList<>();
        for (long i = 1; i <= cantidad; i++) {
            lista.add(new ClubOpcionResponse(i, "Club " + i, 1L));
        }
        return lista;
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
}
```

## Paso 9. Reiniciar el backend

Detén el backend (Ctrl + C en su terminal) y vuelve a levantarlo desde la carpeta `backend`:

```bash
./mvnw spring-boot:run
```

## Paso 10. Probar las búsquedas

1. Abre `http://localhost:8080/swagger-ui.html`.
2. Ejecuta `POST /api/auth/login` con `admin`, copia el `accessToken`, pulsa **Authorize** y pégalo.
3. En la sección **Opciones**, ejecuta `GET /api/opciones/clubes` con `q` igual a `rob`: debe devolver 20 opciones y `hayMas` en `true`.
4. Ejecuta `GET /api/opciones/instituciones` sin parámetros: debe devolver tus 7 instituciones con solo `id` y `nombre`.
5. Repite el paso 3 con el usuario `f9doc1`: debe devolver únicamente sus 2 clubes.
6. Con `f9resp1`, ejecuta `GET /api/opciones/clubes` con `institucionId` igual a `2`: debe responder 403.

## Paso 11. Ejecutar las pruebas

Desde la carpeta `backend`:

```bash
./mvnw test
```

Debe terminar con `Tests run: 25, Failures: 0, Errors: 0`.

## Resultado de mis comprobaciones

Las hice en una segunda instancia en el puerto 8081, contra tu base real.

Peso y tiempo, con el administrador:

| Petición | Filas | Tamaño | Tiempo |
|---|---|---|---|
| `GET /api/clubes?tamano=100` (lo que usa hoy el selector) | 54 | 23 842 bytes | 169 ms |
| `GET /api/opciones/clubes?limite=50` | 50 | 2 910 bytes | 18 ms |
| `GET /api/opciones/clubes?q=rob` | 20 | 1 195 bytes | 22 ms |
| `GET /api/instituciones?tamano=100` (lo que usa hoy el selector) | 7 | 2 691 bytes | no medido |
| `GET /api/opciones/instituciones` | 7 | 508 bytes | 22 ms |

Alcance por rol, comparado con el total de la lista que ya existía:

| Usuario | Rol | Clubes en opciones | Clubes en la lista | Instituciones | Pide una institución ajena |
|---|---|---|---|---|---|
| f9coord | Coordinador | 50 y `hayMas` | 54 | 7 | permitido |
| f9consulta | Consulta | 50 y `hayMas` | 54 | 7 | permitido |
| f9resp1 | Responsable, institución 1 | 38 | 38 | 1 | 403 |
| f9resp2 | Responsable, institución 2 | 16 | 16 | 1 | 403 |
| f9doc1 | Docente, institución 1 | 2 | 2 | 1 | 403 |
| f9doc3 | Docente, institución 2 | 1 | 1 | 1 | 403 |

Otras comprobaciones:

- Sin token, ambos endpoints responden 401.
- La búsqueda no distingue mayúsculas: `ROB` con `estado=ACTIVO` e `institucionId=2` devuelve 15 clubes, todos de la institución 2.
- La búsqueda por código AMIE encuentra la institución correcta.
- Buscar `%` devuelve 0 resultados en lugar de todos, y un texto con comillas responde 200 sin error.
- Un `estado` inexistente responde 400 con el mensaje de validación habitual.
- El documento OpenAPI pasó de 150 a 152 operaciones.
- Pruebas automáticas: 25 de 25 en verde, incluida la que levanta toda la aplicación.

## Límite conocido

La búsqueda distingue tildes, igual que las listas actuales: `robotica` no encuentra "Robótica", pero `rob` sí. Resolverlo requiere activar la extensión `unaccent` de PostgreSQL con una migración; lo puedo incluir en un bloque posterior si lo quieres.

## Lo que sigue en el PASO 2

- Bloques 4 a 6: el contrato `ResponseEntity` en los 26 controladores restantes, con sus etiquetas de documentación.
- Cierre: generación de los tipos TypeScript desde `/v3/api-docs`.

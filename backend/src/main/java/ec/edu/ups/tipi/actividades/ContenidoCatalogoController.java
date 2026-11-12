package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.actividades.dto.ContenidoEstadoRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoResponse;
import ec.edu.ups.tipi.common.Respuestas;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Contenidos", description = "Catálogo de contenidos y competencias que se trabajan en las actividades")
@RestController
@RequestMapping("/api/contenidos")
@RequiredArgsConstructor
public class ContenidoCatalogoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String GESTION = "hasRole('ADMIN')";

    private final ContenidoCatalogoService service;

    @Operation(summary = "Lista de contenidos con filtros por tipo, estado y texto")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<List<ContenidoResponse>> listar(@RequestParam(required = false) TipoContenido tipo,
                                                          @RequestParam(required = false) Boolean activo,
                                                          @RequestParam(required = false) String q) {
        return ResponseEntity.ok(service.listar(tipo, activo, q));
    }

    @Operation(summary = "Detalle de un contenido")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<ContenidoResponse> obtener(@PathVariable Integer id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @Operation(summary = "Crea un contenido")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(GESTION)
    public ResponseEntity<ContenidoResponse> crear(@Valid @RequestBody ContenidoRequest request) {
        ContenidoResponse creado = service.crear(request);
        return Respuestas.creado(creado.id(), creado);
    }

    @Operation(summary = "Actualiza un contenido")
    @PutMapping("/{id}")
    @PreAuthorize(GESTION)
    public ResponseEntity<ContenidoResponse> actualizar(@PathVariable Integer id,
                                                        @Valid @RequestBody ContenidoRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    @Operation(summary = "Activa o desactiva un contenido")
    @PatchMapping("/{id}/estado")
    @PreAuthorize(GESTION)
    public ResponseEntity<ContenidoResponse> cambiarEstado(@PathVariable Integer id,
                                                           @Valid @RequestBody ContenidoEstadoRequest request) {
        return ResponseEntity.ok(service.cambiarEstado(id, request));
    }
}

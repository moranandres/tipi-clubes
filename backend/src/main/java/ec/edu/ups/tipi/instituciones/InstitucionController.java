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

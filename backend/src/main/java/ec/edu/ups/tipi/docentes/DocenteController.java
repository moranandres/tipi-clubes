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

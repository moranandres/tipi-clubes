package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.estudiantes.dto.AutorizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionResponse;
import ec.edu.ups.tipi.estudiantes.dto.DocumentoDescarga;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/estudiantes/{estudianteId}/autorizaciones")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')")
public class AutorizacionController {

    private final AutorizacionService service;

    @GetMapping
    public List<AutorizacionResponse> listar(@PathVariable Long estudianteId,
                                             @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.listar(estudianteId, usuario);
    }

    @PutMapping("/{tipo}")
    public AutorizacionResponse actualizar(@PathVariable Long estudianteId,
                                           @PathVariable TipoAutorizacion tipo,
                                           @Valid @RequestBody AutorizacionRequest request,
                                           @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.actualizar(estudianteId, tipo, request, usuario);
    }

    @PostMapping(value = "/{tipo}/documento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AutorizacionResponse cargarDocumento(@PathVariable Long estudianteId,
                                                @PathVariable TipoAutorizacion tipo,
                                                @RequestParam("archivo") MultipartFile archivo,
                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.cargarDocumento(estudianteId, tipo, archivo, usuario);
    }

    @GetMapping("/{tipo}/documento")
    public ResponseEntity<Resource> descargarDocumento(@PathVariable Long estudianteId,
                                                       @PathVariable TipoAutorizacion tipo,
                                                       @AuthenticationPrincipal UsuarioPrincipal usuario) {
        DocumentoDescarga documento = service.descargarDocumento(estudianteId, tipo, usuario);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(documento.tipoMime()))
                .contentLength(documento.tamano())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(documento.nombre(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(documento.recurso());
    }
}
package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.estudiantes.dto.AutorizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionResponse;
import ec.edu.ups.tipi.estudiantes.dto.DocumentoDescarga;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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

@Tag(name = "Autorizaciones de estudiantes", description = "Autorizaciones de participación y de uso de imagen, con su documento de respaldo")
@RestController
@RequestMapping("/api/estudiantes/{estudianteId}/autorizaciones")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')")
public class AutorizacionController {

    private final AutorizacionService service;

    @Operation(summary = "Autorizaciones de un estudiante")
    @GetMapping
    public ResponseEntity<List<AutorizacionResponse>> listar(@PathVariable Long estudianteId,
                                                             @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(estudianteId, usuario));
    }

    @Operation(summary = "Registra o actualiza una autorización por tipo")
    @PutMapping("/{tipo}")
    public ResponseEntity<AutorizacionResponse> actualizar(@PathVariable Long estudianteId,
                                                           @PathVariable TipoAutorizacion tipo,
                                                           @Valid @RequestBody AutorizacionRequest request,
                                                           @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.actualizar(estudianteId, tipo, request, usuario));
    }

    @Operation(summary = "Carga el documento de respaldo de una autorización")
    @PostMapping(value = "/{tipo}/documento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AutorizacionResponse> cargarDocumento(@PathVariable Long estudianteId,
                                                                @PathVariable TipoAutorizacion tipo,
                                                                @RequestParam("archivo") MultipartFile archivo,
                                                                @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.cargarDocumento(estudianteId, tipo, archivo, usuario));
    }

    @Operation(summary = "Descarga el documento de respaldo de una autorización")
    @ApiResponse(responseCode = "200", description = "Archivo del documento",
            content = @Content(mediaType = MediaType.APPLICATION_OCTET_STREAM_VALUE,
                    schema = @Schema(type = "string", format = "binary")))
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

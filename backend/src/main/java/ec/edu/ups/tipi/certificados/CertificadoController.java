package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.certificados.dto.AnulacionRequest;
import ec.edu.ups.tipi.certificados.dto.CertificadoDescarga;
import ec.edu.ups.tipi.certificados.dto.CertificadoEmitirRequest;
import ec.edu.ups.tipi.certificados.dto.CertificadoResponse;
import ec.edu.ups.tipi.certificados.dto.CertificadoVista;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.common.Respuestas;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@Tag(name = "Certificados", description = "Emisión, consulta, descarga en PDF y anulación de certificados")
@RestController
@RequestMapping("/api/certificados")
@RequiredArgsConstructor
public class CertificadoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String DESCARGA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String EMISION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final CertificadoService service;

    @Operation(summary = "Lista paginada de certificados dentro del alcance del usuario")
    @GetMapping
    @PreAuthorize(LECTURA)
    public ResponseEntity<PaginaResponse<CertificadoVista>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long institucionId,
            @RequestParam(required = false) Long clubId,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) TipoCertificado tipo,
            @RequestParam(required = false) EstadoCertificado estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano,
            @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.listar(q, institucionId, clubId, estudianteId, tipo, estado, desde, hasta,
                pagina, tamano, usuario));
    }

    @Operation(summary = "Detalle de un certificado")
    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public ResponseEntity<CertificadoVista> obtener(@PathVariable Long id,
                                                    @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.obtener(id, usuario));
    }

    @Operation(summary = "Descarga el certificado en PDF")
    @ApiResponse(responseCode = "200", description = "Archivo PDF del certificado",
            content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE,
                    schema = @Schema(type = "string", format = "binary")))
    @GetMapping("/{id}/pdf")
    @PreAuthorize(DESCARGA)
    public ResponseEntity<Resource> descargar(@PathVariable Long id,
                                              @AuthenticationPrincipal UsuarioPrincipal usuario) {
        CertificadoDescarga descarga = service.descargar(id, usuario);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(descarga.tamano())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(descarga.nombre(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(descarga.recurso());
    }

    @Operation(summary = "Emite un certificado")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(EMISION)
    public ResponseEntity<CertificadoResponse> emitir(@Valid @RequestBody CertificadoEmitirRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        CertificadoResponse emitido = service.emitir(request, usuario);
        return Respuestas.creado(emitido.id(), emitido);
    }

    @Operation(summary = "Anula un certificado indicando el motivo")
    @PatchMapping("/{id}/anulacion")
    @PreAuthorize(EMISION)
    public ResponseEntity<CertificadoResponse> anular(@PathVariable Long id,
                                                      @Valid @RequestBody AnulacionRequest request,
                                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return ResponseEntity.ok(service.anular(id, request, usuario));
    }
}

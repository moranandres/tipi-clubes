package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.certificados.dto.AnulacionRequest;
import ec.edu.ups.tipi.certificados.dto.CertificadoDescarga;
import ec.edu.ups.tipi.certificados.dto.CertificadoEmitirRequest;
import ec.edu.ups.tipi.certificados.dto.CertificadoResponse;
import ec.edu.ups.tipi.certificados.dto.CertificadoVista;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
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

@RestController
@RequestMapping("/api/certificados")
@RequiredArgsConstructor
public class CertificadoController {

    private static final String LECTURA =
            "hasAnyRole('ADMIN','COORDINADOR','CONSULTA','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String DESCARGA = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL','DOCENTE')";
    private static final String EMISION = "hasAnyRole('ADMIN','RESP_INSTITUCIONAL')";

    private final CertificadoService service;

    @GetMapping
    @PreAuthorize(LECTURA)
    public PaginaResponse<CertificadoVista> listar(
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
        return service.listar(q, institucionId, clubId, estudianteId, tipo, estado, desde, hasta, pagina, tamano,
                usuario);
    }

    @GetMapping("/{id}")
    @PreAuthorize(LECTURA)
    public CertificadoVista obtener(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.obtener(id, usuario);
    }

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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(EMISION)
    public CertificadoResponse emitir(@Valid @RequestBody CertificadoEmitirRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.emitir(request, usuario);
    }

    @PatchMapping("/{id}/anulacion")
    @PreAuthorize(EMISION)
    public CertificadoResponse anular(@PathVariable Long id, @Valid @RequestBody AnulacionRequest request,
                                      @AuthenticationPrincipal UsuarioPrincipal usuario) {
        return service.anular(id, request, usuario);
    }
}

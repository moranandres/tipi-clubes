package ec.edu.ups.tipi.auditoria;

import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");

    private final AuditoriaRepository repository;

    /** Registra una acción atribuida al usuario autenticado en la petición actual. */
    @Transactional
    public void registrar(String accion, String entidad, Long entidadId, String detalle) {
        Long usuarioId = null;
        String identificador = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UsuarioPrincipal p) {
            usuarioId = p.getId();
            identificador = p.getUsername();
        }
        registrarComo(usuarioId, identificador, accion, entidad, entidadId, detalle);
    }

    /** Registra una acción indicando explícitamente el actor (por ejemplo, en el login). */
    @Transactional
    public void registrarComo(Long usuarioId, String identificador, String accion,
                              String entidad, Long entidadId, String detalle) {
        Auditoria a = new Auditoria();
        a.setUsuarioId(usuarioId);
        a.setIdentificador(recortar(identificador, 150));
        a.setAccion(accion);
        a.setEntidad(entidad);
        a.setEntidadId(entidadId);
        a.setDetalle(recortar(detalle, 4000));
        a.setIp(ipActual());
        repository.save(a);
    }

    @Transactional(readOnly = true)
    public PaginaResponse<AuditoriaResponse> listar(String usuario, String accion, String entidad,
                                                    Long entidadId, LocalDate desde, LocalDate hasta,
                                                    int pagina, int tamano) {
        Specification<Auditoria> spec = (root, cq, cb) -> cb.conjunction();

        if (StringUtils.hasText(usuario)) {
            String patron = "%" + usuario.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("identificador")), patron));
        }
        if (StringUtils.hasText(accion)) {
            String valor = accion.trim().toUpperCase();
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("accion"), valor));
        }
        if (StringUtils.hasText(entidad)) {
            String valor = entidad.trim().toUpperCase();
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("entidad"), valor));
        }
        if (entidadId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("entidadId"), entidadId));
        }
        if (desde != null) {
            Instant inicio = desde.atStartOfDay(ZONA).toInstant();
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.<Instant>get("fecha"), inicio));
        }
        if (hasta != null) {
            Instant fin = hasta.plusDays(1).atStartOfDay(ZONA).toInstant();
            spec = spec.and((root, cq, cb) -> cb.lessThan(root.<Instant>get("fecha"), fin));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0),
                Math.min(Math.max(tamano, 1), 100), Sort.by(Sort.Direction.DESC, "fecha"));
        return PaginaResponse.de(repository.findAll(spec, pageable).map(AuditoriaResponse::de));
    }

    private String ipActual() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest().getRemoteAddr();
        }
        return null;
    }

    private String recortar(String valor, int max) {
        if (valor == null) {
            return null;
        }
        return valor.length() <= max ? valor : valor.substring(0, max);
    }
}
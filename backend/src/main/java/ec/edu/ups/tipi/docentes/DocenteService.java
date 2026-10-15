package ec.edu.ups.tipi.docentes;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.docentes.dto.DocenteActualizarRequest;
import ec.edu.ups.tipi.docentes.dto.DocenteCrearRequest;
import ec.edu.ups.tipi.docentes.dto.DocenteResponse;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static ec.edu.ups.tipi.common.CambiosAuditoria.diferencias;
import static ec.edu.ups.tipi.common.CambiosAuditoria.texto;

@Service
@RequiredArgsConstructor
public class DocenteService {

    private static final List<EstadoClub> ESTADOS_ABIERTOS =
            List.of(EstadoClub.PLANIFICADO, EstadoClub.ACTIVO, EstadoClub.SUSPENDIDO);

    private final DocenteRepository docenteRepository;
    private final InstitucionRepository institucionRepository;
    private final UsuarioRepository usuarioRepository;
    private final ClubRepository clubRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<DocenteResponse> listar(String q, Long institucionId, Boolean activo,
                                                  int pagina, int tamano, UsuarioPrincipal usuario) {
        Specification<Docente> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long propioId = docentePropio(usuario).getId();
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("id"), propioId));
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.or(
                    cb.like(cb.lower(root.get("nombres")), patron),
                    cb.like(cb.lower(root.get("apellidos")), patron),
                    cb.like(cb.lower(root.get("correo")), patron)));
        }
        if (activo != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("activo"), activo));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0),
                Math.min(Math.max(tamano, 1), 100), Sort.by("apellidos", "nombres"));
        return PaginaResponse.de(docenteRepository.findAll(spec, pageable).map(DocenteResponse::de));
    }

    @Transactional(readOnly = true)
    public DocenteResponse obtener(Long id, UsuarioPrincipal usuario) {
        Docente docente = buscar(id);
        verificarLectura(usuario, docente);
        return DocenteResponse.de(docente);
    }

    @Transactional
    public DocenteResponse crear(DocenteCrearRequest request, UsuarioPrincipal usuario) {
        alcance.verificar(usuario, request.institucionId());
        if (!institucionRepository.existsById(request.institucionId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La institución indicada no existe.");
        }
        validarUsuarioVinculado(request.usuarioId(), request.institucionId(), null);

        Docente docente = new Docente();
        docente.setInstitucionId(request.institucionId());
        docente.setUsuarioId(request.usuarioId());
        docente.setNombres(request.nombres().trim());
        docente.setApellidos(request.apellidos().trim());
        docente.setCorreo(limpiar(request.correo()));
        docente.setTelefono(limpiar(request.telefono()));
        docente = docenteRepository.saveAndFlush(docente);

        auditoria.registrar("DOCENTE_CREADO", "DOCENTE", docente.getId(),
                "nombre=" + docente.getApellidos() + " " + docente.getNombres()
                        + ", institucionId=" + docente.getInstitucionId()
                        + ", usuarioId=" + docente.getUsuarioId());
        return DocenteResponse.de(docente);
    }

    @Transactional
    public DocenteResponse actualizar(Long id, DocenteActualizarRequest request, UsuarioPrincipal usuario) {
        Docente docente = buscar(id);
        alcance.verificar(usuario, docente.getInstitucionId());
        validarUsuarioVinculado(request.usuarioId(), docente.getInstitucionId(), id);

        Map<String, String> antes = instantanea(docente);
        docente.setNombres(request.nombres().trim());
        docente.setApellidos(request.apellidos().trim());
        docente.setCorreo(limpiar(request.correo()));
        docente.setTelefono(limpiar(request.telefono()));
        docente.setUsuarioId(request.usuarioId());
        docente = docenteRepository.saveAndFlush(docente);

        auditoria.registrar("DOCENTE_ACTUALIZADO", "DOCENTE", id, diferencias(antes, instantanea(docente)));
        return DocenteResponse.de(docente);
    }

    @Transactional
    public DocenteResponse cambiarEstado(Long id, boolean activo, UsuarioPrincipal usuario) {
        Docente docente = buscar(id);
        alcance.verificar(usuario, docente.getInstitucionId());
        if (docente.isActivo() == activo) {
            return DocenteResponse.de(docente);
        }
        if (!activo && clubRepository.existsByDocenteIdAndEstadoIn(id, ESTADOS_ABIERTOS)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El docente es responsable de clubes que no están cerrados. Reasigne o cierre esos clubes primero.");
        }
        docente.setActivo(activo);
        docente = docenteRepository.saveAndFlush(docente);

        auditoria.registrar(activo ? "DOCENTE_ACTIVADO" : "DOCENTE_DESACTIVADO", "DOCENTE", id,
                "nombre=" + docente.getApellidos() + " " + docente.getNombres());
        return DocenteResponse.de(docente);
    }

    private Docente buscar(Long id) {
        return docenteRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Docente no encontrado."));
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private void verificarLectura(UsuarioPrincipal usuario, Docente docente) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            if (!usuario.getId().equals(docente.getUsuarioId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre este docente.");
            }
            return;
        }
        alcance.verificar(usuario, docente.getInstitucionId());
    }

    private void validarUsuarioVinculado(Long usuarioId, Long institucionId, Long docenteId) {
        if (usuarioId == null) {
            return;
        }
        Usuario cuenta = usuarioRepository.findById(usuarioId).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "El usuario indicado no existe."));
        if (!"DOCENTE".equals(cuenta.getRol().getCodigo()) || !institucionId.equals(cuenta.getInstitucionId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El usuario debe tener el rol DOCENTE y pertenecer a la misma institución.");
        }
        boolean ocupado = docenteId == null
                ? docenteRepository.existsByUsuarioId(usuarioId)
                : docenteRepository.existsByUsuarioIdAndIdNot(usuarioId, docenteId);
        if (ocupado) {
            throw new ApiException(HttpStatus.CONFLICT, "El usuario ya está vinculado a otro docente.");
        }
    }

    private Map<String, String> instantanea(Docente d) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("nombres", texto(d.getNombres()));
        m.put("apellidos", texto(d.getApellidos()));
        m.put("correo", texto(d.getCorreo()));
        m.put("telefono", texto(d.getTelefono()));
        m.put("usuarioId", texto(d.getUsuarioId()));
        return m;
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}
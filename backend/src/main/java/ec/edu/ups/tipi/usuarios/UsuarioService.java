package ec.edu.ups.tipi.usuarios;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.usuarios.dto.UsuarioActualizarRequest;
import ec.edu.ups.tipi.usuarios.dto.UsuarioCrearRequest;
import ec.edu.ups.tipi.usuarios.dto.UsuarioDetalleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private static final Set<String> ROLES_CON_INSTITUCION = Set.of("RESP_INSTITUCIONAL", "DOCENTE");

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final InstitucionRepository institucionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<UsuarioDetalleResponse> listar(String q, String rol, Long institucionId,
                                                         Boolean activo, int pagina, int tamano) {
        Specification<Usuario> spec = (root, cq, cb) -> cb.conjunction();

        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.or(
                    cb.like(cb.lower(root.get("username")), patron),
                    cb.like(cb.lower(root.get("email")), patron),
                    cb.like(cb.lower(root.get("nombres")), patron),
                    cb.like(cb.lower(root.get("apellidos")), patron)));
        }
        if (StringUtils.hasText(rol)) {
            String codigo = rol.trim().toUpperCase();
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("rol").get("codigo"), codigo));
        }
        if (institucionId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
        }
        if (activo != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("activo"), activo));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0),
                Math.min(Math.max(tamano, 1), 100), Sort.by("apellidos", "nombres"));
        return PaginaResponse.de(usuarioRepository.findAll(spec, pageable).map(UsuarioDetalleResponse::de));
    }

    @Transactional(readOnly = true)
    public UsuarioDetalleResponse obtener(Long id) {
        return UsuarioDetalleResponse.de(buscar(id));
    }

    @Transactional
    public UsuarioDetalleResponse crear(UsuarioCrearRequest r) {
        String username = r.username().trim();
        String email = r.email().trim().toLowerCase();

        if (usuarioRepository.existsByUsernameIgnoreCase(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso.");
        }
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado.");
        }
        Rol rol = obtenerRol(r.rolCodigo());
        validarInstitucion(rol, r.institucionId());

        Usuario u = new Usuario();
        u.setUsername(username);
        u.setEmail(email);
        u.setNombres(r.nombres().trim());
        u.setApellidos(r.apellidos().trim());
        u.setRol(rol);
        u.setInstitucionId(r.institucionId());
        u.setPasswordHash(passwordEncoder.encode(r.passwordTemporal()));
        u.setDebeCambiarPassword(true);
        u = usuarioRepository.saveAndFlush(u);

        auditoria.registrar("USUARIO_CREADO", "USUARIO", u.getId(), "username=" + u.getUsername()
                + ", rol=" + rol.getCodigo() + ", institucionId=" + u.getInstitucionId());
        return UsuarioDetalleResponse.de(u);
    }

    @Transactional
    public UsuarioDetalleResponse actualizar(Long id, UsuarioActualizarRequest r) {
        Usuario u = buscar(id);
        String email = r.email().trim().toLowerCase();

        if (usuarioRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado.");
        }
        Rol rolNuevo = obtenerRol(r.rolCodigo());
        validarInstitucion(rolNuevo, r.institucionId());

        boolean dejaDeSerAdmin = "ADMIN".equals(u.getRol().getCodigo())
                && !"ADMIN".equals(rolNuevo.getCodigo());
        if (dejaDeSerAdmin && u.isActivo()) {
            garantizarOtroAdminActivo();
        }

        boolean cambiaAcceso = !u.getRol().getCodigo().equals(rolNuevo.getCodigo())
                || !Objects.equals(u.getInstitucionId(), r.institucionId());

        String antes = resumen(u);
        u.setEmail(email);
        u.setNombres(r.nombres().trim());
        u.setApellidos(r.apellidos().trim());
        u.setRol(rolNuevo);
        u.setInstitucionId(r.institucionId());
        if (cambiaAcceso) {
            u.invalidarSesiones();
        }
        u = usuarioRepository.saveAndFlush(u);

        auditoria.registrar("USUARIO_ACTUALIZADO", "USUARIO", u.getId(),
                "antes: [" + antes + "] -> despues: [" + resumen(u) + "]");
        if (cambiaAcceso) {
            auditoria.registrar("SESIONES_CERRADAS", "USUARIO", u.getId(),
                    "Motivo: cambio de rol o institución");
        }
        return UsuarioDetalleResponse.de(u);
    }

    @Transactional
    public UsuarioDetalleResponse cambiarEstado(Long id, boolean activo) {
        Usuario u = buscar(id);
        if (u.isActivo() == activo) {
            return UsuarioDetalleResponse.de(u);
        }
        if (!activo && "ADMIN".equals(u.getRol().getCodigo())) {
            garantizarOtroAdminActivo();
        }
        u.setActivo(activo);
        if (!activo) {
            u.invalidarSesiones();
        }
        u = usuarioRepository.saveAndFlush(u);

        auditoria.registrar(activo ? "USUARIO_ACTIVADO" : "USUARIO_DESACTIVADO", "USUARIO",
                u.getId(), "username=" + u.getUsername());
        return UsuarioDetalleResponse.de(u);
    }

    @Transactional
    public void restablecerPassword(Long id, String passwordTemporal) {
        Usuario u = buscar(id);
        u.setPasswordHash(passwordEncoder.encode(passwordTemporal));
        u.setDebeCambiarPassword(true);
        u.setIntentosFallidos(0);
        u.setBloqueadoHasta(null);
        u.invalidarSesiones();
        usuarioRepository.saveAndFlush(u);

        auditoria.registrar("PASSWORD_RESTABLECIDA", "USUARIO", u.getId(),
                "username=" + u.getUsername() + "; se cerraron sus sesiones abiertas");
    }

    private Usuario buscar(Long id) {
        return usuarioRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));
    }

    private Rol obtenerRol(String codigo) {
        return rolRepository.findByCodigo(codigo.trim().toUpperCase()).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "El rol indicado no existe."));
    }

    private void validarInstitucion(Rol rol, Long institucionId) {
        boolean requiere = ROLES_CON_INSTITUCION.contains(rol.getCodigo());
        if (requiere && institucionId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El rol " + rol.getCodigo() + " requiere una institución.");
        }
        if (!requiere && institucionId != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El rol " + rol.getCodigo() + " no debe tener institución asignada.");
        }
        if (requiere && !institucionRepository.existsById(institucionId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La institución indicada no existe.");
        }
    }

    private void garantizarOtroAdminActivo() {
        if (usuarioRepository.countByRolCodigoAndActivoTrue("ADMIN") <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "Debe existir al menos un administrador activo.");
        }
    }

    private String resumen(Usuario u) {
        return "email=" + u.getEmail() + ", nombres=" + u.getNombres() + ", apellidos=" + u.getApellidos()
                + ", rol=" + u.getRol().getCodigo() + ", institucionId=" + u.getInstitucionId();
    }
}
package ec.edu.ups.tipi.instituciones;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.instituciones.dto.InstitucionContactoRequest;
import ec.edu.ups.tipi.instituciones.dto.InstitucionRequest;
import ec.edu.ups.tipi.instituciones.dto.InstitucionResponse;
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
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InstitucionService {

    /** Roles que pueden consultar todas las instituciones. */
    private static final Set<String> ROLES_ALCANCE_GLOBAL = Set.of("ADMIN", "COORDINADOR", "CONSULTA");

    private final InstitucionRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<InstitucionResponse> listar(String q, String provincia, String canton,
                                                      EstadoAdhesion estado, int pagina, int tamano,
                                                      UsuarioPrincipal usuario) {
        Specification<Institucion> spec = (root, cq, cb) -> cb.conjunction();

        // Responsable y Docente solo pueden ver SU institución
        if (!tieneAlcanceGlobal(usuario)) {
            Long propia = usuario.getInstitucionId();
            if (propia == null) {
                throw sinInstitucion();
            }
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("id"), propia));
        }
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.or(
                    cb.like(cb.lower(root.get("nombre")), patron),
                    cb.like(cb.lower(root.get("codigoAmie")), patron)));
        }
        if (StringUtils.hasText(provincia)) {
            String valor = provincia.trim().toLowerCase();
            spec = spec.and((root, cq, cb) -> cb.equal(cb.lower(root.get("provincia")), valor));
        }
        if (StringUtils.hasText(canton)) {
            String valor = canton.trim().toLowerCase();
            spec = spec.and((root, cq, cb) -> cb.equal(cb.lower(root.get("canton")), valor));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estadoAdhesion"), estado));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0),
                Math.min(Math.max(tamano, 1), 100), Sort.by("nombre"));
        return PaginaResponse.de(repository.findAll(spec, pageable).map(InstitucionResponse::de));
    }

    @Transactional(readOnly = true)
    public InstitucionResponse obtener(Long id, UsuarioPrincipal usuario) {
        verificarAcceso(usuario, id);
        return InstitucionResponse.de(buscar(id));
    }

    @Transactional
    public InstitucionResponse crear(InstitucionRequest request) {
        String amie = normalizarAmie(request.codigoAmie());
        if (repository.existsByCodigoAmie(amie)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Ya existe una institución con el código AMIE " + amie + ".");
        }
        Institucion institucion = new Institucion();
        institucion.setCodigoAmie(amie);
        aplicar(institucion, request);
        institucion = repository.saveAndFlush(institucion);

        auditoria.registrar("INSTITUCION_CREADA", "INSTITUCION", institucion.getId(),
                "AMIE=" + institucion.getCodigoAmie() + ", nombre=" + institucion.getNombre());
        return InstitucionResponse.de(institucion);
    }

    @Transactional
    public InstitucionResponse actualizar(Long id, InstitucionRequest request) {
        Institucion institucion = buscar(id);
        String amie = normalizarAmie(request.codigoAmie());
        if (repository.existsByCodigoAmieAndIdNot(amie, id)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Ya existe otra institución con el código AMIE " + amie + ".");
        }
        Map<String, String> antes = instantanea(institucion);
        institucion.setCodigoAmie(amie);
        aplicar(institucion, request);
        institucion = repository.saveAndFlush(institucion);

        auditoria.registrar("INSTITUCION_ACTUALIZADA", "INSTITUCION", id,
                diferencias(antes, instantanea(institucion)));
        return InstitucionResponse.de(institucion);
    }

    @Transactional
    public InstitucionResponse actualizarContacto(Long id, InstitucionContactoRequest request,
                                                  UsuarioPrincipal usuario) {
        verificarAcceso(usuario, id);
        Institucion institucion = buscar(id);
        Map<String, String> antes = instantanea(institucion);

        institucion.setDireccion(limpiar(request.direccion()));
        institucion.setTelefono(limpiar(request.telefono()));
        institucion.setCorreoContacto(limpiar(request.correoContacto()));
        institucion.setAutoridadNombre(limpiar(request.autoridadNombre()));
        institucion.setAutoridadCargo(limpiar(request.autoridadCargo()));
        institucion = repository.saveAndFlush(institucion);

        auditoria.registrar("INSTITUCION_CONTACTO_ACTUALIZADO", "INSTITUCION", id,
                diferencias(antes, instantanea(institucion)));
        return InstitucionResponse.de(institucion);
    }

    @Transactional
    public InstitucionResponse asignarResponsable(Long id, Long usuarioId) {
        Institucion institucion = buscar(id);
        Usuario responsable = usuarioRepository.findById(usuarioId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));

        if (!"RESP_INSTITUCIONAL".equals(responsable.getRol().getCodigo())
                || !id.equals(responsable.getInstitucionId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El usuario debe tener el rol RESP_INSTITUCIONAL y pertenecer a esta institución.");
        }
        if (!responsable.isActivo()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El usuario indicado está inactivo.");
        }
        Long anterior = institucion.getResponsableId();
        institucion.setResponsableId(responsable.getId());
        institucion = repository.saveAndFlush(institucion);

        auditoria.registrar("INSTITUCION_RESPONSABLE_ASIGNADO", "INSTITUCION", id,
                "responsableId: '" + anterior + "' -> '" + responsable.getId() + "'");
        return InstitucionResponse.de(institucion);
    }

    // ---------------- utilidades privadas ----------------

    private Institucion buscar(Long id) {
        return repository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Institución no encontrada."));
    }

    private boolean tieneAlcanceGlobal(UsuarioPrincipal usuario) {
        return ROLES_ALCANCE_GLOBAL.contains(usuario.getRolCodigo());
    }

    private void verificarAcceso(UsuarioPrincipal usuario, Long institucionId) {
        if (tieneAlcanceGlobal(usuario)) {
            return;
        }
        if (usuario.getInstitucionId() == null || !usuario.getInstitucionId().equals(institucionId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre esta institución.");
        }
    }

    private ApiException sinInstitucion() {
        return new ApiException(HttpStatus.FORBIDDEN, "Su usuario no tiene una institución asignada.");
    }

    private void aplicar(Institucion i, InstitucionRequest r) {
        EstadoAdhesion estado = r.estadoAdhesion() != null ? r.estadoAdhesion() : i.getEstadoAdhesion();
        if (estado == EstadoAdhesion.ADHERIDA && r.fechaAdhesion() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La fecha de adhesión es obligatoria cuando el estado es ADHERIDA.");
        }
        i.setNombre(limpiar(r.nombre()));
        i.setZona(limpiar(r.zona()));
        i.setCircuito(limpiar(r.circuito()));
        i.setProvincia(limpiar(r.provincia()));
        i.setCanton(limpiar(r.canton()));
        i.setDireccion(limpiar(r.direccion()));
        i.setTelefono(limpiar(r.telefono()));
        i.setCorreoContacto(limpiar(r.correoContacto()));
        i.setAutoridadNombre(limpiar(r.autoridadNombre()));
        i.setAutoridadCargo(limpiar(r.autoridadCargo()));
        i.setEstadoAdhesion(estado);
        i.setFechaAdhesion(r.fechaAdhesion());
    }

    /** Foto de los campos editables, para calcular qué cambió (historial RF-11). */
    private Map<String, String> instantanea(Institucion i) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("codigoAmie", Objects.toString(i.getCodigoAmie(), ""));
        m.put("nombre", Objects.toString(i.getNombre(), ""));
        m.put("zona", Objects.toString(i.getZona(), ""));
        m.put("circuito", Objects.toString(i.getCircuito(), ""));
        m.put("provincia", Objects.toString(i.getProvincia(), ""));
        m.put("canton", Objects.toString(i.getCanton(), ""));
        m.put("direccion", Objects.toString(i.getDireccion(), ""));
        m.put("telefono", Objects.toString(i.getTelefono(), ""));
        m.put("correoContacto", Objects.toString(i.getCorreoContacto(), ""));
        m.put("autoridadNombre", Objects.toString(i.getAutoridadNombre(), ""));
        m.put("autoridadCargo", Objects.toString(i.getAutoridadCargo(), ""));
        m.put("estadoAdhesion", Objects.toString(i.getEstadoAdhesion(), ""));
        m.put("fechaAdhesion", Objects.toString(i.getFechaAdhesion(), ""));
        return m;
    }

    private String diferencias(Map<String, String> antes, Map<String, String> despues) {
        StringBuilder sb = new StringBuilder();
        despues.forEach((campo, nuevo) -> {
            String viejo = antes.get(campo);
            if (!Objects.equals(viejo, nuevo)) {
                if (sb.length() > 0) {
                    sb.append("; ");
                }
                sb.append(campo).append(": '").append(viejo).append("' -> '").append(nuevo).append("'");
            }
        });
        return sb.length() == 0 ? "Sin cambios" : sb.toString();
    }

    private String normalizarAmie(String amie) {
        return amie.trim().toUpperCase();
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}
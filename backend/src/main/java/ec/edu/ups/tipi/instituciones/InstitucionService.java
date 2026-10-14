package ec.edu.ups.tipi.instituciones;

import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.instituciones.dto.InstitucionContactoRequest;
import ec.edu.ups.tipi.instituciones.dto.InstitucionRequest;
import ec.edu.ups.tipi.instituciones.dto.InstitucionResponse;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class InstitucionService {

    /** Roles que pueden consultar todas las instituciones. */
    private static final Set<String> ROLES_ALCANCE_GLOBAL = Set.of("ADMIN", "COORDINADOR", "CONSULTA");

    private final InstitucionRepository repository;

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
        return InstitucionResponse.de(repository.saveAndFlush(institucion));
    }

    @Transactional
    public InstitucionResponse actualizar(Long id, InstitucionRequest request) {
        Institucion institucion = buscar(id);
        String amie = normalizarAmie(request.codigoAmie());
        if (repository.existsByCodigoAmieAndIdNot(amie, id)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Ya existe otra institución con el código AMIE " + amie + ".");
        }
        institucion.setCodigoAmie(amie);
        aplicar(institucion, request);
        return InstitucionResponse.de(repository.saveAndFlush(institucion));
    }

    @Transactional
    public InstitucionResponse actualizarContacto(Long id, InstitucionContactoRequest request,
                                                  UsuarioPrincipal usuario) {
        verificarAcceso(usuario, id);
        Institucion institucion = buscar(id);
        institucion.setDireccion(limpiar(request.direccion()));
        institucion.setTelefono(limpiar(request.telefono()));
        institucion.setCorreoContacto(limpiar(request.correoContacto()));
        institucion.setAutoridadNombre(limpiar(request.autoridadNombre()));
        institucion.setAutoridadCargo(limpiar(request.autoridadCargo()));
        return InstitucionResponse.de(repository.saveAndFlush(institucion));
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
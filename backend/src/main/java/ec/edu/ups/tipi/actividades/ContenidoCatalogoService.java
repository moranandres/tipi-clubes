package ec.edu.ups.tipi.actividades;

import ec.edu.ups.tipi.actividades.dto.ContenidoEstadoRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoRequest;
import ec.edu.ups.tipi.actividades.dto.ContenidoResponse;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static ec.edu.ups.tipi.common.CambiosAuditoria.diferencias;
import static ec.edu.ups.tipi.common.CambiosAuditoria.texto;

@Service
@RequiredArgsConstructor
public class ContenidoCatalogoService {

    private final ContenidoCatalogoRepository repository;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<ContenidoResponse> listar(TipoContenido tipo, Boolean activo, String q) {
        Specification<ContenidoCatalogo> spec = (root, cq, cb) -> cb.conjunction();
        if (tipo != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("tipo"), tipo));
        }
        if (activo != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("activo"), activo));
        }
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("nombre")), patron));
        }
        return armar(repository.findAll(spec, Sort.by("tipo").and(Sort.by("nombre"))));
    }

    @Transactional(readOnly = true)
    public ContenidoResponse obtener(Integer id) {
        return armar(List.of(buscar(id))).get(0);
    }

    @Transactional
    public ContenidoResponse crear(ContenidoRequest request) {
        String nombre = normalizar(request.nombre());
        if (repository.existsByTipoAndNombreIgnoreCase(request.tipo(), nombre)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un contenido de ese tipo con ese nombre.");
        }
        ContenidoCatalogo contenido = new ContenidoCatalogo();
        contenido.setTipo(request.tipo());
        contenido.setNombre(nombre);
        contenido.setDescripcion(limpiar(request.descripcion()));
        contenido = repository.saveAndFlush(contenido);
        auditoria.registrar("CONTENIDO_CREADO", "CONTENIDO", contenido.getId().longValue(),
                "tipo=" + contenido.getTipo() + ", nombre=" + contenido.getNombre());
        return armar(List.of(contenido)).get(0);
    }

    @Transactional
    public ContenidoResponse actualizar(Integer id, ContenidoRequest request) {
        ContenidoCatalogo contenido = buscar(id);
        String nombre = normalizar(request.nombre());
        if (repository.existsByTipoAndNombreIgnoreCaseAndIdNot(request.tipo(), nombre, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe otro contenido de ese tipo con ese nombre.");
        }
        long usos = contarActividades(List.of(id)).getOrDefault(id, 0L);
        if (request.tipo() != contenido.getTipo() && usos > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El contenido ya se usa en " + usos + " actividades y no puede cambiar de tipo. "
                            + "Desactívelo y cree uno nuevo con el tipo correcto.");
        }
        Map<String, String> antes = instantanea(contenido);
        contenido.setTipo(request.tipo());
        contenido.setNombre(nombre);
        contenido.setDescripcion(limpiar(request.descripcion()));
        contenido = repository.saveAndFlush(contenido);
        auditoria.registrar("CONTENIDO_ACTUALIZADO", "CONTENIDO", id.longValue(),
                diferencias(antes, instantanea(contenido)));
        return armar(List.of(contenido)).get(0);
    }

    @Transactional
    public ContenidoResponse cambiarEstado(Integer id, ContenidoEstadoRequest request) {
        ContenidoCatalogo contenido = buscar(id);
        boolean nuevo = request.activo();
        if (contenido.isActivo() == nuevo) {
            throw new ApiException(HttpStatus.CONFLICT,
                    nuevo ? "El contenido ya está activo." : "El contenido ya está inactivo.");
        }
        contenido.setActivo(nuevo);
        contenido = repository.saveAndFlush(contenido);
        auditoria.registrar("CONTENIDO_ESTADO_CAMBIADO", "CONTENIDO", id.longValue(),
                "activo: '" + !nuevo + "' -> '" + nuevo + "'");
        return armar(List.of(contenido)).get(0);
    }

    private ContenidoCatalogo buscar(Integer id) {
        return repository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Contenido no encontrado."));
    }

    private List<ContenidoResponse> armar(List<ContenidoCatalogo> contenidos) {
        if (contenidos.isEmpty()) {
            return List.of();
        }
        Map<Integer, Long> usos = contarActividades(contenidos.stream().map(ContenidoCatalogo::getId).toList());
        return contenidos.stream()
                .map(c -> ContenidoResponse.de(c, usos.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    private Map<Integer, Long> contarActividades(List<Integer> ids) {
        Map<Integer, Long> conteo = new HashMap<>();
        if (ids.isEmpty()) {
            return conteo;
        }
        for (Object[] fila : repository.contarActividades(ids)) {
            conteo.put(((Number) fila[0]).intValue(), ((Number) fila[1]).longValue());
        }
        return conteo;
    }

    private Map<String, String> instantanea(ContenidoCatalogo c) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("tipo", texto(c.getTipo()));
        m.put("nombre", texto(c.getNombre()));
        m.put("descripcion", texto(c.getDescripcion()));
        return m;
    }

    private String normalizar(String valor) {
        return valor.trim().replaceAll("\\s+", " ");
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}

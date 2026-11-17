package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionListadoResponse;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AutorizacionConsultaService {

    private static final int TAMANO_MAXIMO = 100;
    private static final Sort ORDEN = Sort.by(Sort.Direction.DESC, "actualizadoEn")
            .and(Sort.by(Sort.Direction.DESC, "id"));

    private final AutorizacionRepository autorizacionRepository;
    private final EstudianteRepository estudianteRepository;
    private final InstitucionRepository institucionRepository;
    private final AlcanceInstitucional alcance;

    @Transactional(readOnly = true)
    public PaginaResponse<AutorizacionListadoResponse> listar(EstadoAutorizacion estado, TipoAutorizacion tipo,
                                                              Long institucionId, Long estudianteId,
                                                              int pagina, int tamano, UsuarioPrincipal usuario) {
        if (alcance.soloDatosMinimos(usuario)) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Su rol no puede consultar las autorizaciones ni los datos de los representantes.");
        }

        Long institucion = institucionDelAlcance(institucionId, usuario);
        Specification<Autorizacion> spec = (root, cq, cb) -> cb.conjunction();

        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (tipo != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("tipo"), tipo));
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId));
        }
        if (institucion != null) {
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> estudiantes = cq.subquery(Long.class);
                Root<Estudiante> estudiante = estudiantes.from(Estudiante.class);
                estudiantes.select(estudiante.get("id"))
                        .where(cb.equal(estudiante.get("institucionId"), institucion));
                return root.get("estudianteId").in(estudiantes);
            });
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), TAMANO_MAXIMO), ORDEN);
        Page<Autorizacion> resultado = autorizacionRepository.findAll(spec, pageable);
        List<AutorizacionListadoResponse> contenido = armar(resultado.getContent());
        return PaginaResponse.de(new PageImpl<>(contenido, pageable, resultado.getTotalElements()));
    }

    private Long institucionDelAlcance(Long institucionId, UsuarioPrincipal usuario) {
        if (alcance.esGlobal(usuario)) {
            return institucionId;
        }
        if (institucionId != null) {
            alcance.verificar(usuario, institucionId);
        }
        return alcance.institucionPropia(usuario);
    }

    private List<AutorizacionListadoResponse> armar(List<Autorizacion> autorizaciones) {
        if (autorizaciones.isEmpty()) {
            return List.of();
        }
        Set<Long> estudianteIds = autorizaciones.stream().map(Autorizacion::getEstudianteId).collect(Collectors.toSet());
        Map<Long, Estudiante> estudiantes = estudianteRepository.findAllById(estudianteIds).stream()
                .collect(Collectors.toMap(Estudiante::getId, Function.identity()));
        Set<Long> institucionIds = estudiantes.values().stream().map(Estudiante::getInstitucionId)
                .collect(Collectors.toSet());
        Map<Long, String> instituciones = institucionRepository.findAllById(institucionIds).stream()
                .collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));

        return autorizaciones.stream()
                .filter(autorizacion -> estudiantes.containsKey(autorizacion.getEstudianteId()))
                .map(autorizacion -> {
                    Estudiante estudiante = estudiantes.get(autorizacion.getEstudianteId());
                    return AutorizacionListadoResponse.de(autorizacion, estudiante,
                            instituciones.get(estudiante.getInstitucionId()));
                })
                .toList();
    }
}

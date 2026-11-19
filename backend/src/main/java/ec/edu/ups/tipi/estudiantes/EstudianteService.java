package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.almacenamiento.AlmacenamientoArchivos;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.certificados.Certificado;
import ec.edu.ups.tipi.certificados.CertificadoRepository;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.estudiantes.dto.AnonimizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteActualizarRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteCrearRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteResponse;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteResumenResponse;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteVista;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
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
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EstudianteService {

    private static final String MENSAJE_HOMONIMO =
            "Ya existe un estudiante con los mismos nombres y apellidos en esta institución. "
            + "Verifique que no sea la misma persona; si se trata de otro estudiante, confirme el registro.";
    private static final Set<String> ROLES_DE_ANONIMIZACION = Set.of("ADMIN", "RESP_INSTITUCIONAL");
    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final EstudianteRepository estudianteRepository;
    private final AutorizacionRepository autorizacionRepository;
    private final CertificadoRepository certificadoRepository;
    private final InstitucionRepository institucionRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;
    private final AlmacenamientoArchivos almacenamiento;

    @Transactional(readOnly = true)
    public PaginaResponse<EstudianteVista> listar(String q, Long institucionId, CursoEducativo curso,
                                                  EstadoEstudiante estado, int pagina, int tamano,
                                                  UsuarioPrincipal usuario) {
        boolean minima = alcance.soloDatosMinimos(usuario);
        Specification<Estudiante> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            if (minima) {
                spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("codigoInterno")), patron));
            } else {
                spec = spec.and((root, cq, cb) -> cb.or(
                        cb.like(cb.lower(root.get("nombres")), patron),
                        cb.like(cb.lower(root.get("apellidos")), patron),
                        cb.like(cb.lower(root.get("codigoInterno")), patron)));
            }
        }
        if (curso != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("curso"), curso));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }

        Sort orden = minima ? Sort.by("codigoInterno") : Sort.by("apellidos", "nombres");
        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100), orden);
        Page<Estudiante> resultado = estudianteRepository.findAll(spec, pageable);
        Page<EstudianteVista> vistas = new PageImpl<>(armar(resultado.getContent(), minima),
                pageable, resultado.getTotalElements());
        return PaginaResponse.de(vistas);
    }

    @Transactional(readOnly = true)
    public EstudianteVista obtener(Long id, UsuarioPrincipal usuario) {
        Estudiante estudiante = buscar(id);
        alcance.verificar(usuario, estudiante.getInstitucionId());
        return armar(List.of(estudiante), alcance.soloDatosMinimos(usuario)).get(0);
    }

    @Transactional
    public EstudianteResponse crear(EstudianteCrearRequest request, UsuarioPrincipal usuario) {
        alcance.verificar(usuario, request.institucionId());
        if (!institucionRepository.existsById(request.institucionId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La institución indicada no existe.");
        }
        String nombres = normalizar(request.nombres());
        String apellidos = normalizar(request.apellidos());

        if (!Boolean.TRUE.equals(request.confirmarHomonimo())
                && estudianteRepository.existsByInstitucionIdAndNombresIgnoreCaseAndApellidosIgnoreCase(
                        request.institucionId(), nombres, apellidos)) {
            throw new ApiException(HttpStatus.CONFLICT, MENSAJE_HOMONIMO);
        }

        Estudiante estudiante = new Estudiante();
        estudiante.setInstitucionId(request.institucionId());
        estudiante.setNombres(nombres);
        estudiante.setApellidos(apellidos);
        estudiante.setCurso(request.curso());
        estudiante = estudianteRepository.saveAndFlush(estudiante);

        for (TipoAutorizacion tipo : TipoAutorizacion.values()) {
            Autorizacion autorizacion = new Autorizacion();
            autorizacion.setEstudianteId(estudiante.getId());
            autorizacion.setTipo(tipo);
            autorizacionRepository.save(autorizacion);
        }

        auditoria.registrar("ESTUDIANTE_CREADO", "ESTUDIANTE", estudiante.getId(),
                "codigo=" + estudiante.getCodigoInterno() + ", institucionId=" + estudiante.getInstitucionId()
                        + ", curso=" + estudiante.getCurso());
        return completo(estudiante);
    }

    @Transactional
    public EstudianteResponse actualizar(Long id, EstudianteActualizarRequest request, UsuarioPrincipal usuario) {
        Estudiante estudiante = buscar(id);
        alcance.verificar(usuario, estudiante.getInstitucionId());
        rechazarSiAnonimizado(estudiante, "sus datos ya no se editan");

        String nombres = normalizar(request.nombres());
        String apellidos = normalizar(request.apellidos());
        boolean cambianNombres = !estudiante.getNombres().equals(nombres)
                || !estudiante.getApellidos().equals(apellidos);

        if (cambianNombres && !Boolean.TRUE.equals(request.confirmarHomonimo())
                && estudianteRepository.existsByInstitucionIdAndNombresIgnoreCaseAndApellidosIgnoreCaseAndIdNot(
                        estudiante.getInstitucionId(), nombres, apellidos, id)) {
            throw new ApiException(HttpStatus.CONFLICT, MENSAJE_HOMONIMO);
        }

        List<String> cambios = new ArrayList<>();
        if (cambianNombres) {
            cambios.add("nombres y apellidos modificados (valores omitidos por protección de datos)");
        }
        if (estudiante.getCurso() != request.curso()) {
            cambios.add("curso: '" + estudiante.getCurso() + "' -> '" + request.curso() + "'");
        }

        estudiante.setNombres(nombres);
        estudiante.setApellidos(apellidos);
        estudiante.setCurso(request.curso());
        estudiante = estudianteRepository.saveAndFlush(estudiante);

        auditoria.registrar("ESTUDIANTE_ACTUALIZADO", "ESTUDIANTE", id,
                "codigo=" + estudiante.getCodigoInterno() + "; "
                        + (cambios.isEmpty() ? "sin cambios" : String.join("; ", cambios)));
        return completo(estudiante);
    }

    @Transactional
    public EstudianteVista cambiarEstado(Long id, EstadoEstudiante nuevo, UsuarioPrincipal usuario) {
        Estudiante estudiante = buscar(id);
        alcance.verificar(usuario, estudiante.getInstitucionId());
        rechazarSiAnonimizado(estudiante, "su estado ya no cambia");

        EstadoEstudiante actual = estudiante.getEstado();
        if (actual == nuevo) {
            return completo(estudiante);
        }
        if (nuevo != EstadoEstudiante.ACTIVO && estudianteRepository.contarInscripcionesActivas(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El estudiante tiene inscripciones activas en clubes. Tramite primero su retiro de los clubes.");
        }
        estudiante.setEstado(nuevo);
        estudiante = estudianteRepository.saveAndFlush(estudiante);

        auditoria.registrar("ESTUDIANTE_ESTADO_CAMBIADO", "ESTUDIANTE", id,
                "codigo=" + estudiante.getCodigoInterno() + "; estado: '" + actual + "' -> '" + nuevo + "'");
        return completo(estudiante);
    }

    @Transactional
    public EstudianteResponse anonimizar(Long id, AnonimizacionRequest request, UsuarioPrincipal usuario) {
        if (!ROLES_DE_ANONIMIZACION.contains(usuario.getRolCodigo())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Solo el Administrador o el Responsable institucional pueden anonimizar estudiantes.");
        }
        Estudiante estudiante = buscar(id);
        alcance.verificar(usuario, estudiante.getInstitucionId());
        rechazarSiAnonimizado(estudiante, "la anonimización no se repite");
        String motivo = normalizar(request.motivo());
        if (motivo.length() < 10) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El motivo debe tener entre 10 y 300 caracteres.");
        }

        if (estudiante.getEstado() == EstadoEstudiante.ACTIVO) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante " + estudiante.getCodigoInterno()
                    + " está activo. Cambie primero su estado a Retirado o Egresado.");
        }
        if (estudianteRepository.contarInscripcionesActivas(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El estudiante tiene inscripciones activas en clubes. Tramite primero su retiro de los clubes.");
        }
        if (estudianteRepository.contarSolicitudesAbiertas(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante tiene solicitudes de inscripción pendientes "
                    + "o en revisión. Resuélvalas antes de anonimizarlo.");
        }
        if (estudianteRepository.contarRegistrosVinculados(id) == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante no tiene historial en el proyecto. "
                    + "Elimínelo en lugar de anonimizarlo.");
        }

        Instant ahora = Instant.now();

        List<Autorizacion> autorizaciones = autorizacionRepository.findByEstudianteIdOrderByTipoAsc(id);
        int documentos = 0;
        for (Autorizacion autorizacion : autorizaciones) {
            if (autorizacion.getDocumentoRuta() != null) {
                almacenamiento.eliminarAlConfirmar(autorizacion.getDocumentoRuta());
                documentos++;
            }
            depurar(autorizacion, ahora);
        }
        autorizacionRepository.saveAllAndFlush(autorizaciones);

        estudiante.setNombres(Estudiante.NOMBRE_ANONIMIZADO);
        estudiante.setApellidos("");
        estudiante.setAnonimizado(true);
        estudiante.setFechaAnonimizacion(ahora);
        estudiante.setMotivoAnonimizacion(motivo);
        estudiante.setAnonimizadoPor(usuario.getId());
        estudiante = estudianteRepository.saveAndFlush(estudiante);

        List<Certificado> certificados = certificadoRepository.findByEstudianteIdOrderByIdAsc(id);
        int pdfs = 0;
        for (Certificado certificado : certificados) {
            if (certificado.getArchivoEliminadoEn() == null) {
                almacenamiento.eliminarAlConfirmar(certificado.getArchivoRuta());
                certificado.setArchivoEliminadoEn(ahora);
                pdfs++;
            }
        }
        certificadoRepository.saveAllAndFlush(certificados);

        auditoria.registrar("ESTUDIANTE_ANONIMIZADO", "ESTUDIANTE", id,
                "codigo=" + estudiante.getCodigoInterno() + "; motivo: '" + motivo + "'"
                        + "; autorizaciones depuradas=" + autorizaciones.size()
                        + "; documentos de autorización eliminados=" + documentos
                        + "; PDF de certificados eliminados=" + pdfs);
        return completo(estudiante);
    }

    @Transactional
    public void eliminar(Long id, UsuarioPrincipal usuario) {
        Estudiante estudiante = buscar(id);
        alcance.verificar(usuario, estudiante.getInstitucionId());
        rechazarSiAnonimizado(estudiante, "su registro forma parte del historial y no se elimina");

        if (estudianteRepository.contarRegistrosVinculados(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El estudiante tiene registros vinculados (inscripciones, solicitudes, participaciones o certificados). "
                    + "No se puede eliminar; cambie su estado a Retirado o Egresado, o anonimice sus datos personales.");
        }

        List<Autorizacion> autorizaciones = autorizacionRepository.findByEstudianteIdOrderByTipoAsc(id);
        autorizaciones.stream()
                .map(Autorizacion::getDocumentoRuta)
                .filter(ruta -> ruta != null)
                .forEach(almacenamiento::eliminarAlConfirmar);
        autorizacionRepository.deleteAll(autorizaciones);
        autorizacionRepository.flush();

        String codigo = estudiante.getCodigoInterno();
        estudianteRepository.delete(estudiante);

        auditoria.registrar("ESTUDIANTE_ELIMINADO", "ESTUDIANTE", id,
                "codigo=" + codigo + "; se eliminaron sus autorizaciones y documentos");
    }

    private void depurar(Autorizacion autorizacion, Instant ahora) {
        autorizacion.setDocumentoRuta(null);
        autorizacion.setDocumentoNombre(null);
        autorizacion.setDocumentoTipo(null);
        autorizacion.setDocumentoTamano(null);
        autorizacion.setDocumentoHash(null);
        autorizacion.setDocumentoSubidoEn(null);
        autorizacion.setDocumentoSubidoPor(null);
        autorizacion.setObservacion(null);
        autorizacion.setRepresentanteNombres(null);
        autorizacion.setRepresentanteApellidos(null);
        autorizacion.setRepresentanteCedula(null);
        autorizacion.setRepresentanteParentesco(null);
        autorizacion.setRepresentanteTelefono(null);
        autorizacion.setRepresentanteCorreo(null);
        autorizacion.setAnonimizadaEn(ahora);
        autorizacion.setActualizadoEn(ahora);
    }

    private void rechazarSiAnonimizado(Estudiante estudiante, String consecuencia) {
        if (estudiante.isAnonimizado()) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante " + estudiante.getCodigoInterno()
                    + " fue anonimizado el " + estudiante.getFechaAnonimizacion().atZone(ZONA).format(FECHA)
                    + "; " + consecuencia + ".");
        }
    }

    private Estudiante buscar(Long id) {
        return estudianteRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Estudiante no encontrado."));
    }

    private EstudianteResponse completo(Estudiante estudiante) {
        return (EstudianteResponse) armar(List.of(estudiante), false).get(0);
    }

    private List<EstudianteVista> armar(List<Estudiante> estudiantes, boolean minima) {
        if (estudiantes.isEmpty()) {
            return List.of();
        }
        Set<Long> institucionIds = estudiantes.stream().map(Estudiante::getInstitucionId).collect(Collectors.toSet());
        Map<Long, String> instituciones = institucionRepository.findAllById(institucionIds).stream()
                .collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));

        List<EstudianteVista> vistas = new ArrayList<>();
        if (minima) {
            for (Estudiante e : estudiantes) {
                vistas.add(EstudianteResumenResponse.de(e, instituciones.get(e.getInstitucionId())));
            }
            return vistas;
        }

        List<Long> ids = estudiantes.stream().map(Estudiante::getId).toList();
        Map<Long, Map<TipoAutorizacion, EstadoAutorizacion>> autorizaciones = new HashMap<>();
        for (Autorizacion a : autorizacionRepository.findByEstudianteIdIn(ids)) {
            autorizaciones.computeIfAbsent(a.getEstudianteId(), k -> new EnumMap<>(TipoAutorizacion.class))
                    .put(a.getTipo(), a.getEstado());
        }
        for (Estudiante e : estudiantes) {
            Map<TipoAutorizacion, EstadoAutorizacion> mapa =
                    autorizaciones.getOrDefault(e.getId(), Collections.emptyMap());
            vistas.add(EstudianteResponse.de(e, instituciones.get(e.getInstitucionId()),
                    mapa.getOrDefault(TipoAutorizacion.PARTICIPACION, EstadoAutorizacion.PENDIENTE),
                    mapa.getOrDefault(TipoAutorizacion.USO_IMAGEN, EstadoAutorizacion.PENDIENTE)));
        }
        return vistas;
    }

    private String normalizar(String valor) {
        return valor.trim().replaceAll("\\s+", " ");
    }
}

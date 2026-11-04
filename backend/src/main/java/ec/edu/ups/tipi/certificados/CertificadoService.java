package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.almacenamiento.AlmacenamientoArchivos;
import ec.edu.ups.tipi.almacenamiento.ArchivoGuardado;
import ec.edu.ups.tipi.almacenamiento.TipoArchivo;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.certificados.dto.AnulacionRequest;
import ec.edu.ups.tipi.certificados.dto.CertificadoDescarga;
import ec.edu.ups.tipi.certificados.dto.CertificadoEmitirRequest;
import ec.edu.ups.tipi.certificados.dto.CertificadoResponse;
import ec.edu.ups.tipi.certificados.dto.CertificadoResumenResponse;
import ec.edu.ups.tipi.certificados.dto.CertificadoVista;
import ec.edu.ups.tipi.certificados.dto.ContextoCertificado;
import ec.edu.ups.tipi.certificados.dto.VerificacionPublicaResponse;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.Hashes;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.competencias.CategoriaCompetencia;
import ec.edu.ups.tipi.competencias.CategoriaCompetenciaRepository;
import ec.edu.ups.tipi.competencias.CompetenciaRepository;
import ec.edu.ups.tipi.competencias.EdicionCompetencia;
import ec.edu.ups.tipi.competencias.EdicionCompetenciaRepository;
import ec.edu.ups.tipi.competencias.ParticipacionCompetencia;
import ec.edu.ups.tipi.competencias.ParticipacionCompetenciaRepository;
import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.CursoRepository;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionCursoRepository;
import ec.edu.ups.tipi.inscripciones.ResultadoCurso;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
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

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CertificadoService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String ENTIDAD = "CERTIFICADO";

    private final CertificadoRepository certificadoRepository;
    private final InscripcionCursoRepository inscripcionCursoRepository;
    private final CursoRepository cursoRepository;
    private final ParticipacionCompetenciaRepository participacionRepository;
    private final CompetenciaRepository competenciaRepository;
    private final EdicionCompetenciaRepository edicionRepository;
    private final CategoriaCompetenciaRepository categoriaRepository;
    private final EstudianteRepository estudianteRepository;
    private final ClubRepository clubRepository;
    private final InstitucionRepository institucionRepository;
    private final DocenteRepository docenteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlmacenamientoArchivos almacenamiento;
    private final GeneradorPdfCertificado generadorPdf;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Value("${tipi.certificados.url-verificacion:${tipi.frontend.base-url}/verificar-certificado.html}")
    private String urlVerificacion;

    @Transactional(readOnly = true)
    public PaginaResponse<CertificadoVista> listar(String q, Long institucionId, Long clubId, Long estudianteId,
                                                   TipoCertificado tipo, EstadoCertificado estado,
                                                   LocalDate desde, LocalDate hasta, int pagina, int tamano,
                                                   UsuarioPrincipal usuario) {
        boolean minima = alcance.soloDatosMinimos(usuario);
        Specification<Certificado> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> susClubes = cq.subquery(Long.class);
                Root<Club> club = susClubes.from(Club.class);
                susClubes.select(club.get("id")).where(cb.equal(club.get("docenteId"), docenteId));
                return root.get("clubId").in(susClubes);
            });
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (StringUtils.hasText(q)) {
            String texto = q.trim().toLowerCase();
            String patron = "%" + texto + "%";
            Optional<String> codigo = CodigoVerificacion.normalizar(q);
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> coincidencias = cq.subquery(Long.class);
                Root<Estudiante> e = coincidencias.from(Estudiante.class);
                coincidencias.select(e.get("id")).where(minima
                        ? cb.like(cb.lower(e.get("codigoInterno")), patron)
                        : cb.or(cb.like(cb.lower(e.get("nombres")), patron),
                                cb.like(cb.lower(e.get("apellidos")), patron),
                                cb.like(cb.lower(e.get("codigoInterno")), patron)));
                return cb.or(root.get("estudianteId").in(coincidencias),
                        cb.like(cb.lower(root.get("titulo")), patron),
                        cb.equal(root.get("codigoVerificacion"), codigo.orElse("")));
            });
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId));
        }
        if (tipo != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("tipo"), tipo));
        }
        if (estado != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), estado));
        }
        if (desde != null) {
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.<LocalDate>get("fechaEmision"), desde));
        }
        if (hasta != null) {
            spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(root.<LocalDate>get("fechaEmision"), hasta));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Direction.DESC, "fechaEmision").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<Certificado> resultado = certificadoRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent(), minima), pageable,
                resultado.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public CertificadoVista obtener(Long id, UsuarioPrincipal usuario) {
        Certificado certificado = buscar(id);
        verificarLectura(usuario, certificado);
        return armar(List.of(certificado), alcance.soloDatosMinimos(usuario)).get(0);
    }

    @Transactional
    public CertificadoResponse emitir(CertificadoEmitirRequest request, UsuarioPrincipal usuario) {
        TipoCertificado tipo = request.tipo();
        if (tipo.deCurso() && (request.inscripcionCursoId() == null || request.participacionId() != null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Un certificado de curso se emite indicando solo "
                    + "inscripcionCursoId, la inscripción del estudiante en el curso.");
        }
        if (!tipo.deCurso() && (request.participacionId() == null || request.inscripcionCursoId() != null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Un certificado de competencia se emite indicando solo "
                    + "participacionId, la participación del estudiante en la competencia.");
        }

        Borrador borrador = tipo.deCurso()
                ? borradorCurso(tipo, request.inscripcionCursoId(), usuario)
                : borradorCompetencia(tipo, request.participacionId(), usuario);

        Optional<Certificado> vigente = tipo.deCurso()
                ? certificadoRepository.findFirstByTipoAndInscripcionCursoIdAndEstado(tipo,
                        request.inscripcionCursoId(), EstadoCertificado.EMITIDO)
                : certificadoRepository.findFirstByTipoAndParticipacionIdAndEstado(tipo,
                        request.participacionId(), EstadoCertificado.EMITIDO);
        if (vigente.isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante ya tiene un certificado vigente de este tipo ("
                    + vigente.get().getCodigoVerificacion() + "). Anúlelo si necesita emitir uno nuevo.");
        }

        String codigo = nuevoCodigo();
        LocalDate hoy = LocalDate.now(ZONA);
        Institucion institucion = institucionRepository.findById(borrador.estudiante().getInstitucionId()).orElseThrow();
        Usuario emisor = usuarioRepository.findById(usuario.getId()).orElseThrow();
        ContenidoCertificado contenido = new ContenidoCertificado(tipo, codigo, borrador.titulo(),
                borrador.estudiante().getNombres() + " " + borrador.estudiante().getApellidos(),
                institucion.getNombre(), borrador.cuerpo(), hoy,
                emisor.getNombres() + " " + emisor.getApellidos(), cargo(usuario),
                enlace(codigo));
        byte[] pdf = generadorPdf.generar(contenido);
        ArchivoGuardado archivo = almacenamiento.guardarGenerado(pdf, TipoArchivo.PDF, "certificados",
                "certificado-" + codigo + ".pdf");

        Certificado certificado = new Certificado();
        certificado.setCodigoVerificacion(codigo);
        certificado.setEstudianteId(borrador.estudiante().getId());
        certificado.setInstitucionId(borrador.estudiante().getInstitucionId());
        certificado.setClubId(borrador.club().getId());
        certificado.setTipo(tipo);
        certificado.setInscripcionCursoId(request.inscripcionCursoId());
        certificado.setParticipacionId(request.participacionId());
        certificado.setTitulo(borrador.titulo());
        certificado.setFechaEmision(hoy);
        certificado.setEmitidoPor(usuario.getId());
        certificado.setArchivoRuta(archivo.ruta());
        certificado.setArchivoHash(archivo.hash());
        certificado.setArchivoTamano(archivo.tamano());
        certificado.setCreatedAt(Instant.now());
        certificado = certificadoRepository.saveAndFlush(certificado);

        auditoria.registrar("CERTIFICADO_EMITIDO", ENTIDAD, certificado.getId(),
                "codigo=" + borrador.estudiante().getCodigoInterno() + ", tipo=" + tipo
                        + (tipo.deCurso() ? ", inscripcionCursoId=" + request.inscripcionCursoId()
                                          : ", participacionId=" + request.participacionId())
                        + ", clubId=" + borrador.club().getId() + ", verificacion=" + codigo
                        + ", hash=" + archivo.hash().substring(0, 12));
        return (CertificadoResponse) armar(List.of(certificado), false).get(0);
    }

    @Transactional
    public CertificadoResponse anular(Long id, AnulacionRequest request, UsuarioPrincipal usuario) {
        Certificado certificado = buscar(id);
        alcance.verificar(usuario, certificado.getInstitucionId());
        if (certificado.getEstado() == EstadoCertificado.ANULADO) {
            throw new ApiException(HttpStatus.CONFLICT, "El certificado " + certificado.getCodigoVerificacion()
                    + " ya está anulado.");
        }
        certificado.setEstado(EstadoCertificado.ANULADO);
        certificado.setAnuladoPor(usuario.getId());
        certificado.setFechaAnulacion(Instant.now());
        certificado.setMotivoAnulacion(request.motivo().trim().replaceAll("\\s+", " "));
        certificado = certificadoRepository.saveAndFlush(certificado);

        auditoria.registrar("CERTIFICADO_ANULADO", ENTIDAD, id,
                "codigo=" + codigoEstudiante(certificado) + ", tipo=" + certificado.getTipo()
                        + ", verificacion=" + certificado.getCodigoVerificacion() + ", motivo registrado");
        return (CertificadoResponse) armar(List.of(certificado), false).get(0);
    }

    @Transactional
    public CertificadoDescarga descargar(Long id, UsuarioPrincipal usuario) {
        Certificado certificado = buscar(id);
        verificarLectura(usuario, certificado);
        if (certificado.getEstado() == EstadoCertificado.ANULADO) {
            throw new ApiException(HttpStatus.CONFLICT, "El certificado " + certificado.getCodigoVerificacion()
                    + " está anulado y su PDF ya no se entrega.");
        }
        Resource recurso = almacenamiento.abrir(certificado.getArchivoRuta());
        verificarHuella(certificado, recurso);
        auditoria.registrar("CERTIFICADO_DESCARGADO", ENTIDAD, id,
                "codigo=" + codigoEstudiante(certificado) + ", verificacion=" + certificado.getCodigoVerificacion());
        return new CertificadoDescarga(recurso, "certificado-" + certificado.getCodigoVerificacion() + ".pdf",
                certificado.getArchivoTamano());
    }

    @Transactional(readOnly = true)
    public VerificacionPublicaResponse verificarPublico(String codigoIngresado) {
        String codigo = CodigoVerificacion.normalizar(codigoIngresado).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST,
                        "El código de verificación debe tener el formato TIPI-XXXX-XXXX-XXXX."));
        Certificado certificado = certificadoRepository.findByCodigoVerificacion(codigo).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "No existe un certificado con el código " + codigo + "."));
        String institucion = institucionRepository.findById(certificado.getInstitucionId())
                .map(Institucion::getNombre).orElse(null);
        boolean valido = certificado.getEstado() == EstadoCertificado.EMITIDO;
        LocalDate fechaAnulacion = certificado.getFechaAnulacion() == null ? null
                : certificado.getFechaAnulacion().atZone(ZONA).toLocalDate();
        String mensaje = valido
                ? "Certificado válido. Para confirmar que el PDF que recibió no fue alterado, calcule su huella "
                  + "SHA-256 y compárela con archivoHash."
                : "Este certificado fue anulado el " + fechaAnulacion.format(FECHA) + " y ya no tiene validez.";
        return new VerificacionPublicaResponse(certificado.getCodigoVerificacion(), valido, certificado.getEstado(),
                certificado.getTipo(), certificado.getTitulo(), institucion, certificado.getFechaEmision(),
                fechaAnulacion, valido ? certificado.getArchivoHash() : null, mensaje);
    }

    private Borrador borradorCurso(TipoCertificado tipo, Long inscripcionCursoId, UsuarioPrincipal usuario) {
        InscripcionCurso inscripcion = inscripcionCursoRepository.findById(inscripcionCursoId).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "La inscripción en el curso indicada no existe."));
        Curso curso = cursoRepository.findById(inscripcion.getCursoId()).orElseThrow();
        alcance.verificar(usuario, curso.getInstitucionId());
        if (inscripcion.getEstado() != EstadoInscripcionCurso.FINALIZADA) {
            throw new ApiException(HttpStatus.CONFLICT, "Solo se certifican cursos finalizados; la inscripción del "
                    + "estudiante en el curso «" + curso.getNombre() + "» está en estado " + inscripcion.getEstado() + ".");
        }
        if (tipo == TipoCertificado.APROBACION_CURSO && inscripcion.getResultado() != ResultadoCurso.APROBADO) {
            throw new ApiException(HttpStatus.CONFLICT, "El certificado de aprobación exige que el estudiante haya "
                    + "aprobado el curso «" + curso.getNombre() + "»; su resultado es "
                    + (inscripcion.getResultado() == null ? "sin registrar" : inscripcion.getResultado()) + ".");
        }
        Estudiante estudiante = estudianteRepository.findById(inscripcion.getEstudianteId()).orElseThrow();
        Club club = clubRepository.findById(inscripcion.getClubId()).orElseThrow();
        return new Borrador(estudiante, club, RedaccionCertificado.tituloCurso(tipo, curso),
                RedaccionCertificado.cuerpoCurso(tipo, curso, club.getNombre()));
    }

    private Borrador borradorCompetencia(TipoCertificado tipo, Long participacionId, UsuarioPrincipal usuario) {
        ParticipacionCompetencia participacion = participacionRepository.findById(participacionId).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "La participación indicada no existe."));
        alcance.verificar(usuario, participacion.getInstitucionId());
        EdicionCompetencia edicion = edicionRepository.findById(participacion.getEdicionId()).orElseThrow();
        LocalDate hoy = LocalDate.now(ZONA);
        if (edicion.getFechaInicio() == null || edicion.getFechaInicio().isAfter(hoy)) {
            throw new ApiException(HttpStatus.CONFLICT, "Solo se certifica la participación en una edición que ya "
                    + "empezó; «" + edicion.getNombre() + "» " + (edicion.getFechaInicio() == null
                    ? "no tiene fecha de inicio registrada." : "empieza el " + edicion.getFechaInicio().format(FECHA) + "."));
        }
        if (tipo == TipoCertificado.RECONOCIMIENTO_COMPETENCIA && participacion.getPuesto() == null
                && participacion.getReconocimiento() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "El certificado de reconocimiento exige que la participación "
                    + "tenga un puesto o un reconocimiento registrado.");
        }
        CategoriaCompetencia categoria = categoriaRepository.findById(participacion.getCategoriaId()).orElseThrow();
        String competencia = competenciaRepository.findById(participacion.getCompetenciaId()).orElseThrow().getNombre();
        Estudiante estudiante = estudianteRepository.findById(participacion.getEstudianteId()).orElseThrow();
        Club club = clubRepository.findById(participacion.getClubId()).orElseThrow();
        return new Borrador(estudiante, club,
                RedaccionCertificado.tituloCompetencia(tipo, participacion, edicion, categoria),
                RedaccionCertificado.cuerpoCompetencia(tipo, participacion, competencia, edicion, categoria,
                        club.getNombre()));
    }

    private void verificarHuella(Certificado certificado, Resource recurso) {
        try (InputStream entrada = recurso.getInputStream()) {
            String huella = Hashes.sha256Hex(entrada.readAllBytes());
            if (!huella.equals(certificado.getArchivoHash())) {
                log.error("El PDF del certificado {} no coincide con su huella registrada", certificado.getId());
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "El archivo del certificado no coincide "
                        + "con su huella registrada. Informe al Administrador del sistema.");
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo leer el archivo del certificado.");
        }
    }

    private String nuevoCodigo() {
        for (int intento = 0; intento < 5; intento++) {
            String codigo = CodigoVerificacion.generar();
            if (!certificadoRepository.existsByCodigoVerificacion(codigo)) {
                return codigo;
            }
        }
        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo generar un código de verificación único. Intente nuevamente.");
    }

    private String enlace(String codigo) {
        return urlVerificacion + "?codigo=" + codigo;
    }

    private String cargo(UsuarioPrincipal usuario) {
        return "ADMIN".equals(usuario.getRolCodigo())
                ? "Administración del sistema TIPI 3.0"
                : "Responsable institucional";
    }

    private Certificado buscar(Long id) {
        return certificadoRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Certificado no encontrado."));
    }

    private void verificarLectura(UsuarioPrincipal usuario, Certificado certificado) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            boolean coordina = clubRepository.findById(certificado.getClubId())
                    .map(club -> docenteId.equals(club.getDocenteId()))
                    .orElse(false);
            if (!coordina) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre este certificado.");
            }
            return;
        }
        alcance.verificar(usuario, certificado.getInstitucionId());
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private String codigoEstudiante(Certificado certificado) {
        return estudianteRepository.findById(certificado.getEstudianteId())
                .map(Estudiante::getCodigoInterno)
                .orElse("?");
    }

    private List<CertificadoVista> armar(List<Certificado> certificados, boolean minima) {
        if (certificados.isEmpty()) {
            return List.of();
        }
        Map<Long, Estudiante> estudiantes = estudianteRepository.findAllById(ids(certificados, Certificado::getEstudianteId))
                .stream().collect(Collectors.toMap(Estudiante::getId, Function.identity()));
        Map<Long, String> instituciones = institucionRepository.findAllById(ids(certificados, Certificado::getInstitucionId))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Long, String> clubes = clubRepository.findAllById(ids(certificados, Certificado::getClubId))
                .stream().collect(Collectors.toMap(Club::getId, Club::getNombre));
        Map<Long, String> usuarios = minima ? Collections.emptyMap() : usuariosPorId(certificados);

        return certificados.stream()
                .map(c -> {
                    Estudiante e = estudiantes.get(c.getEstudianteId());
                    ContextoCertificado contexto = new ContextoCertificado(e.getCodigoInterno(),
                            minima ? null : e.getNombres(), minima ? null : e.getApellidos(),
                            instituciones.get(c.getInstitucionId()), clubes.get(c.getClubId()),
                            usuarios.get(c.getEmitidoPor()), usuarios.get(c.getAnuladoPor()),
                            enlace(c.getCodigoVerificacion()));
                    return minima
                            ? (CertificadoVista) CertificadoResumenResponse.de(c, contexto)
                            : (CertificadoVista) CertificadoResponse.de(c, contexto);
                })
                .toList();
    }

    private <K> Set<K> ids(Collection<Certificado> certificados, Function<Certificado, K> extractor) {
        return certificados.stream().map(extractor).collect(Collectors.toSet());
    }

    private Map<Long, String> usuariosPorId(List<Certificado> certificados) {
        Set<Long> ids = new HashSet<>();
        certificados.forEach(c -> {
            ids.add(c.getEmitidoPor());
            ids.add(c.getAnuladoPor());
        });
        ids.remove(null);
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return usuarioRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
    }

    private record Borrador(Estudiante estudiante, Club club, String titulo, String cuerpo) {
    }
}

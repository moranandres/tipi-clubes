package ec.edu.ups.tipi.evidencias;

import ec.edu.ups.tipi.actividades.Actividad;
import ec.edu.ups.tipi.actividades.ActividadRepository;
import ec.edu.ups.tipi.actividades.EstadoActividad;
import ec.edu.ups.tipi.almacenamiento.AlmacenamientoArchivos;
import ec.edu.ups.tipi.almacenamiento.ArchivoGuardado;
import ec.edu.ups.tipi.almacenamiento.TipoArchivo;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.Hashes;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.estudiantes.dto.DocumentoDescarga;
import ec.edu.ups.tipi.evidencias.dto.ClubEvidenciasResponse;
import ec.edu.ups.tipi.evidencias.dto.ConteoEvidencias;
import ec.edu.ups.tipi.evidencias.dto.EstudianteEvidenciaMinimaResponse;
import ec.edu.ups.tipi.evidencias.dto.EstudianteEvidenciaResponse;
import ec.edu.ups.tipi.evidencias.dto.EstudianteEvidenciaVista;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaActualizarRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaCrearRequest;
import ec.edu.ups.tipi.evidencias.dto.EvidenciaResponse;
import ec.edu.ups.tipi.evidencias.dto.EvidenciasActividadResponse;
import ec.edu.ups.tipi.evidencias.dto.ResumenEvidenciasResponse;
import ec.edu.ups.tipi.evidencias.dto.RetiroEvidenciaRequest;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.periodos.PeriodoAcademico;
import ec.edu.ups.tipi.periodos.PeriodoRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class EvidenciaService {

    public static final int MAXIMO_POR_ACTIVIDAD = 30;

    private static final long MAX_ARCHIVO_BYTES = 5L * 1024 * 1024;
    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Set<String> ROLES_GESTION = Set.of("ADMIN", "RESP_INSTITUCIONAL", "DOCENTE");
    private static final Map<TipoEvidencia, Set<TipoArchivo>> FORMATOS = Map.of(
            TipoEvidencia.FOTOGRAFIA, Set.of(TipoArchivo.JPEG, TipoArchivo.PNG),
            TipoEvidencia.DOCUMENTO, Set.of(TipoArchivo.PDF),
            TipoEvidencia.PRODUCTO, Set.of(TipoArchivo.PDF));
    private static final String SUBCARPETA = "evidencias";
    private static final String INDICE_ARCHIVO = "ux_evidencias_archivo_activo";
    private static final String INDICE_URL = "ux_evidencias_url_activa";
    private static final String ENTIDAD = "EVIDENCIA";

    private final EvidenciaRepository evidenciaRepository;
    private final ActividadRepository actividadRepository;
    private final ClubRepository clubRepository;
    private final DocenteRepository docenteRepository;
    private final EstudianteRepository estudianteRepository;
    private final InstitucionRepository institucionRepository;
    private final PeriodoRepository periodoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;
    private final AlmacenamientoArchivos almacenamiento;
    private final SaneamientoArchivos saneamiento;

    @Transactional(readOnly = true)
    public EvidenciasActividadResponse deActividad(Long actividadId, UsuarioPrincipal usuario) {
        Actividad actividad = buscarActividad(actividadId);
        Club club = clubDe(actividad);
        verificarLectura(usuario, actividad, club);
        boolean minima = alcance.soloDatosMinimos(usuario);
        List<Evidencia> evidencias = evidenciaRepository.findByActividadIdOrderByEstadoAscFechaEvidenciaDescIdDesc(
                actividadId);
        List<Evidencia> activas = evidencias.stream().filter(e -> e.getEstado() == EstadoEvidencia.ACTIVA).toList();
        String motivoNoEditable = puedeGestionar(usuario, actividad, club)
                ? motivoBloqueo(actividad, club)
                : "Su rol solo permite consultar las evidencias de esta actividad.";
        return new EvidenciasActividadResponse(actividad.getId(), actividad.getTema(), actividad.getFecha(),
                actividad.getEstado(), club.getId(), club.getNombre(), actividad.getInstitucionId(),
                motivoNoEditable == null, motivoNoEditable, activas.size(), evidencias.size() - activas.size(),
                MAXIMO_POR_ACTIVIDAD, conteo(activas), armarLista(evidencias, minima));
    }

    @Transactional(readOnly = true)
    public EvidenciaResponse obtener(Long id, UsuarioPrincipal usuario) {
        Evidencia evidencia = buscar(id);
        Actividad actividad = buscarActividad(evidencia.getActividadId());
        verificarLectura(usuario, actividad, clubDe(actividad));
        return armarLista(List.of(evidencia), alcance.soloDatosMinimos(usuario)).get(0);
    }

    @Transactional
    public EvidenciaResponse registrar(Long actividadId, EvidenciaCrearRequest request, MultipartFile archivo,
                                       UsuarioPrincipal usuario) {
        evidenciaRepository.bloquearActividad(actividadId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Actividad no encontrada."));
        Actividad actividad = buscarActividad(actividadId);
        Club club = clubDe(actividad);
        verificarEscritura(usuario, actividad, club);
        String bloqueo = motivoBloqueo(actividad, club);
        if (bloqueo != null) {
            throw new ApiException(HttpStatus.CONFLICT, bloqueo);
        }

        TipoEvidencia tipo = TipoEvidencia.valueOf(request.tipo());
        boolean conArchivo = archivo != null && !archivo.isEmpty();
        String url = limpiar(request.url());
        validarContenido(tipo, conArchivo, url);
        Set<Long> estudiantes = normalizar(request.estudianteIds());
        boolean sinEstudiantes = Boolean.TRUE.equals(request.sinEstudiantesIdentificables());
        validarDeclaracion(tipo, estudiantes, sinEstudiantes);
        LocalDate fecha = request.fechaEvidencia() != null ? request.fechaEvidencia() : actividad.getFecha();
        validarFecha(fecha, actividad);

        if (evidenciaRepository.countByActividadIdAndEstado(actividadId, EstadoEvidencia.ACTIVA) >= MAXIMO_POR_ACTIVIDAD) {
            throw new ApiException(HttpStatus.CONFLICT, "La actividad ya tiene " + MAXIMO_POR_ACTIVIDAD
                    + " evidencias activas, el máximo permitido. Retire alguna antes de agregar otra.");
        }
        validarEstudiantes(actividad, tipo, estudiantes);

        Evidencia evidencia = new Evidencia();
        evidencia.setActividadId(actividad.getId());
        evidencia.setClubId(actividad.getClubId());
        evidencia.setInstitucionId(actividad.getInstitucionId());
        evidencia.setTipo(tipo);
        evidencia.setTitulo(request.titulo().trim());
        evidencia.setDescripcion(request.descripcion().trim());
        evidencia.setFechaEvidencia(fecha);
        evidencia.setSinEstudiantesIdentificables(sinEstudiantes);
        evidencia.setEstudianteIds(new HashSet<>(estudiantes));
        evidencia.setRegistradoPor(usuario.getId());

        if (url != null) {
            String normalizada = validarUrl(url);
            evidenciaRepository.findFirstByActividadIdAndEstadoAndUrl(actividadId, EstadoEvidencia.ACTIVA, normalizada)
                    .ifPresent(e -> {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Este enlace ya está registrado como evidencia de la actividad («" + e.getTitulo() + "»).");
                    });
            evidencia.setUrl(normalizada);
        }
        if (conArchivo) {
            ArchivoPreparado preparado = saneamiento.preparar(archivo, FORMATOS.get(tipo), MAX_ARCHIVO_BYTES);
            String hash = Hashes.sha256Hex(preparado.contenido());
            evidenciaRepository.findFirstByActividadIdAndEstadoAndArchivoHash(actividadId, EstadoEvidencia.ACTIVA, hash)
                    .ifPresent(e -> {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Este archivo ya está registrado como evidencia de la actividad («" + e.getTitulo() + "»).");
                    });
            ArchivoGuardado guardado = almacenamiento.guardarGenerado(preparado.contenido(), preparado.tipo(),
                    SUBCARPETA, preparado.nombreOriginal());
            evidencia.setArchivoRuta(guardado.ruta());
            evidencia.setArchivoNombre(guardado.nombreOriginal());
            evidencia.setArchivoTipo(guardado.tipoMime());
            evidencia.setArchivoTamano(guardado.tamano());
            evidencia.setArchivoHash(guardado.hash());
        }

        evidencia = guardar(evidencia);

        StringBuilder detalle = new StringBuilder("actividadId=" + actividad.getId() + "; tipo=" + tipo
                + "; fecha=" + fecha);
        if (evidencia.getUrl() != null) {
            detalle.append("; url=").append(evidencia.getUrl());
        }
        if (evidencia.getArchivoHash() != null) {
            detalle.append("; formato=").append(evidencia.getArchivoTipo())
                    .append(", tamano=").append(evidencia.getArchivoTamano())
                    .append(", sha256=").append(evidencia.getArchivoHash());
        }
        if (!estudiantes.isEmpty()) {
            detalle.append("; estudianteIds=").append(new TreeSet<>(estudiantes));
        }
        if (sinEstudiantes) {
            detalle.append("; sin estudiantes identificables");
        }
        auditoria.registrar("EVIDENCIA_REGISTRADA", ENTIDAD, evidencia.getId(), detalle.toString());
        return armarLista(List.of(evidencia), false).get(0);
    }

    @Transactional
    public EvidenciaResponse actualizar(Long id, EvidenciaActualizarRequest request, UsuarioPrincipal usuario) {
        Evidencia evidencia = buscar(id);
        evidenciaRepository.bloquearActividad(evidencia.getActividadId());
        Actividad actividad = buscarActividad(evidencia.getActividadId());
        Club club = clubDe(actividad);
        verificarEscritura(usuario, actividad, club);
        verificarModificable(evidencia, actividad, club);

        Set<Long> estudiantes = normalizar(request.estudianteIds());
        boolean sinEstudiantes = Boolean.TRUE.equals(request.sinEstudiantesIdentificables());
        validarDeclaracion(evidencia.getTipo(), estudiantes, sinEstudiantes);
        validarFecha(request.fechaEvidencia(), actividad);
        Set<Long> agregados = new TreeSet<>(estudiantes);
        agregados.removeAll(evidencia.getEstudianteIds());
        Set<Long> quitados = new TreeSet<>(evidencia.getEstudianteIds());
        quitados.removeAll(estudiantes);
        validarEstudiantes(actividad, evidencia.getTipo(), agregados);

        String titulo = request.titulo().trim();
        String descripcion = request.descripcion().trim();
        List<String> cambios = new ArrayList<>();
        if (!titulo.equals(evidencia.getTitulo())) {
            cambios.add("titulo: '" + evidencia.getTitulo() + "' -> '" + titulo + "'");
        }
        if (!descripcion.equals(evidencia.getDescripcion())) {
            cambios.add("descripcion modificada");
        }
        if (!request.fechaEvidencia().equals(evidencia.getFechaEvidencia())) {
            cambios.add("fecha: '" + evidencia.getFechaEvidencia() + "' -> '" + request.fechaEvidencia() + "'");
        }
        if (sinEstudiantes != evidencia.isSinEstudiantesIdentificables()) {
            cambios.add("sinEstudiantesIdentificables: '" + evidencia.isSinEstudiantesIdentificables() + "' -> '"
                    + sinEstudiantes + "'");
        }
        if (!agregados.isEmpty()) {
            cambios.add("estudiantes agregados=" + agregados);
        }
        if (!quitados.isEmpty()) {
            cambios.add("estudiantes quitados=" + quitados);
        }
        if (cambios.isEmpty()) {
            return armarLista(List.of(evidencia), false).get(0);
        }

        evidencia.setTitulo(titulo);
        evidencia.setDescripcion(descripcion);
        evidencia.setFechaEvidencia(request.fechaEvidencia());
        evidencia.setSinEstudiantesIdentificables(sinEstudiantes);
        evidencia.getEstudianteIds().removeAll(quitados);
        evidencia.getEstudianteIds().addAll(agregados);
        evidencia.setActualizadoEn(Instant.now());
        evidencia = guardar(evidencia);
        auditoria.registrar("EVIDENCIA_ACTUALIZADA", ENTIDAD, evidencia.getId(), String.join("; ", cambios));
        return armarLista(List.of(evidencia), false).get(0);
    }

    @Transactional
    public EvidenciaResponse retirar(Long id, RetiroEvidenciaRequest request, UsuarioPrincipal usuario) {
        Evidencia evidencia = buscar(id);
        evidenciaRepository.bloquearActividad(evidencia.getActividadId());
        Actividad actividad = buscarActividad(evidencia.getActividadId());
        Club club = clubDe(actividad);
        verificarEscritura(usuario, actividad, club);
        verificarModificable(evidencia, actividad, club);

        String ruta = evidencia.getArchivoRuta();
        Instant ahora = Instant.now();
        String motivo = request.motivo().trim();
        evidencia.setEstado(EstadoEvidencia.RETIRADA);
        evidencia.setMotivoRetiro(motivo);
        evidencia.setRetiradaPor(usuario.getId());
        evidencia.setFechaRetiro(ahora);
        evidencia.setArchivoRuta(null);
        evidencia.setActualizadoEn(ahora);
        evidencia = evidenciaRepository.saveAndFlush(evidencia);
        if (ruta != null) {
            almacenamiento.eliminarAlConfirmar(ruta);
        }
        auditoria.registrar("EVIDENCIA_RETIRADA", ENTIDAD, evidencia.getId(), "actividadId=" + actividad.getId()
                + "; tipo=" + evidencia.getTipo()
                + (evidencia.getArchivoHash() != null
                ? "; sha256=" + evidencia.getArchivoHash() + "; archivo eliminado del repositorio" : "")
                + "; motivo=" + motivo);
        return armarLista(List.of(evidencia), false).get(0);
    }

    @Transactional
    public DocumentoDescarga descargar(Long id, UsuarioPrincipal usuario) {
        Evidencia evidencia = buscar(id);
        Actividad actividad = buscarActividad(evidencia.getActividadId());
        verificarLectura(usuario, actividad, clubDe(actividad));
        if (evidencia.getEstado() == EstadoEvidencia.RETIRADA) {
            throw new ApiException(HttpStatus.CONFLICT, "La evidencia fue retirada y su archivo se eliminó.");
        }
        if (evidencia.getArchivoRuta() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "La evidencia es un enlace y no tiene un archivo.");
        }
        Set<Long> autorizados = autorizadosDeImagen(evidencia.getEstudianteIds());
        String motivo = motivoNoDescargable(evidencia, autorizados);
        if (motivo != null) {
            throw new ApiException(HttpStatus.CONFLICT, motivo);
        }
        Resource recurso = almacenamiento.abrir(evidencia.getArchivoRuta());
        auditoria.registrar("EVIDENCIA_DESCARGADA", ENTIDAD, evidencia.getId(),
                "actividadId=" + actividad.getId() + "; tipo=" + evidencia.getTipo());
        return new DocumentoDescarga(recurso, evidencia.getArchivoTipo(), evidencia.getArchivoNombre(),
                evidencia.getArchivoTamano());
    }

    @Transactional(readOnly = true)
    public PaginaResponse<EvidenciaResponse> listar(Long institucionId, Long clubId, Long actividadId,
                                                    Long estudianteId, TipoEvidencia tipo, EstadoEvidencia estado,
                                                    LocalDate desde, LocalDate hasta, int pagina, int tamano,
                                                    UsuarioPrincipal usuario) {
        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha «hasta» no puede ser anterior a «desde».");
        }
        Specification<Evidencia> spec = (root, cq, cb) -> cb.conjunction();
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
                return cb.or(root.get("clubId").in(susClubes),
                        cb.equal(actividad(root).get("responsableId"), docenteId));
            });
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (actividadId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("actividadId"), actividadId));
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.isMember(estudianteId, root.<Collection<Long>>get("estudianteIds")));
        }
        if (tipo != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("tipo"), tipo));
        }
        EstadoEvidencia filtroEstado = estado != null ? estado : EstadoEvidencia.ACTIVA;
        spec = spec.and((root, cq, cb) -> cb.equal(root.get("estado"), filtroEstado));
        if (desde != null) {
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.get("fechaEvidencia"), desde));
        }
        if (hasta != null) {
            spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(root.get("fechaEvidencia"), hasta));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Order.desc("fechaEvidencia"), Sort.Order.desc("id")));
        Page<Evidencia> resultado = evidenciaRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armarLista(resultado.getContent(), alcance.soloDatosMinimos(usuario)),
                pageable, resultado.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ResumenEvidenciasResponse resumen(Integer periodoId, Long institucionId, UsuarioPrincipal usuario) {
        PeriodoAcademico periodo = periodoId != null
                ? periodoRepository.findById(periodoId).orElseThrow(() ->
                        new ApiException(HttpStatus.BAD_REQUEST, "El período académico indicado no existe."))
                : periodoRepository.findByActivoTrue().orElseThrow(() ->
                        new ApiException(HttpStatus.BAD_REQUEST,
                                "No hay un período académico activo; indique el período en «periodoId»."));
        long filtroInstitucion = 0L;
        long filtroDocente = 0L;
        if (alcance.esGlobal(usuario)) {
            filtroInstitucion = institucionId == null ? 0L : institucionId;
        } else if (esDocente(usuario)) {
            filtroDocente = docentePropio(usuario).getId();
        } else {
            if (institucionId != null) {
                alcance.verificar(usuario, institucionId);
            }
            filtroInstitucion = alcance.institucionPropia(usuario);
        }

        List<ClubEvidenciasResponse> clubes = new ArrayList<>();
        long conEvidencia = 0;
        long ejecutadas = 0;
        long ejecutadasConEvidencia = 0;
        long fotografias = 0;
        long documentos = 0;
        long enlaces = 0;
        long productos = 0;
        for (Object[] f : evidenciaRepository.resumenPorClub(periodo.getId(), filtroInstitucion, filtroDocente)) {
            ConteoEvidencias conteo = new ConteoEvidencias(numero(f[7]), numero(f[8]), numero(f[9]), numero(f[10]));
            boolean tiene = conteo.total() > 0;
            clubes.add(new ClubEvidenciasResponse(numero(f[0]), (String) f[1], EstadoClub.valueOf((String) f[2]),
                    numero(f[3]), (String) f[4], numero(f[5]), numero(f[6]), tiene, conteo));
            conEvidencia += tiene ? 1 : 0;
            ejecutadas += numero(f[5]);
            ejecutadasConEvidencia += numero(f[6]);
            fotografias += conteo.fotografias();
            documentos += conteo.documentos();
            enlaces += conteo.enlaces();
            productos += conteo.productos();
        }
        return new ResumenEvidenciasResponse(periodo.getId(), periodo.getNombre(),
                filtroInstitucion == 0L ? null : filtroInstitucion, clubes.size(), conEvidencia,
                porcentaje(conEvidencia, clubes.size()), ejecutadas, ejecutadasConEvidencia,
                porcentaje(ejecutadasConEvidencia, ejecutadas),
                new ConteoEvidencias(fotografias, documentos, enlaces, productos), clubes);
    }

    private List<EvidenciaResponse> armarLista(List<Evidencia> evidencias, boolean minima) {
        if (evidencias.isEmpty()) {
            return List.of();
        }
        Map<Long, Actividad> actividades = porId(actividadRepository.findAllById(
                ids(evidencias, Evidencia::getActividadId)), Actividad::getId);
        Map<Long, String> clubes = clubRepository.findAllById(ids(evidencias, Evidencia::getClubId)).stream()
                .collect(Collectors.toMap(Club::getId, Club::getNombre));
        Map<Long, String> instituciones = institucionRepository.findAllById(ids(evidencias, Evidencia::getInstitucionId))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Long, String> responsables = docenteRepository.findAllById(actividades.values().stream()
                        .map(Actividad::getResponsableId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Docente::getId, d -> d.getApellidos() + " " + d.getNombres()));
        Map<Long, String> usuarios = nombresUsuarios(evidencias.stream()
                .flatMap(e -> Stream.of(e.getRegistradoPor(), e.getRetiradaPor())));
        Set<Long> etiquetados = evidencias.stream().flatMap(e -> e.getEstudianteIds().stream())
                .collect(Collectors.toSet());
        Map<Long, Estudiante> estudiantes = etiquetados.isEmpty() ? Map.of()
                : porId(estudianteRepository.findAllById(etiquetados), Estudiante::getId);
        Set<Long> autorizados = autorizadosDeImagen(etiquetados);

        return evidencias.stream().map(e -> {
            Actividad act = actividades.get(e.getActividadId());
            List<EstudianteEvidenciaVista> relacionados = e.getEstudianteIds().stream()
                    .map(estudiantes::get)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(est -> claveOrden(est, minima)))
                    .map(est -> minima
                            ? (EstudianteEvidenciaVista) new EstudianteEvidenciaMinimaResponse(est.getId(),
                            est.getCodigoInterno(), autorizados.contains(est.getId()))
                            : new EstudianteEvidenciaResponse(est.getId(), est.getCodigoInterno(), est.getNombres(),
                            est.getApellidos(), autorizados.contains(est.getId())))
                    .toList();
            String motivo = motivoNoDescargable(e, autorizados);
            boolean descargable = motivo == null;
            return new EvidenciaResponse(e.getId(), act.getId(), act.getTema(), act.getFecha(),
                    responsables.get(act.getResponsableId()), e.getClubId(), clubes.get(e.getClubId()),
                    e.getInstitucionId(), instituciones.get(e.getInstitucionId()), e.getTipo(), e.getTitulo(),
                    e.getDescripcion(), e.getFechaEvidencia(), e.getUrl(), e.getArchivoNombre(), e.getArchivoTipo(),
                    e.getArchivoTamano(), e.getArchivoHash(), descargable, motivo,
                    descargable ? "/api/evidencias/" + e.getId() + "/archivo" : null,
                    e.isSinEstudiantesIdentificables(), relacionados, e.getEstado(),
                    usuarios.get(e.getRegistradoPor()), e.getFechaRegistro(), e.getActualizadoEn(),
                    e.getMotivoRetiro(), e.getRetiradaPor() == null ? null : usuarios.get(e.getRetiradaPor()),
                    e.getFechaRetiro());
        }).toList();
    }

    private String motivoNoDescargable(Evidencia evidencia, Set<Long> autorizados) {
        if (evidencia.getEstado() == EstadoEvidencia.RETIRADA) {
            return "La evidencia fue retirada y su archivo se eliminó.";
        }
        if (evidencia.getArchivoRuta() == null) {
            return "La evidencia es un enlace y no tiene un archivo.";
        }
        if (evidencia.getTipo() == TipoEvidencia.FOTOGRAFIA && !autorizados.containsAll(evidencia.getEstudianteIds())) {
            return "La fotografía no se muestra: al menos un estudiante que aparece en ella ya no tiene otorgada "
                    + "la autorización de uso de imagen.";
        }
        return null;
    }

    private void validarContenido(TipoEvidencia tipo, boolean conArchivo, String url) {
        switch (tipo) {
            case FOTOGRAFIA, DOCUMENTO -> {
                if (!conArchivo) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Adjunte el archivo de la evidencia en el campo «archivo».");
                }
                if (url != null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Una evidencia de tipo " + tipo
                            + " no lleva enlace; para registrar un enlace use el tipo ENLACE o PRODUCTO.");
                }
            }
            case ENLACE -> {
                if (url == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Indique el enlace de la evidencia en «url».");
                }
                if (conArchivo) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Una evidencia de tipo ENLACE no lleva archivo.");
                }
            }
            case PRODUCTO -> {
                if (conArchivo == (url != null)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Un producto se registra con un archivo PDF o con un enlace: indique solo uno de los dos.");
                }
            }
        }
    }

    private void validarDeclaracion(TipoEvidencia tipo, Set<Long> estudiantes, boolean sinEstudiantes) {
        if (sinEstudiantes && tipo != TipoEvidencia.FOTOGRAFIA) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La declaración «sin estudiantes identificables» solo aplica a fotografías.");
        }
        if ((tipo == TipoEvidencia.DOCUMENTO || tipo == TipoEvidencia.ENLACE) && !estudiantes.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Solo las fotografías y los productos se relacionan con estudiantes.");
        }
        if (tipo == TipoEvidencia.FOTOGRAFIA) {
            if (sinEstudiantes && !estudiantes.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Indique los estudiantes que aparecen en la fotografía "
                        + "o declárela sin estudiantes identificables, pero no ambas cosas.");
            }
            if (!sinEstudiantes && estudiantes.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Indique qué estudiantes aparecen en la fotografía "
                        + "(estudianteIds) o declárela sin estudiantes identificables (sinEstudiantesIdentificables = true).");
            }
        }
    }

    private void validarEstudiantes(Actividad actividad, TipoEvidencia tipo, Set<Long> estudiantes) {
        if (estudiantes.isEmpty()) {
            return;
        }
        Set<Long> integrantes = new HashSet<>(evidenciaRepository.integrantesEnFecha(actividad.getClubId(),
                estudiantes, actividad.getFecha()));
        List<Long> fuera = estudiantes.stream().filter(id -> !integrantes.contains(id)).sorted().toList();
        if (!fuera.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, (fuera.size() == 1
                    ? "El estudiante con id " + fuera.get(0) + " no era integrante del club"
                    : "Los estudiantes con id " + fuera + " no eran integrantes del club")
                    + " en la fecha de la actividad (" + actividad.getFecha().format(FECHA) + ").");
        }
        if (tipo == TipoEvidencia.FOTOGRAFIA) {
            Set<Long> autorizados = autorizadosDeImagen(estudiantes);
            List<Long> sinAutorizacion = estudiantes.stream().filter(id -> !autorizados.contains(id)).sorted().toList();
            if (!sinAutorizacion.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, (sinAutorizacion.size() == 1
                        ? "El estudiante con id " + sinAutorizacion.get(0) + " no tiene otorgada la autorización "
                        + "de uso de imagen; no puede aparecer"
                        : "Los estudiantes con id " + sinAutorizacion + " no tienen otorgada la autorización "
                        + "de uso de imagen; no pueden aparecer") + " en una fotografía de evidencia.");
            }
        }
    }

    private void validarFecha(LocalDate fecha, Actividad actividad) {
        if (fecha.isBefore(actividad.getFecha()) || fecha.isAfter(LocalDate.now(ZONA))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha de la evidencia debe estar entre la fecha de "
                    + "la actividad (" + actividad.getFecha().format(FECHA) + ") y hoy.");
        }
    }

    private String validarUrl(String url) {
        if (url.length() > 500) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El enlace admite máximo 500 caracteres.");
        }
        URI uri;
        try {
            uri = new URI(url);
        } catch (URISyntaxException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El enlace no es una dirección web válida. Revise que no tenga espacios.");
        }
        String esquema = uri.getScheme();
        if (esquema == null || !(esquema.equalsIgnoreCase("http") || esquema.equalsIgnoreCase("https"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El enlace debe empezar con http:// o https://.");
        }
        if (uri.getRawUserInfo() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El enlace no debe incluir usuario ni contraseña.");
        }
        if (uri.getHost() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El enlace no es una dirección web válida.");
        }
        return url;
    }

    private void verificarModificable(Evidencia evidencia, Actividad actividad, Club club) {
        if (evidencia.getEstado() == EstadoEvidencia.RETIRADA) {
            throw new ApiException(HttpStatus.CONFLICT, "La evidencia ya fue retirada y no se modifica.");
        }
        String bloqueo = motivoBloqueo(actividad, club);
        if (bloqueo != null) {
            throw new ApiException(HttpStatus.CONFLICT, bloqueo);
        }
    }

    private String motivoBloqueo(Actividad actividad, Club club) {
        if (actividad.getEstado() == EstadoActividad.PLANIFICADA) {
            return "La actividad aún no tiene registrada su ejecución; regístrela primero para adjuntar evidencias.";
        }
        if (actividad.getEstado() == EstadoActividad.CANCELADA) {
            return "La actividad fue cancelada y no lleva evidencias.";
        }
        if (club.getEstado() == EstadoClub.CERRADO) {
            return "El club está cerrado; sus evidencias forman parte del historial y ya no se modifican.";
        }
        return null;
    }

    private Evidencia guardar(Evidencia evidencia) {
        try {
            return evidenciaRepository.saveAndFlush(evidencia);
        } catch (DataIntegrityViolationException ex) {
            String detalle = ex.getMostSpecificCause().getMessage();
            if (detalle != null && detalle.contains(INDICE_ARCHIVO)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Otra persona registró al mismo tiempo este archivo como evidencia de la actividad.");
            }
            if (detalle != null && detalle.contains(INDICE_URL)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Otra persona registró al mismo tiempo este enlace como evidencia de la actividad.");
            }
            throw ex;
        }
    }

    private Evidencia buscar(Long id) {
        return evidenciaRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Evidencia no encontrada."));
    }

    private Actividad buscarActividad(Long id) {
        return actividadRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Actividad no encontrada."));
    }

    private Club clubDe(Actividad actividad) {
        return clubRepository.findById(actividad.getClubId()).orElseThrow(() ->
                new ApiException(HttpStatus.CONFLICT, "El club de la actividad no existe."));
    }

    private void verificarLectura(UsuarioPrincipal usuario, Actividad actividad, Club club) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), actividad, club)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre las evidencias de esta actividad.");
            }
            return;
        }
        alcance.verificar(usuario, actividad.getInstitucionId());
    }

    private void verificarEscritura(UsuarioPrincipal usuario, Actividad actividad, Club club) {
        if (esDocente(usuario)) {
            if (!esDelDocente(docentePropio(usuario).getId(), actividad, club)) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Solo puede gestionar las evidencias de los clubes que coordina o de las actividades de las que es responsable.");
            }
            return;
        }
        alcance.verificar(usuario, actividad.getInstitucionId());
    }

    private boolean puedeGestionar(UsuarioPrincipal usuario, Actividad actividad, Club club) {
        if (!ROLES_GESTION.contains(usuario.getRolCodigo())) {
            return false;
        }
        if (esDocente(usuario)) {
            return docenteRepository.findByUsuarioId(usuario.getId())
                    .map(d -> esDelDocente(d.getId(), actividad, club))
                    .orElse(false);
        }
        return alcance.esGlobal(usuario) || actividad.getInstitucionId().equals(usuario.getInstitucionId());
    }

    private boolean esDelDocente(Long docenteId, Actividad actividad, Club club) {
        return docenteId.equals(club.getDocenteId()) || docenteId.equals(actividad.getResponsableId());
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private Path<Actividad> actividad(Root<Evidencia> root) {
        return root.get("actividad");
    }

    private Set<Long> autorizadosDeImagen(Collection<Long> estudianteIds) {
        if (estudianteIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(evidenciaRepository.conAutorizacionDeImagen(estudianteIds));
    }

    private ConteoEvidencias conteo(List<Evidencia> evidencias) {
        Map<TipoEvidencia, Long> porTipo = evidencias.stream()
                .collect(Collectors.groupingBy(Evidencia::getTipo, Collectors.counting()));
        return new ConteoEvidencias(porTipo.getOrDefault(TipoEvidencia.FOTOGRAFIA, 0L),
                porTipo.getOrDefault(TipoEvidencia.DOCUMENTO, 0L), porTipo.getOrDefault(TipoEvidencia.ENLACE, 0L),
                porTipo.getOrDefault(TipoEvidencia.PRODUCTO, 0L));
    }

    private Set<Long> normalizar(List<Long> ids) {
        return ids == null ? new LinkedHashSet<>() : new LinkedHashSet<>(ids);
    }

    private String claveOrden(Estudiante e, boolean minima) {
        return minima ? e.getCodigoInterno()
                : (e.getApellidos() + " " + e.getNombres()).toLowerCase() + " " + e.getCodigoInterno();
    }

    private Double porcentaje(long numerador, long denominador) {
        if (denominador <= 0) {
            return null;
        }
        return BigDecimal.valueOf(numerador).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominador), 1, RoundingMode.HALF_UP).doubleValue();
    }

    private Map<Long, String> nombresUsuarios(Stream<Long> ids) {
        Set<Long> conjunto = ids.filter(Objects::nonNull).collect(Collectors.toSet());
        if (conjunto.isEmpty()) {
            return Map.of();
        }
        return usuarioRepository.findAllById(conjunto).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
    }

    private <K> Set<K> ids(List<Evidencia> evidencias, Function<Evidencia, K> campo) {
        return evidencias.stream().map(campo).filter(Objects::nonNull).collect(Collectors.toCollection(HashSet::new));
    }

    private <K, V> Map<K, V> porId(Collection<V> valores, Function<V, K> clave) {
        return valores.stream().collect(Collectors.toMap(clave, Function.identity()));
    }

    private long numero(Object valor) {
        return ((Number) valor).longValue();
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}

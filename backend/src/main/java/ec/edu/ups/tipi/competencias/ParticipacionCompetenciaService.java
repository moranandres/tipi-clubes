package ec.edu.ups.tipi.competencias;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.competencias.dto.ContextoParticipacion;
import ec.edu.ups.tipi.competencias.dto.ParticipacionActualizarRequest;
import ec.edu.ups.tipi.competencias.dto.ParticipacionCrearRequest;
import ec.edu.ups.tipi.competencias.dto.ParticipacionResponse;
import ec.edu.ups.tipi.competencias.dto.ParticipacionResumenResponse;
import ec.edu.ups.tipi.competencias.dto.ParticipacionVista;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.AutorizacionRepository;
import ec.edu.ups.tipi.estudiantes.EstadoAutorizacion;
import ec.edu.ups.tipi.estudiantes.EstadoEstudiante;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.estudiantes.TipoAutorizacion;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcion;
import ec.edu.ups.tipi.inscripciones.Inscripcion;
import ec.edu.ups.tipi.inscripciones.InscripcionRepository;
import ec.edu.ups.tipi.instituciones.Institucion;
import ec.edu.ups.tipi.instituciones.InstitucionRepository;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
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
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParticipacionCompetenciaService {

    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Set<EstadoClub> CLUB_OPERATIVO = Set.of(EstadoClub.PLANIFICADO, EstadoClub.ACTIVO);
    private static final String ENTIDAD = "PARTICIPACION_COMPETENCIA";

    private final ParticipacionCompetenciaRepository participacionRepository;
    private final CompetenciaRepository competenciaRepository;
    private final EdicionCompetenciaRepository edicionRepository;
    private final CategoriaCompetenciaRepository categoriaRepository;
    private final InscripcionRepository inscripcionRepository;
    private final EstudianteRepository estudianteRepository;
    private final AutorizacionRepository autorizacionRepository;
    private final ClubRepository clubRepository;
    private final InstitucionRepository institucionRepository;
    private final DocenteRepository docenteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public PaginaResponse<ParticipacionVista> listar(String q, Long institucionId, Long clubId, Long estudianteId,
                                                     Integer competenciaId, Integer edicionId, Integer categoriaId,
                                                     NivelCategoria nivel, String equipo, int pagina, int tamano,
                                                     UsuarioPrincipal usuario) {
        boolean minima = alcance.soloDatosMinimos(usuario);
        Specification<ParticipacionCompetencia> spec = (root, cq, cb) -> cb.conjunction();

        if (alcance.esGlobal(usuario)) {
            if (institucionId != null) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), institucionId));
            }
        } else if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            Long usuarioId = usuario.getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> susClubes = cq.subquery(Long.class);
                Root<Club> club = susClubes.from(Club.class);
                susClubes.select(club.get("id")).where(cb.equal(club.get("docenteId"), docenteId));
                return cb.or(root.get("clubId").in(susClubes), cb.equal(root.get("registradoPor"), usuarioId));
            });
        } else {
            Long propia = alcance.institucionPropia(usuario);
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("institucionId"), propia));
        }
        if (StringUtils.hasText(q)) {
            String patron = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> coincidencias = cq.subquery(Long.class);
                Root<Estudiante> e = coincidencias.from(Estudiante.class);
                coincidencias.select(e.get("id")).where(minima
                        ? cb.like(cb.lower(e.get("codigoInterno")), patron)
                        : cb.or(cb.like(cb.lower(e.get("nombres")), patron),
                                cb.like(cb.lower(e.get("apellidos")), patron),
                                cb.like(cb.lower(e.get("codigoInterno")), patron)));
                return root.get("estudianteId").in(coincidencias);
            });
        }
        if (clubId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("clubId"), clubId));
        }
        if (estudianteId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId));
        }
        if (competenciaId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("competenciaId"), competenciaId));
        }
        if (edicionId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("edicionId"), edicionId));
        }
        if (categoriaId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("categoriaId"), categoriaId));
        }
        if (nivel != null) {
            spec = spec.and((root, cq, cb) -> {
                Subquery<Integer> delNivel = cq.subquery(Integer.class);
                Root<CategoriaCompetencia> c = delNivel.from(CategoriaCompetencia.class);
                delNivel.select(c.get("id")).where(cb.equal(c.get("nivel"), nivel));
                return root.get("categoriaId").in(delNivel);
            });
        }
        if (StringUtils.hasText(equipo)) {
            String patron = "%" + equipo.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("equipoNombre")), patron));
        }

        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<ParticipacionCompetencia> resultado = participacionRepository.findAll(spec, pageable);
        return PaginaResponse.de(new PageImpl<>(armar(resultado.getContent(), minima), pageable,
                resultado.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ParticipacionVista obtener(Long id, UsuarioPrincipal usuario) {
        ParticipacionCompetencia participacion = buscar(id);
        verificarLectura(usuario, participacion);
        return armar(List.of(participacion), alcance.soloDatosMinimos(usuario)).get(0);
    }

    @Transactional
    public ParticipacionResponse crear(ParticipacionCrearRequest request, UsuarioPrincipal usuario) {
        Inscripcion inscripcion = inscripcionRepository.findById(request.inscripcionId()).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "La inscripción indicada no existe."));
        Club club = clubRepository.findById(inscripcion.getClubId()).orElseThrow();
        verificarEscritura(usuario, inscripcion.getInstitucionId(), club,
                "Solo puede registrar participaciones de estudiantes de los clubes que coordina.");
        if (inscripcion.getEstado() != EstadoInscripcion.ACTIVA) {
            throw new ApiException(HttpStatus.CONFLICT, "Solo se registran participaciones de integrantes activos "
                    + "del club; la inscripción está en estado " + inscripcion.getEstado() + ".");
        }

        EdicionCompetencia edicion = edicionRepository.findById(request.edicionId()).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "La edición indicada no existe."));
        CategoriaCompetencia categoria = categoriaRepository.findById(request.categoriaId()).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "La categoría indicada no existe."));
        if (!categoria.getCompetenciaId().equals(edicion.getCompetenciaId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La categoría no pertenece a la misma competencia que la edición.");
        }
        Competencia competencia = competenciaRepository.findById(edicion.getCompetenciaId()).orElseThrow();
        if (!competencia.isActiva()) {
            throw new ApiException(HttpStatus.CONFLICT, "La competencia «" + competencia.getNombre()
                    + "» está inactiva y no admite nuevas participaciones.");
        }
        if (!edicion.isActiva()) {
            throw new ApiException(HttpStatus.CONFLICT, "La edición «" + edicion.getNombre()
                    + "» está inactiva y no admite nuevas participaciones.");
        }
        if (!categoria.isActiva()) {
            throw new ApiException(HttpStatus.CONFLICT, "La categoría «" + categoria.getNombre()
                    + "» está inactiva y no admite nuevas participaciones.");
        }

        Estudiante estudiante = estudianteRepository.findById(inscripcion.getEstudianteId()).orElseThrow();
        if (estudiante.getEstado() != EstadoEstudiante.ACTIVO) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante está en estado " + estudiante.getEstado()
                    + " y no puede registrar participaciones en competencias.");
        }
        if (!CLUB_OPERATIVO.contains(club.getEstado())) {
            throw new ApiException(HttpStatus.CONFLICT, "El club está en estado " + club.getEstado()
                    + " y no puede registrar participaciones en competencias.");
        }
        boolean autorizado = autorizacionRepository
                .findByEstudianteIdAndTipo(estudiante.getId(), TipoAutorizacion.PARTICIPACION)
                .map(a -> a.getEstado() == EstadoAutorizacion.OTORGADA)
                .orElse(false);
        if (!autorizado) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante no tiene la autorización de participación "
                    + "otorgada; regístrela antes de inscribirlo en una competencia.");
        }
        if (participacionRepository.existsByEstudianteIdAndEdicionIdAndCategoriaId(estudiante.getId(),
                edicion.getId(), categoria.getId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El estudiante ya tiene registrada una participación en esta categoría de la edición.");
        }

        ParticipacionActualizarRequest datos = request.datos();
        String equipo = resolverEquipo(edicion, categoria, limpiar(datos.equipoNombre()), club.getId(), -1L);
        verificarEquipo(edicion, categoria, equipo, club.getId());
        verificarResultados(edicion, datos.puesto(), limpiar(datos.reconocimiento()));

        ParticipacionCompetencia participacion = new ParticipacionCompetencia();
        participacion.setEstudianteId(estudiante.getId());
        participacion.setInstitucionId(inscripcion.getInstitucionId());
        participacion.setClubId(club.getId());
        participacion.setInscripcionId(inscripcion.getId());
        participacion.setCompetenciaId(competencia.getId());
        participacion.setEdicionId(edicion.getId());
        participacion.setCategoriaId(categoria.getId());
        aplicar(participacion, datos);
        participacion.setEquipoNombre(equipo);
        participacion.setRegistradoPor(usuario.getId());
        participacion.setCreatedAt(Instant.now());
        participacion = participacionRepository.saveAndFlush(participacion);

        auditoria.registrar("PARTICIPACION_COMPETENCIA_REGISTRADA", ENTIDAD, participacion.getId(),
                "codigo=" + estudiante.getCodigoInterno() + ", inscripcionId=" + inscripcion.getId()
                        + ", clubId=" + club.getId() + ", edicionId=" + edicion.getId()
                        + ", categoriaId=" + categoria.getId()
                        + ", equipo=" + (equipo == null ? "no" : "si")
                        + ", puesto=" + valor(participacion.getPuesto())
                        + ", reconocimiento=" + (participacion.getReconocimiento() == null ? "no" : "si"));

        List<String> avisos = new ArrayList<>();
        if (equipo != null) {
            long integrantes = participacionRepository.contarIntegrantesEquipo(edicion.getId(), categoria.getId(), equipo);
            avisos.add(integrantes == 1
                    ? "El equipo «" + equipo + "» queda registrado con su primer integrante en esta categoría."
                    : "El equipo «" + equipo + "» tiene ahora " + integrantes + " integrantes registrados en esta categoría.");
        }
        return completo(participacion, avisos);
    }

    @Transactional
    public ParticipacionResponse actualizar(Long id, ParticipacionActualizarRequest request, UsuarioPrincipal usuario) {
        ParticipacionCompetencia participacion = buscar(id);
        Club club = clubRepository.findById(participacion.getClubId()).orElseThrow();
        verificarEscritura(usuario, participacion.getInstitucionId(), club,
                "Solo puede modificar participaciones de los clubes que coordina.");

        EdicionCompetencia edicion = edicionRepository.findById(participacion.getEdicionId()).orElseThrow();
        CategoriaCompetencia categoria = categoriaRepository.findById(participacion.getCategoriaId()).orElseThrow();
        String equipo = resolverEquipo(edicion, categoria, limpiar(request.equipoNombre()), club.getId(), id);
        String reconocimiento = limpiar(request.reconocimiento());
        if (!Objects.equals(equipo, participacion.getEquipoNombre())) {
            verificarEquipo(edicion, categoria, equipo, club.getId());
        }
        Short puestoNuevo = request.puesto() == null ? null : request.puesto().shortValue();
        if (!Objects.equals(puestoNuevo, participacion.getPuesto())
                || !Objects.equals(reconocimiento, participacion.getReconocimiento())) {
            verificarResultados(edicion, request.puesto(), reconocimiento);
        }

        Short puestoAnterior = participacion.getPuesto();
        String equipoAnterior = participacion.getEquipoNombre();
        String reconocimientoAnterior = participacion.getReconocimiento();
        String observacionesAnteriores = participacion.getObservaciones();
        aplicar(participacion, request);
        participacion.setEquipoNombre(equipo);

        List<String> cambios = new ArrayList<>();
        if (!Objects.equals(puestoAnterior, participacion.getPuesto())) {
            cambios.add("puesto: '" + valor(puestoAnterior) + "' -> '"
                    + valor(participacion.getPuesto()) + "'");
        }
        if (!Objects.equals(equipoAnterior, participacion.getEquipoNombre())) {
            cambios.add("equipo modificado");
        }
        if (!Objects.equals(reconocimientoAnterior, participacion.getReconocimiento())) {
            cambios.add("reconocimiento modificado");
        }
        if (!Objects.equals(observacionesAnteriores, participacion.getObservaciones())) {
            cambios.add("observaciones modificadas");
        }
        if (cambios.isEmpty()) {
            return completo(participacion, List.of("No había cambios que guardar."));
        }

        participacion.setActualizadoPor(usuario.getId());
        participacion.setUpdatedAt(Instant.now());
        participacion = participacionRepository.saveAndFlush(participacion);
        auditoria.registrar("PARTICIPACION_COMPETENCIA_ACTUALIZADA", ENTIDAD, id,
                "codigo=" + codigoEstudiante(participacion) + "; " + String.join("; ", cambios));
        return completo(participacion, List.of());
    }

    @Transactional
    public void eliminar(Long id, UsuarioPrincipal usuario) {
        ParticipacionCompetencia participacion = buscar(id);
        Club club = clubRepository.findById(participacion.getClubId()).orElseThrow();
        verificarEscritura(usuario, participacion.getInstitucionId(), club,
                "Solo puede eliminar participaciones de los clubes que coordina.");
        if (participacionRepository.contarCertificados(id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "La participación tiene certificados registrados y forma "
                    + "parte del historial; no se puede eliminar.");
        }
        String detalle = "codigo=" + codigoEstudiante(participacion) + ", inscripcionId="
                + participacion.getInscripcionId() + ", edicionId=" + participacion.getEdicionId()
                + ", categoriaId=" + participacion.getCategoriaId();
        participacionRepository.delete(participacion);
        participacionRepository.flush();
        auditoria.registrar("PARTICIPACION_COMPETENCIA_ELIMINADA", ENTIDAD, id, detalle);
    }

    private ParticipacionCompetencia buscar(Long id) {
        return participacionRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Participación no encontrada."));
    }

    private void verificarEscritura(UsuarioPrincipal usuario, Long institucionId, Club club, String mensajeDocente) {
        if (esDocente(usuario)) {
            if (!docentePropio(usuario).getId().equals(club.getDocenteId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, mensajeDocente);
            }
            return;
        }
        alcance.verificar(usuario, institucionId);
    }

    private void verificarLectura(UsuarioPrincipal usuario, ParticipacionCompetencia participacion) {
        if (alcance.esGlobal(usuario)) {
            return;
        }
        if (esDocente(usuario)) {
            Long docenteId = docentePropio(usuario).getId();
            boolean coordina = clubRepository.findById(participacion.getClubId())
                    .map(club -> docenteId.equals(club.getDocenteId()))
                    .orElse(false);
            if (!coordina && !participacion.getRegistradoPor().equals(usuario.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre esta participación.");
            }
            return;
        }
        alcance.verificar(usuario, participacion.getInstitucionId());
    }

    private void verificarEquipo(EdicionCompetencia edicion, CategoriaCompetencia categoria, String equipo,
                                 Long clubId) {
        if (equipo != null && participacionRepository.equipoEnOtroClub(edicion.getId(), categoria.getId(), equipo,
                clubId)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "El equipo «" + equipo + "» ya está registrado en esta edición y categoría por otro club.");
        }
    }

    private String resolverEquipo(EdicionCompetencia edicion, CategoriaCompetencia categoria, String equipo,
                                  Long clubId, Long excluirId) {
        if (equipo == null) {
            return null;
        }
        return participacionRepository.nombresEquipoEnClub(edicion.getId(), categoria.getId(), clubId, equipo,
                excluirId).stream().findFirst().orElse(equipo);
    }

    private void verificarResultados(EdicionCompetencia edicion, Integer puesto, String reconocimiento) {
        if ((puesto != null || reconocimiento != null) && edicion.getFechaInicio() != null
                && edicion.getFechaInicio().isAfter(LocalDate.now(ZONA))) {
            throw new ApiException(HttpStatus.CONFLICT, "Los resultados (puesto o reconocimiento) solo se registran "
                    + "desde la fecha de inicio de la edición, el " + edicion.getFechaInicio().format(FECHA) + ".");
        }
    }

    private void aplicar(ParticipacionCompetencia p, ParticipacionActualizarRequest datos) {
        p.setEquipoNombre(limpiar(datos.equipoNombre()));
        p.setPuesto(datos.puesto() == null ? null : datos.puesto().shortValue());
        p.setReconocimiento(limpiar(datos.reconocimiento()));
        p.setObservaciones(datos.observaciones() == null || datos.observaciones().isBlank()
                ? null : datos.observaciones().trim());
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private Docente docentePropio(UsuarioPrincipal usuario) {
        return docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."));
    }

    private String codigoEstudiante(ParticipacionCompetencia participacion) {
        return estudianteRepository.findById(participacion.getEstudianteId())
                .map(Estudiante::getCodigoInterno)
                .orElse("?");
    }

    private ParticipacionResponse completo(ParticipacionCompetencia participacion, List<String> avisos) {
        ParticipacionResponse respuesta = (ParticipacionResponse) armar(List.of(participacion), false).get(0);
        return avisos.isEmpty() ? respuesta : respuesta.conAvisos(List.copyOf(avisos));
    }

    private List<ParticipacionVista> armar(List<ParticipacionCompetencia> participaciones, boolean minima) {
        if (participaciones.isEmpty()) {
            return List.of();
        }
        Map<Long, Estudiante> estudiantes = porId(estudianteRepository.findAllById(
                ids(participaciones, ParticipacionCompetencia::getEstudianteId)), Estudiante::getId);
        Map<Long, String> instituciones = institucionRepository.findAllById(
                        ids(participaciones, ParticipacionCompetencia::getInstitucionId))
                .stream().collect(Collectors.toMap(Institucion::getId, Institucion::getNombre));
        Map<Long, String> clubes = clubRepository.findAllById(ids(participaciones, ParticipacionCompetencia::getClubId))
                .stream().collect(Collectors.toMap(Club::getId, Club::getNombre));
        Map<Integer, String> competencias = competenciaRepository.findAllById(
                        ids(participaciones, ParticipacionCompetencia::getCompetenciaId))
                .stream().collect(Collectors.toMap(Competencia::getId, Competencia::getNombre));
        Map<Integer, EdicionCompetencia> ediciones = porId(edicionRepository.findAllById(
                ids(participaciones, ParticipacionCompetencia::getEdicionId)), EdicionCompetencia::getId);
        Map<Integer, CategoriaCompetencia> categorias = porId(categoriaRepository.findAllById(
                ids(participaciones, ParticipacionCompetencia::getCategoriaId)), CategoriaCompetencia::getId);
        Map<Long, String> usuarios = minima ? Collections.emptyMap() : usuariosPorId(participaciones);

        return participaciones.stream()
                .map(p -> {
                    EdicionCompetencia edicion = ediciones.get(p.getEdicionId());
                    CategoriaCompetencia categoria = categorias.get(p.getCategoriaId());
                    ContextoParticipacion contexto = new ContextoParticipacion(
                            instituciones.get(p.getInstitucionId()), clubes.get(p.getClubId()),
                            competencias.get(p.getCompetenciaId()), edicion.getNombre(), edicion.getAnio(),
                            categoria.getNombre(), categoria.getNivel());
                    Estudiante estudiante = estudiantes.get(p.getEstudianteId());
                    return minima
                            ? (ParticipacionVista) ParticipacionResumenResponse.de(p, estudiante.getCodigoInterno(), contexto)
                            : (ParticipacionVista) ParticipacionResponse.de(p, estudiante, contexto, usuarios);
                })
                .toList();
    }

    private <K> Set<K> ids(List<ParticipacionCompetencia> participaciones,
                           Function<ParticipacionCompetencia, K> extractor) {
        return participaciones.stream().map(extractor).collect(Collectors.toSet());
    }

    private <K, V> Map<K, V> porId(Collection<V> valores, Function<V, K> clave) {
        return valores.stream().collect(Collectors.toMap(clave, Function.identity()));
    }

    private Map<Long, String> usuariosPorId(List<ParticipacionCompetencia> participaciones) {
        Set<Long> ids = new HashSet<>();
        participaciones.forEach(p -> {
            ids.add(p.getRegistradoPor());
            ids.add(p.getActualizadoPor());
        });
        ids.remove(null);
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return usuarioRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombres() + " " + u.getApellidos()));
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim().replaceAll("\\s+", " ");
        return recortado.isEmpty() ? null : recortado;
    }

    private String valor(Object valor) {
        return valor == null ? "sin dato" : valor.toString();
    }
}

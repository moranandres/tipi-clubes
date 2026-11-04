package ec.edu.ups.tipi.competencias;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.competencias.dto.CategoriaRequest;
import ec.edu.ups.tipi.competencias.dto.CategoriaResponse;
import ec.edu.ups.tipi.competencias.dto.CompetenciaRequest;
import ec.edu.ups.tipi.competencias.dto.CompetenciaResponse;
import ec.edu.ups.tipi.competencias.dto.EdicionRequest;
import ec.edu.ups.tipi.competencias.dto.EdicionResponse;
import ec.edu.ups.tipi.competencias.dto.EstadoCatalogoRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static ec.edu.ups.tipi.common.CambiosAuditoria.diferencias;
import static ec.edu.ups.tipi.common.CambiosAuditoria.texto;

@Service
@RequiredArgsConstructor
public class CatalogoCompetenciaService {

    private final CompetenciaRepository competenciaRepository;
    private final EdicionCompetenciaRepository edicionRepository;
    private final CategoriaCompetenciaRepository categoriaRepository;
    private final ParticipacionCompetenciaRepository participacionRepository;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<CompetenciaResponse> listarCompetencias(Boolean activa) {
        List<Competencia> competencias = activa == null
                ? competenciaRepository.findAllByOrderByNombreAsc()
                : competenciaRepository.findByActivaOrderByNombreAsc(activa);
        return armarCompetencias(competencias);
    }

    @Transactional(readOnly = true)
    public CompetenciaResponse obtenerCompetencia(Integer id) {
        return armarCompetencias(List.of(buscarCompetencia(id))).get(0);
    }

    @Transactional
    public CompetenciaResponse crearCompetencia(CompetenciaRequest request) {
        String nombre = normalizar(request.nombre());
        if (competenciaRepository.existsByNombreIgnoreCase(nombre)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe una competencia con ese nombre.");
        }
        Competencia competencia = new Competencia();
        aplicar(competencia, request);
        competencia = competenciaRepository.saveAndFlush(competencia);
        auditoria.registrar("COMPETENCIA_CREADA", "COMPETENCIA", competencia.getId().longValue(),
                "nombre=" + competencia.getNombre());
        return armarCompetencias(List.of(competencia)).get(0);
    }

    @Transactional
    public CompetenciaResponse actualizarCompetencia(Integer id, CompetenciaRequest request) {
        Competencia competencia = buscarCompetencia(id);
        String nombre = normalizar(request.nombre());
        if (competenciaRepository.existsByNombreIgnoreCaseAndIdNot(nombre, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe otra competencia con ese nombre.");
        }
        Map<String, String> antes = instantanea(competencia);
        aplicar(competencia, request);
        competencia = competenciaRepository.saveAndFlush(competencia);
        auditoria.registrar("COMPETENCIA_ACTUALIZADA", "COMPETENCIA", id.longValue(),
                diferencias(antes, instantanea(competencia)));
        return armarCompetencias(List.of(competencia)).get(0);
    }

    @Transactional
    public CompetenciaResponse cambiarEstadoCompetencia(Integer id, EstadoCatalogoRequest request) {
        Competencia competencia = buscarCompetencia(id);
        verificarCambioEstado(competencia.isActiva(), request.activa(), "La competencia");
        competencia.setActiva(request.activa());
        competencia = competenciaRepository.saveAndFlush(competencia);
        auditoria.registrar(request.activa() ? "COMPETENCIA_ACTIVADA" : "COMPETENCIA_DESACTIVADA", "COMPETENCIA",
                id.longValue(), "activa: '" + !request.activa() + "' -> '" + request.activa() + "'");
        return armarCompetencias(List.of(competencia)).get(0);
    }

    @Transactional(readOnly = true)
    public List<EdicionResponse> listarEdiciones(Integer competenciaId, Integer anio, Boolean activa) {
        Competencia competencia = buscarCompetencia(competenciaId);
        List<EdicionCompetencia> ediciones = edicionRepository.findByCompetenciaIdOrderByAnioDescNombreAsc(competenciaId)
                .stream()
                .filter(e -> anio == null || e.getAnio().intValue() == anio)
                .filter(e -> activa == null || e.isActiva() == activa)
                .toList();
        return armarEdiciones(ediciones, competencia.getNombre());
    }

    @Transactional
    public EdicionResponse crearEdicion(Integer competenciaId, EdicionRequest request) {
        Competencia competencia = buscarCompetencia(competenciaId);
        if (!competencia.isActiva()) {
            throw new ApiException(HttpStatus.CONFLICT, "La competencia «" + competencia.getNombre()
                    + "» está inactiva; actívela antes de agregar ediciones.");
        }
        String nombre = normalizar(request.nombre());
        if (edicionRepository.existsByCompetenciaIdAndNombreIgnoreCase(competenciaId, nombre)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe una edición con ese nombre en la competencia.");
        }
        validarFechas(request);
        EdicionCompetencia edicion = new EdicionCompetencia();
        edicion.setCompetenciaId(competenciaId);
        aplicar(edicion, request);
        edicion = edicionRepository.saveAndFlush(edicion);
        auditoria.registrar("EDICION_COMPETENCIA_CREADA", "EDICION_COMPETENCIA", edicion.getId().longValue(),
                "competenciaId=" + competenciaId + ", nombre=" + edicion.getNombre() + ", anio=" + edicion.getAnio()
                        + ", fechaInicio=" + texto(edicion.getFechaInicio()) + ", fechaFin=" + texto(edicion.getFechaFin()));
        return armarEdiciones(List.of(edicion), competencia.getNombre()).get(0);
    }

    @Transactional
    public EdicionResponse actualizarEdicion(Integer competenciaId, Integer id, EdicionRequest request) {
        Competencia competencia = buscarCompetencia(competenciaId);
        EdicionCompetencia edicion = buscarEdicion(competenciaId, id);
        String nombre = normalizar(request.nombre());
        if (edicionRepository.existsByCompetenciaIdAndNombreIgnoreCaseAndIdNot(competenciaId, nombre, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe otra edición con ese nombre en la competencia.");
        }
        validarFechas(request);
        Map<String, String> antes = instantanea(edicion);
        aplicar(edicion, request);
        edicion = edicionRepository.saveAndFlush(edicion);
        auditoria.registrar("EDICION_COMPETENCIA_ACTUALIZADA", "EDICION_COMPETENCIA", id.longValue(),
                diferencias(antes, instantanea(edicion)));
        return armarEdiciones(List.of(edicion), competencia.getNombre()).get(0);
    }

    @Transactional
    public EdicionResponse cambiarEstadoEdicion(Integer competenciaId, Integer id, EstadoCatalogoRequest request) {
        Competencia competencia = buscarCompetencia(competenciaId);
        EdicionCompetencia edicion = buscarEdicion(competenciaId, id);
        verificarCambioEstado(edicion.isActiva(), request.activa(), "La edición");
        edicion.setActiva(request.activa());
        edicion = edicionRepository.saveAndFlush(edicion);
        auditoria.registrar(request.activa() ? "EDICION_COMPETENCIA_ACTIVADA" : "EDICION_COMPETENCIA_DESACTIVADA",
                "EDICION_COMPETENCIA", id.longValue(),
                "activa: '" + !request.activa() + "' -> '" + request.activa() + "'");
        return armarEdiciones(List.of(edicion), competencia.getNombre()).get(0);
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarCategorias(Integer competenciaId, NivelCategoria nivel, Boolean activa,
                                                    String q) {
        buscarCompetencia(competenciaId);
        String patron = StringUtils.hasText(q) ? q.trim().toLowerCase() : null;
        List<CategoriaCompetencia> categorias = categoriaRepository
                .findByCompetenciaIdOrderByNivelAscNombreAsc(competenciaId).stream()
                .filter(c -> nivel == null || c.getNivel() == nivel)
                .filter(c -> activa == null || c.isActiva() == activa)
                .filter(c -> patron == null || c.getNombre().toLowerCase().contains(patron))
                .toList();
        return armarCategorias(categorias);
    }

    @Transactional
    public CategoriaResponse crearCategoria(Integer competenciaId, CategoriaRequest request) {
        Competencia competencia = buscarCompetencia(competenciaId);
        if (!competencia.isActiva()) {
            throw new ApiException(HttpStatus.CONFLICT, "La competencia «" + competencia.getNombre()
                    + "» está inactiva; actívela antes de agregar categorías.");
        }
        String nombre = normalizar(request.nombre());
        if (categoriaRepository.existsByCompetenciaIdAndNivelAndNombreIgnoreCase(competenciaId, request.nivel(), nombre)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Ya existe una categoría con ese nombre en el nivel " + request.nivel() + ".");
        }
        CategoriaCompetencia categoria = new CategoriaCompetencia();
        categoria.setCompetenciaId(competenciaId);
        aplicar(categoria, request);
        categoria = categoriaRepository.saveAndFlush(categoria);
        auditoria.registrar("CATEGORIA_COMPETENCIA_CREADA", "CATEGORIA_COMPETENCIA", categoria.getId().longValue(),
                "competenciaId=" + competenciaId + ", nivel=" + categoria.getNivel() + ", nombre=" + categoria.getNombre());
        return armarCategorias(List.of(categoria)).get(0);
    }

    @Transactional
    public CategoriaResponse actualizarCategoria(Integer competenciaId, Integer id, CategoriaRequest request) {
        buscarCompetencia(competenciaId);
        CategoriaCompetencia categoria = buscarCategoria(competenciaId, id);
        String nombre = normalizar(request.nombre());
        if (categoriaRepository.existsByCompetenciaIdAndNivelAndNombreIgnoreCaseAndIdNot(competenciaId, request.nivel(),
                nombre, id)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Ya existe otra categoría con ese nombre en el nivel " + request.nivel() + ".");
        }
        if (request.nivel() != categoria.getNivel() && participacionRepository.existsByCategoriaId(id)) {
            throw new ApiException(HttpStatus.CONFLICT, "La categoría «" + categoria.getNombre()
                    + "» ya tiene participaciones registradas y su nivel no se puede cambiar.");
        }
        Map<String, String> antes = instantanea(categoria);
        String descripcionAnterior = categoria.getDescripcion();
        aplicar(categoria, request);
        categoria = categoriaRepository.saveAndFlush(categoria);
        String cambios = diferencias(antes, instantanea(categoria));
        if (!Objects.equals(descripcionAnterior, categoria.getDescripcion())) {
            cambios = "Sin cambios".equals(cambios) ? "descripcion modificada" : cambios + "; descripcion modificada";
        }
        auditoria.registrar("CATEGORIA_COMPETENCIA_ACTUALIZADA", "CATEGORIA_COMPETENCIA", id.longValue(), cambios);
        return armarCategorias(List.of(categoria)).get(0);
    }

    @Transactional
    public CategoriaResponse cambiarEstadoCategoria(Integer competenciaId, Integer id, EstadoCatalogoRequest request) {
        buscarCompetencia(competenciaId);
        CategoriaCompetencia categoria = buscarCategoria(competenciaId, id);
        verificarCambioEstado(categoria.isActiva(), request.activa(), "La categoría");
        categoria.setActiva(request.activa());
        categoria = categoriaRepository.saveAndFlush(categoria);
        auditoria.registrar(request.activa() ? "CATEGORIA_COMPETENCIA_ACTIVADA" : "CATEGORIA_COMPETENCIA_DESACTIVADA",
                "CATEGORIA_COMPETENCIA", id.longValue(),
                "activa: '" + !request.activa() + "' -> '" + request.activa() + "'");
        return armarCategorias(List.of(categoria)).get(0);
    }

    private Competencia buscarCompetencia(Integer id) {
        return competenciaRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Competencia no encontrada."));
    }

    private EdicionCompetencia buscarEdicion(Integer competenciaId, Integer id) {
        return edicionRepository.findById(id)
                .filter(e -> e.getCompetenciaId().equals(competenciaId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Edición no encontrada en esta competencia."));
    }

    private CategoriaCompetencia buscarCategoria(Integer competenciaId, Integer id) {
        return categoriaRepository.findById(id)
                .filter(c -> c.getCompetenciaId().equals(competenciaId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Categoría no encontrada en esta competencia."));
    }

    private void verificarCambioEstado(boolean actual, boolean nuevo, String sujeto) {
        if (actual == nuevo) {
            throw new ApiException(HttpStatus.CONFLICT, sujeto + " ya está " + (nuevo ? "activa." : "inactiva."));
        }
    }

    private void validarFechas(EdicionRequest request) {
        if (request.fechaFin() != null && request.fechaInicio() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Si indica la fecha de fin, indique también la fecha de inicio.");
        }
        if (request.fechaInicio() != null && request.fechaInicio().getYear() != request.anio()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La fecha de inicio debe corresponder al año de la edición (" + request.anio() + ").");
        }
        if (request.fechaInicio() != null && request.fechaFin() != null
                && request.fechaFin().isBefore(request.fechaInicio())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha de fin no puede ser anterior a la fecha de inicio.");
        }
    }

    private void aplicar(Competencia c, CompetenciaRequest r) {
        c.setNombre(normalizar(r.nombre()));
        c.setOrganizador(limpiar(r.organizador()));
        c.setSitioWeb(limpiar(r.sitioWeb()));
    }

    private void aplicar(EdicionCompetencia e, EdicionRequest r) {
        e.setNombre(normalizar(r.nombre()));
        e.setAnio(r.anio().shortValue());
        e.setFechaInicio(r.fechaInicio());
        e.setFechaFin(r.fechaFin());
        e.setSede(limpiar(r.sede()));
    }

    private void aplicar(CategoriaCompetencia c, CategoriaRequest r) {
        c.setNivel(r.nivel());
        c.setNombre(normalizar(r.nombre()));
        c.setDescripcion(limpiar(r.descripcion()));
    }

    private Map<String, String> instantanea(Competencia c) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("nombre", texto(c.getNombre()));
        m.put("organizador", texto(c.getOrganizador()));
        m.put("sitioWeb", texto(c.getSitioWeb()));
        return m;
    }

    private Map<String, String> instantanea(EdicionCompetencia e) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("nombre", texto(e.getNombre()));
        m.put("anio", texto(e.getAnio()));
        m.put("fechaInicio", texto(e.getFechaInicio()));
        m.put("fechaFin", texto(e.getFechaFin()));
        m.put("sede", texto(e.getSede()));
        return m;
    }

    private Map<String, String> instantanea(CategoriaCompetencia c) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("nivel", texto(c.getNivel()));
        m.put("nombre", texto(c.getNombre()));
        return m;
    }

    private List<CompetenciaResponse> armarCompetencias(List<Competencia> competencias) {
        Map<Integer, Long> ediciones = new HashMap<>();
        for (Object[] fila : edicionRepository.contarPorCompetencia()) {
            ediciones.put((Integer) fila[0], (Long) fila[1]);
        }
        Map<String, Long> categorias = new HashMap<>();
        for (Object[] fila : categoriaRepository.contarPorCompetenciaYNivel()) {
            categorias.put(fila[0] + ":" + fila[1], (Long) fila[2]);
        }
        return competencias.stream()
                .map(c -> CompetenciaResponse.de(c, ediciones.getOrDefault(c.getId(), 0L),
                        categorias.getOrDefault(c.getId() + ":" + NivelCategoria.BASICA, 0L),
                        categorias.getOrDefault(c.getId() + ":" + NivelCategoria.AVANZADA, 0L)))
                .toList();
    }

    private List<EdicionResponse> armarEdiciones(List<EdicionCompetencia> ediciones, String competenciaNombre) {
        Map<Integer, Long> conteo = conteo(ediciones.isEmpty() ? List.of()
                : participacionRepository.contarPorEdicion(ediciones.stream().map(EdicionCompetencia::getId).toList()));
        return ediciones.stream()
                .map(e -> EdicionResponse.de(e, competenciaNombre, conteo.getOrDefault(e.getId(), 0L)))
                .toList();
    }

    private List<CategoriaResponse> armarCategorias(List<CategoriaCompetencia> categorias) {
        Map<Integer, Long> conteo = conteo(categorias.isEmpty() ? List.of()
                : participacionRepository.contarPorCategoria(categorias.stream().map(CategoriaCompetencia::getId).toList()));
        return categorias.stream()
                .map(c -> CategoriaResponse.de(c, conteo.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    private Map<Integer, Long> conteo(Collection<Object[]> filas) {
        Map<Integer, Long> resultado = new HashMap<>();
        for (Object[] fila : filas) {
            resultado.put((Integer) fila[0], (Long) fila[1]);
        }
        return resultado;
    }

    private String normalizar(String valor) {
        return valor.trim().replaceAll("\\s+", " ");
    }

    private String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim().replaceAll("\\s+", " ");
        return recortado.isEmpty() ? null : recortado;
    }
}

package ec.edu.ups.tipi.historial;

import ec.edu.ups.tipi.certificados.CertificadoService;
import ec.edu.ups.tipi.certificados.EstadoCertificado;
import ec.edu.ups.tipi.certificados.dto.CertificadoResponse;
import ec.edu.ups.tipi.certificados.dto.CertificadoResumenResponse;
import ec.edu.ups.tipi.certificados.dto.CertificadoVista;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.PaginaResponse;
import ec.edu.ups.tipi.competencias.ParticipacionCompetenciaService;
import ec.edu.ups.tipi.competencias.dto.ParticipacionResponse;
import ec.edu.ups.tipi.competencias.dto.ParticipacionResumenResponse;
import ec.edu.ups.tipi.competencias.dto.ParticipacionVista;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.EstudianteService;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteVista;
import ec.edu.ups.tipi.historial.dto.EventoHistorialResponse;
import ec.edu.ups.tipi.historial.dto.HistorialResponse;
import ec.edu.ups.tipi.historial.dto.ResumenHistorial;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcion;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionService;
import ec.edu.ups.tipi.inscripciones.ResultadoCurso;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionCursoResponse;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionResponse;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionResumenResponse;
import ec.edu.ups.tipi.inscripciones.dto.InscripcionVista;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.IntFunction;

@Service
@RequiredArgsConstructor
public class HistorialService {

    private static final int TAMANO_LOTE = 100;

    private final EstudianteService estudianteService;
    private final InscripcionService inscripcionService;
    private final ParticipacionCompetenciaService participacionService;
    private final CertificadoService certificadoService;
    private final EventoHistorialRepository eventoRepository;
    private final DocenteRepository docenteRepository;
    private final AlcanceInstitucional alcance;

    @Transactional(readOnly = true)
    public HistorialResponse obtener(Long estudianteId, UsuarioPrincipal usuario) {
        EstudianteVista estudiante = estudianteService.obtener(estudianteId, usuario);

        List<InscripcionVista> clubes = todas(pagina -> inscripcionService.listar(
                null, null, null, estudianteId, null, pagina, TAMANO_LOTE, usuario));
        List<ParticipacionVista> competencias = todas(pagina -> participacionService.listar(
                null, null, null, estudianteId, null, null, null, null, null, pagina, TAMANO_LOTE, usuario));
        List<CertificadoVista> certificados = todas(pagina -> certificadoService.listar(
                null, null, null, estudianteId, null, null, null, null, pagina, TAMANO_LOTE, usuario));
        List<EventoHistorialResponse> lineaDeTiempo = eventos(estudianteId, usuario);

        return new HistorialResponse(estudiante, alcanceDe(usuario),
                resumen(clubes, competencias, certificados), clubes, competencias, certificados, lineaDeTiempo);
    }

    private AlcanceHistorial alcanceDe(UsuarioPrincipal usuario) {
        if (alcance.soloDatosMinimos(usuario)) {
            return AlcanceHistorial.VISTA_MINIMA;
        }
        return esDocente(usuario) ? AlcanceHistorial.CLUBES_DEL_DOCENTE : AlcanceHistorial.COMPLETO;
    }

    private List<EventoHistorialResponse> eventos(Long estudianteId, UsuarioPrincipal usuario) {
        Specification<EventoHistorial> spec = (root, cq, cb) -> cb.equal(root.get("estudianteId"), estudianteId);
        if (esDocente(usuario)) {
            Long docenteId = docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                    new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."))
                    .getId();
            Long usuarioId = usuario.getId();
            spec = spec.and((root, cq, cb) -> {
                Subquery<Long> susClubes = cq.subquery(Long.class);
                Root<Club> club = susClubes.from(Club.class);
                susClubes.select(club.get("id")).where(cb.equal(club.get("docenteId"), docenteId));
                return cb.or(root.get("clubId").in(susClubes), cb.equal(root.get("registradoPor"), usuarioId));
            });
        }
        return eventoRepository.findAll(spec, Sort.by("fecha", "orden", "referenciaId")).stream()
                .map(EventoHistorialResponse::de)
                .toList();
    }

    private ResumenHistorial resumen(List<InscripcionVista> clubes, List<ParticipacionVista> competencias,
                                     List<CertificadoVista> certificados) {
        List<InscripcionCursoResponse> cursos = clubes.stream().flatMap(c -> cursosDe(c).stream()).toList();
        LocalDate primerIngreso = clubes.stream().map(this::fechaIngresoDe)
                .min(Comparator.naturalOrder()).orElse(null);
        long periodos = clubes.stream().map(this::periodoDe).filter(Objects::nonNull).distinct().count();
        long clubesActivos = clubes.stream().filter(c -> estadoDe(c) == EstadoInscripcion.ACTIVA).count();
        long cursosEnMarcha = cursos.stream().filter(c -> c.estado() == EstadoInscripcionCurso.ACTIVA).count();
        long cursosFinalizados = cursos.stream().filter(c -> c.estado() == EstadoInscripcionCurso.FINALIZADA).count();
        long cursosAprobados = cursos.stream().filter(c -> c.resultado() == ResultadoCurso.APROBADO).count();
        long conResultado = competencias.stream()
                .filter(p -> puestoDe(p) != null || reconocimientoDe(p) != null).count();
        long podios = competencias.stream()
                .filter(p -> puestoDe(p) != null && puestoDe(p) <= 3).count();
        long vigentes = certificados.stream().filter(c -> estadoDe(c) == EstadoCertificado.EMITIDO).count();
        long anulados = certificados.stream().filter(c -> estadoDe(c) == EstadoCertificado.ANULADO).count();
        return new ResumenHistorial(primerIngreso, periodos, clubes.size(), clubesActivos, cursos.size(),
                cursosEnMarcha, cursosFinalizados, cursosAprobados, competencias.size(), conResultado, podios,
                vigentes, anulados);
    }

    private <T> List<T> todas(IntFunction<PaginaResponse<T>> consulta) {
        List<T> resultado = new ArrayList<>();
        int pagina = 0;
        PaginaResponse<T> actual;
        do {
            actual = consulta.apply(pagina++);
            resultado.addAll(actual.contenido());
        } while (pagina < actual.totalPaginas());
        return resultado;
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private List<InscripcionCursoResponse> cursosDe(InscripcionVista vista) {
        if (vista instanceof InscripcionResponse completa) {
            return completa.cursos();
        }
        return ((InscripcionResumenResponse) vista).cursos();
    }

    private LocalDate fechaIngresoDe(InscripcionVista vista) {
        if (vista instanceof InscripcionResponse completa) {
            return completa.fechaIngreso();
        }
        return ((InscripcionResumenResponse) vista).fechaIngreso();
    }

    private String periodoDe(InscripcionVista vista) {
        if (vista instanceof InscripcionResponse completa) {
            return completa.periodoNombre();
        }
        return ((InscripcionResumenResponse) vista).periodoNombre();
    }

    private EstadoInscripcion estadoDe(InscripcionVista vista) {
        if (vista instanceof InscripcionResponse completa) {
            return completa.estado();
        }
        return ((InscripcionResumenResponse) vista).estado();
    }

    private Short puestoDe(ParticipacionVista vista) {
        if (vista instanceof ParticipacionResponse completa) {
            return completa.puesto();
        }
        return ((ParticipacionResumenResponse) vista).puesto();
    }

    private String reconocimientoDe(ParticipacionVista vista) {
        if (vista instanceof ParticipacionResponse completa) {
            return completa.reconocimiento();
        }
        return ((ParticipacionResumenResponse) vista).reconocimiento();
    }

    private EstadoCertificado estadoDe(CertificadoVista vista) {
        if (vista instanceof CertificadoResponse completo) {
            return completo.estado();
        }
        return ((CertificadoResumenResponse) vista).estado();
    }
}

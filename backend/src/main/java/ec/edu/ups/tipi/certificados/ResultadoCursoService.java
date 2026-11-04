package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.certificados.dto.CertificadoVigente;
import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoResponse;
import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoResumenResponse;
import ec.edu.ups.tipi.certificados.dto.ParticipanteCursoVista;
import ec.edu.ups.tipi.certificados.dto.ResultadoCursoRequest;
import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.CursoRepository;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.inscripciones.EstadoInscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionCurso;
import ec.edu.ups.tipi.inscripciones.InscripcionCursoRepository;
import ec.edu.ups.tipi.inscripciones.ResultadoCurso;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResultadoCursoService {

    private final InscripcionCursoRepository inscripcionCursoRepository;
    private final CertificadoRepository certificadoRepository;
    private final CursoRepository cursoRepository;
    private final ClubRepository clubRepository;
    private final EstudianteRepository estudianteRepository;
    private final DocenteRepository docenteRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<ParticipanteCursoVista> participantes(Long cursoId, UsuarioPrincipal usuario) {
        Curso curso = cursoRepository.findById(cursoId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Curso no encontrado."));
        Club club = clubRepository.findById(curso.getClubId()).orElseThrow();
        if (esDocente(usuario)) {
            verificarDocente(usuario, club, "Solo puede consultar los participantes de los cursos de sus clubes.");
        } else {
            alcance.verificar(usuario, curso.getInstitucionId());
        }
        return armar(certificadoRepository.inscripcionesDelCurso(cursoId), alcance.soloDatosMinimos(usuario));
    }

    @Transactional
    public ParticipanteCursoResponse registrarResultado(Long inscripcionCursoId, ResultadoCursoRequest request,
                                                        UsuarioPrincipal usuario) {
        InscripcionCurso inscripcion = inscripcionCursoRepository.findById(inscripcionCursoId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Inscripción en el curso no encontrada."));
        Curso curso = cursoRepository.findById(inscripcion.getCursoId()).orElseThrow();
        Club club = clubRepository.findById(inscripcion.getClubId()).orElseThrow();
        if (esDocente(usuario)) {
            verificarDocente(usuario, club, "Solo puede registrar resultados de los cursos de sus clubes.");
        } else {
            alcance.verificar(usuario, curso.getInstitucionId());
        }
        if (inscripcion.getEstado() != EstadoInscripcionCurso.FINALIZADA) {
            throw new ApiException(HttpStatus.CONFLICT, "Solo se registra el resultado de quienes terminaron el curso; "
                    + "la inscripción en «" + curso.getNombre() + "» está en estado " + inscripcion.getEstado() + ".");
        }

        ResultadoCurso anterior = inscripcion.getResultado();
        ResultadoCurso nuevo = request.resultado();
        if (Objects.equals(anterior, nuevo)) {
            return completo(inscripcion, List.of("No había cambios que guardar."));
        }
        if (anterior == ResultadoCurso.APROBADO && certificadoRepository
                .findFirstByTipoAndInscripcionCursoIdAndEstado(TipoCertificado.APROBACION_CURSO, inscripcionCursoId,
                        EstadoCertificado.EMITIDO).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "El estudiante tiene un certificado de aprobación vigente de "
                    + "este curso; anúlelo antes de cambiar el resultado.");
        }

        inscripcion.setResultado(nuevo);
        inscripcion = inscripcionCursoRepository.saveAndFlush(inscripcion);
        String codigo = estudianteRepository.findById(inscripcion.getEstudianteId())
                .map(Estudiante::getCodigoInterno).orElse("?");
        auditoria.registrar("RESULTADO_CURSO_REGISTRADO", "INSCRIPCION_CURSO", inscripcionCursoId,
                "codigo=" + codigo + ", cursoId=" + curso.getId() + ", resultado: '" + valor(anterior) + "' -> '"
                        + valor(nuevo) + "'");
        return completo(inscripcion, List.of());
    }

    private void verificarDocente(UsuarioPrincipal usuario, Club club, String mensaje) {
        Long docenteId = docenteRepository.findByUsuarioId(usuario.getId()).orElseThrow(() ->
                new ApiException(HttpStatus.FORBIDDEN, "Su usuario no está vinculado a un registro de docente."))
                .getId();
        if (!docenteId.equals(club.getDocenteId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, mensaje);
        }
    }

    private boolean esDocente(UsuarioPrincipal usuario) {
        return "DOCENTE".equals(usuario.getRolCodigo());
    }

    private ParticipanteCursoResponse completo(InscripcionCurso inscripcion, List<String> avisos) {
        ParticipanteCursoResponse respuesta = (ParticipanteCursoResponse) armar(List.of(inscripcion), false).get(0);
        return avisos.isEmpty() ? respuesta : respuesta.conAvisos(avisos);
    }

    private List<ParticipanteCursoVista> armar(List<InscripcionCurso> inscripciones, boolean minima) {
        if (inscripciones.isEmpty()) {
            return List.of();
        }
        Map<Long, Estudiante> estudiantes = estudianteRepository.findAllById(
                        inscripciones.stream().map(InscripcionCurso::getEstudianteId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Estudiante::getId, Function.identity()));
        Map<Long, List<CertificadoVigente>> vigentes = certificadoRepository
                .findByInscripcionCursoIdInAndEstadoOrderByIdAsc(
                        inscripciones.stream().map(InscripcionCurso::getId).toList(), EstadoCertificado.EMITIDO)
                .stream()
                .collect(Collectors.groupingBy(Certificado::getInscripcionCursoId,
                        Collectors.mapping(CertificadoVigente::de, Collectors.toList())));
        return inscripciones.stream()
                .map(ic -> {
                    Estudiante e = estudiantes.get(ic.getEstudianteId());
                    List<CertificadoVigente> suyos = vigentes.getOrDefault(ic.getId(), List.of());
                    return minima
                            ? (ParticipanteCursoVista) ParticipanteCursoResumenResponse.de(ic, e.getCodigoInterno(), suyos)
                            : (ParticipanteCursoVista) ParticipanteCursoResponse.de(ic, e, suyos);
                })
                .toList();
    }

    private String valor(ResultadoCurso resultado) {
        return resultado == null ? "sin dato" : resultado.name();
    }
}

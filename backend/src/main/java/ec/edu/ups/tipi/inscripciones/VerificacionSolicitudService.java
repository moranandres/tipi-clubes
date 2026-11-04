package ec.edu.ups.tipi.inscripciones;

import ec.edu.ups.tipi.clubes.Club;
import ec.edu.ups.tipi.clubes.ClubRepository;
import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.CursoRepository;
import ec.edu.ups.tipi.cursos.EstadoCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;
import ec.edu.ups.tipi.estudiantes.EstadoEstudiante;
import ec.edu.ups.tipi.estudiantes.Estudiante;
import ec.edu.ups.tipi.estudiantes.EstudianteRepository;
import ec.edu.ups.tipi.inscripciones.dto.ControlVerificacion;
import ec.edu.ups.tipi.inscripciones.dto.VerificacionResponse;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VerificacionSolicitudService {

    private static final Set<EstadoClub> CLUB_ABIERTO = Set.of(EstadoClub.PLANIFICADO, EstadoClub.ACTIVO);
    private static final Set<EstadoCurso> CURSO_ABIERTO = Set.of(EstadoCurso.PLANIFICADO, EstadoCurso.EN_CURSO);

    private final SolicitudInscripcionRepository solicitudRepository;
    private final InscripcionRepository inscripcionRepository;
    private final InscripcionCursoRepository inscripcionCursoRepository;
    private final EstudianteRepository estudianteRepository;
    private final ClubRepository clubRepository;
    private final CursoRepository cursoRepository;
    private final ReglasInscripcion reglas;
    private final AlcanceInstitucional alcance;

    @Transactional(readOnly = true)
    public VerificacionResponse verificar(Long id, Long cursoId, NivelCurso nivelAsignado, UsuarioPrincipal usuario) {
        SolicitudInscripcion solicitud = solicitudRepository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Solicitud de inscripción no encontrada."));
        alcance.verificar(usuario, solicitud.getInstitucionId());
        Estudiante estudiante = estudianteRepository.findById(solicitud.getEstudianteId()).orElseThrow();
        Club club = clubRepository.findById(solicitud.getClubId()).orElseThrow();
        Long cursoEvaluado = cursoId != null ? cursoId : solicitud.getCursoId();
        NivelCurso nivel = nivelAsignado != null ? nivelAsignado : solicitud.getNivel();

        List<ControlVerificacion> controles = new ArrayList<>();
        controles.add(new ControlVerificacion("Estado de la solicitud",
                solicitud.getEstado() == EstadoSolicitud.EN_REVISION,
                solicitud.getEstado() == EstadoSolicitud.EN_REVISION
                        ? "La solicitud está en revisión."
                        : "La solicitud debe estar en revisión para aprobarse; estado actual: " + solicitud.getEstado() + "."));
        boolean distinto = !solicitud.getSolicitadoPor().equals(usuario.getId());
        controles.add(new ControlVerificacion("Separación de funciones", distinto,
                distinto ? "Usted no registró esta solicitud."
                        : "Usted registró esta solicitud; debe aprobarla otro responsable o un administrador."));
        boolean activo = estudiante.getEstado() == EstadoEstudiante.ACTIVO;
        controles.add(new ControlVerificacion("Estudiante activo", activo,
                activo ? "El estudiante está activo." : "El estudiante está en estado " + estudiante.getEstado() + "."));
        boolean autorizado = reglas.participacionOtorgada(estudiante.getId());
        controles.add(new ControlVerificacion("Autorización de participación", autorizado,
                autorizado ? "La autorización de participación está otorgada."
                        : "Falta la autorización de participación otorgada por el representante."));
        boolean clubAbierto = CLUB_ABIERTO.contains(club.getEstado());
        controles.add(new ControlVerificacion("Club abierto", clubAbierto,
                "El club está en estado " + club.getEstado() + "."));

        boolean integrante = reglas.esIntegranteActivo(estudiante.getId(), club.getId());
        if (integrante) {
            controles.add(new ControlVerificacion("Cupo del club", true,
                    "El estudiante ya es integrante activo del club; no ocupa un cupo nuevo."));
        } else {
            long activos = inscripcionRepository.countByClubIdAndEstado(club.getId(), EstadoInscripcion.ACTIVA);
            boolean hayCupo = activos < club.getCupoMaximo();
            controles.add(new ControlVerificacion("Cupo del club", hayCupo,
                    hayCupo ? "Quedan " + (club.getCupoMaximo() - activos) + " de " + club.getCupoMaximo() + " cupos."
                            : "El club está lleno (" + activos + " de " + club.getCupoMaximo()
                            + "). Solo un administrador puede autorizar un sobrecupo."));
        }

        if (cursoEvaluado == null) {
            controles.add(new ControlVerificacion("Curso", !integrante,
                    integrante ? "El estudiante ya es integrante del club y no se indicó ningún curso."
                            : "La solicitud solo inscribe al estudiante en el club."));
        } else {
            Curso curso = cursoRepository.findById(cursoEvaluado)
                    .filter(c -> c.getClubId().equals(club.getId()))
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                            "El curso indicado no pertenece al club de la solicitud."));
            boolean cursoAbierto = CURSO_ABIERTO.contains(curso.getEstado());
            controles.add(new ControlVerificacion("Curso abierto", cursoAbierto,
                    "El curso «" + curso.getNombre() + "» está en estado " + curso.getEstado() + "."));
            boolean nivelCoincide = curso.getNivel() == nivel;
            controles.add(new ControlVerificacion("Nivel del curso", nivelCoincide,
                    "El curso es de nivel " + curso.getNivel() + " y se evaluó con el nivel " + nivel
                            + (nivelAsignado == null ? " declarado en el formulario." : " asignado.")));
            boolean yaInscrito = reglas.estaEnCurso(estudiante.getId(), curso.getId());
            controles.add(new ControlVerificacion("Inscripción previa en el curso", !yaInscrito,
                    yaInscrito ? "El estudiante ya está inscrito en este curso." : "El estudiante no está inscrito en este curso."));
            long participantes = inscripcionCursoRepository.countByCursoIdAndEstado(curso.getId(), EstadoInscripcionCurso.ACTIVA);
            boolean hayCupoCurso = participantes < curso.getCupoMaximo();
            controles.add(new ControlVerificacion("Cupo del curso", hayCupoCurso,
                    hayCupoCurso ? "Quedan " + (curso.getCupoMaximo() - participantes) + " de " + curso.getCupoMaximo() + " cupos."
                            : "El curso está lleno (" + participantes + " de " + curso.getCupoMaximo() + ")."));
            String cruce = solicitudRepository.cruceHorario(estudiante.getId(), curso.getId());
            controles.add(new ControlVerificacion("Cruce de horarios", cruce == null,
                    cruce == null ? "El horario del curso no se cruza con otros cursos del estudiante."
                            : "Se cruza con el curso " + cruce + "."));
        }
        return VerificacionResponse.de(id, cursoEvaluado, nivel, controles);
    }
}

package ec.edu.ups.tipi.certificados;

import ec.edu.ups.tipi.competencias.CategoriaCompetencia;
import ec.edu.ups.tipi.competencias.EdicionCompetencia;
import ec.edu.ups.tipi.competencias.NivelCategoria;
import ec.edu.ups.tipi.competencias.ParticipacionCompetencia;
import ec.edu.ups.tipi.cursos.Curso;
import ec.edu.ups.tipi.cursos.ModalidadCurso;
import ec.edu.ups.tipi.cursos.NivelCurso;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

public final class RedaccionCertificado {

    private static final DateTimeFormatter FECHA_LARGA =
            DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale.forLanguageTag("es-EC"));
    private static final Map<NivelCurso, String> NIVELES_CURSO = Map.of(
            NivelCurso.PRINCIPIANTE, "principiante",
            NivelCurso.INTERMEDIO, "intermedio",
            NivelCurso.AVANZADO, "avanzado");
    private static final Map<ModalidadCurso, String> MODALIDADES = Map.of(
            ModalidadCurso.ONLINE, "en línea",
            ModalidadCurso.PRESENCIAL, "presencial",
            ModalidadCurso.HIBRIDO, "híbrida");
    private static final Map<NivelCategoria, String> NIVELES_CATEGORIA = Map.of(
            NivelCategoria.BASICA, "nivel básico",
            NivelCategoria.AVANZADA, "nivel avanzado");
    private static final Map<Integer, String> PUESTOS = Map.of(
            1, "el primer lugar",
            2, "el segundo lugar",
            3, "el tercer lugar");

    private RedaccionCertificado() {
    }

    public static String tituloCurso(TipoCertificado tipo, Curso curso) {
        String base = tipo == TipoCertificado.APROBACION_CURSO ? "Aprobación del curso «" : "Participación en el curso «";
        return limitar(base + curso.getNombre() + "»");
    }

    public static String cuerpoCurso(TipoCertificado tipo, Curso curso, String clubNombre) {
        StringBuilder cuerpo = new StringBuilder(tipo == TipoCertificado.APROBACION_CURSO
                ? "por haber aprobado el curso «" : "por su participación en el curso «");
        cuerpo.append(curso.getNombre()).append("», de nivel ").append(NIVELES_CURSO.get(curso.getNivel()))
                .append(" y modalidad ").append(MODALIDADES.get(curso.getModalidad()));
        if (curso.getDuracionHoras() != null) {
            cuerpo.append(", con una duración de ").append(curso.getDuracionHoras())
                    .append(curso.getDuracionHoras() == 1 ? " hora" : " horas");
        }
        cuerpo.append(", desarrollado ").append(periodo(curso.getFechaInicio(), curso.getFechaFin()))
                .append(" en el club «").append(clubNombre).append("».");
        return cuerpo.toString();
    }

    public static String tituloCompetencia(TipoCertificado tipo, ParticipacionCompetencia p,
                                           EdicionCompetencia edicion, CategoriaCompetencia categoria) {
        String evento = " en " + edicion.getNombre() + " · " + categoria.getNombre();
        if (tipo == TipoCertificado.RECONOCIMIENTO_COMPETENCIA) {
            String inicio = p.getReconocimiento() != null
                    ? "Reconocimiento «" + p.getReconocimiento() + "»"
                    : mayuscula(puesto(p.getPuesto()).substring(3));
            return limitar(inicio + evento);
        }
        return limitar("Participación" + evento);
    }

    public static String cuerpoCompetencia(TipoCertificado tipo, ParticipacionCompetencia p, String competenciaNombre,
                                           EdicionCompetencia edicion, CategoriaCompetencia categoria,
                                           String clubNombre) {
        StringBuilder cuerpo = new StringBuilder();
        if (tipo == TipoCertificado.RECONOCIMIENTO_COMPETENCIA) {
            cuerpo.append("por obtener ");
            if (p.getReconocimiento() != null) {
                cuerpo.append("el reconocimiento «").append(p.getReconocimiento()).append("»");
                if (p.getPuesto() != null) {
                    cuerpo.append(" (").append(puesto(p.getPuesto())).append(")");
                }
            } else {
                cuerpo.append(puesto(p.getPuesto()));
            }
            cuerpo.append(" en la competencia ");
        } else {
            cuerpo.append("por su participación en la competencia ");
        }
        cuerpo.append(competenciaNombre).append(", edición «").append(edicion.getNombre())
                .append("», categoría «").append(categoria.getNombre()).append("» (")
                .append(NIVELES_CATEGORIA.get(categoria.getNivel())).append(")");
        if (p.getEquipoNombre() != null) {
            cuerpo.append(", como integrante del equipo «").append(p.getEquipoNombre()).append("»");
        }
        cuerpo.append(", en representación del club «").append(clubNombre).append("»");
        if (edicion.getSede() != null) {
            cuerpo.append(", realizada en ").append(edicion.getSede());
        }
        cuerpo.append(", ").append(periodo(edicion.getFechaInicio(),
                edicion.getFechaFin() == null ? edicion.getFechaInicio() : edicion.getFechaFin())).append(".");
        return cuerpo.toString();
    }

    private static String periodo(LocalDate inicio, LocalDate fin) {
        if (inicio.equals(fin)) {
            return "el " + inicio.format(FECHA_LARGA);
        }
        return "del " + inicio.format(FECHA_LARGA) + " al " + fin.format(FECHA_LARGA);
    }

    private static String puesto(Short puesto) {
        return PUESTOS.getOrDefault((int) puesto, "el puesto " + puesto);
    }

    private static String mayuscula(String valor) {
        return Character.toUpperCase(valor.charAt(0)) + valor.substring(1);
    }

    private static String limitar(String titulo) {
        return titulo.length() <= 200 ? titulo : titulo.substring(0, 199) + "…";
    }
}

package ec.edu.ups.tipi.opciones;

import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.opciones.dto.ClubOpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionesResponse;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class OpcionesService {

    static final int LIMITE_MAXIMO = 50;
    static final int LONGITUD_MAXIMA_BUSQUEDA = 100;
    private static final String ROL_DOCENTE = "DOCENTE";

    private final OpcionesRepository repository;
    private final DocenteRepository docenteRepository;
    private final AlcanceInstitucional alcance;

    @Transactional(readOnly = true)
    public OpcionesResponse<OpcionResponse> instituciones(String q, int limite, UsuarioPrincipal usuario) {
        Long institucionId = alcance.esGlobal(usuario) ? null : alcance.institucionPropia(usuario);
        int tope = tope(limite);
        return recortar(repository.instituciones(patron(q), institucionId, tope + 1), tope);
    }

    @Transactional(readOnly = true)
    public OpcionesResponse<ClubOpcionResponse> clubes(String q, Long institucionId, Integer periodoId,
                                                       EstadoClub estado, int limite, UsuarioPrincipal usuario) {
        Long filtroInstitucion = institucionId;
        Long filtroDocente = null;
        if (!alcance.esGlobal(usuario)) {
            Long propia = alcance.institucionPropia(usuario);
            if (institucionId != null) {
                alcance.verificar(usuario, institucionId);
            }
            if (ROL_DOCENTE.equals(usuario.getRolCodigo())) {
                filtroDocente = docenteRepository.findByUsuarioId(usuario.getId())
                        .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN,
                                "Su usuario no está vinculado a un registro de docente."))
                        .getId();
            } else {
                filtroInstitucion = propia;
            }
        }
        int tope = tope(limite);
        return recortar(repository.clubes(patron(q), filtroInstitucion, filtroDocente, periodoId, estado, tope + 1),
                tope);
    }

    private int tope(int limite) {
        return Math.min(Math.max(limite, 1), LIMITE_MAXIMO);
    }

    private String patron(String q) {
        if (!StringUtils.hasText(q)) {
            return null;
        }
        String texto = q.trim();
        if (texto.length() > LONGITUD_MAXIMA_BUSQUEDA) {
            texto = texto.substring(0, LONGITUD_MAXIMA_BUSQUEDA);
        }
        String escapado = texto.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escapado + "%";
    }

    private <T> OpcionesResponse<T> recortar(List<T> encontrados, int tope) {
        boolean hayMas = encontrados.size() > tope;
        return new OpcionesResponse<>(hayMas ? List.copyOf(encontrados.subList(0, tope)) : encontrados, hayMas);
    }
}

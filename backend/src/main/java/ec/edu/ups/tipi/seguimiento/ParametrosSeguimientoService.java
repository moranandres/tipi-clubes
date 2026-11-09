package ec.edu.ups.tipi.seguimiento;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.seguimiento.dto.ParametrosSeguimientoRequest;
import ec.edu.ups.tipi.seguimiento.dto.ParametrosSeguimientoResponse;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ParametrosSeguimientoService {

    private final ParametrosSeguimientoRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public ParametrosSeguimiento vigentes() {
        return repository.findById(ParametrosSeguimiento.ID_UNICO).orElseThrow(() ->
                new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "No existen los parámetros de seguimiento; revise la migración V19."));
    }

    @Transactional(readOnly = true)
    public ParametrosSeguimientoResponse obtener() {
        return respuesta(vigentes());
    }

    @Transactional
    public ParametrosSeguimientoResponse actualizar(ParametrosSeguimientoRequest request, UsuarioPrincipal usuario) {
        BigDecimal adecuado = request.umbralAdecuado().setScale(1, RoundingMode.HALF_UP);
        BigDecimal minimo = request.umbralMinimo().setScale(1, RoundingMode.HALF_UP);
        if (minimo.compareTo(adecuado) >= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El umbral mínimo debe ser menor que el umbral adecuado.");
        }
        ParametrosSeguimiento parametros = repository.findById(ParametrosSeguimiento.ID_UNICO).orElseThrow(() ->
                new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "No existen los parámetros de seguimiento; revise la migración V19."));
        String antes = descripcion(parametros.getDiasGraciaRegistro(), parametros.getUmbralAdecuado(),
                parametros.getUmbralMinimo());
        parametros.setDiasGraciaRegistro(request.diasGraciaRegistro().shortValue());
        parametros.setUmbralAdecuado(adecuado);
        parametros.setUmbralMinimo(minimo);
        parametros.setActualizadoPor(usuario.getId());
        parametros.setActualizadoEn(Instant.now());
        parametros = repository.saveAndFlush(parametros);

        auditoria.registrar("PARAMETROS_SEGUIMIENTO_ACTUALIZADOS", "PARAMETROS_SEGUIMIENTO", (long) parametros.getId(),
                antes + " -> " + descripcion(parametros.getDiasGraciaRegistro(), parametros.getUmbralAdecuado(),
                        parametros.getUmbralMinimo()));
        return respuesta(parametros);
    }

    public ParametrosSeguimientoResponse respuesta(ParametrosSeguimiento p) {
        String nombre = p.getActualizadoPor() == null ? null : usuarioRepository.findById(p.getActualizadoPor())
                .map(u -> u.getNombres() + " " + u.getApellidos()).orElse(null);
        return new ParametrosSeguimientoResponse(p.getDiasGraciaRegistro(), p.getUmbralAdecuado().doubleValue(),
                p.getUmbralMinimo().doubleValue(), nombre, p.getActualizadoEn());
    }

    private String descripcion(Short gracia, BigDecimal adecuado, BigDecimal minimo) {
        return "diasGraciaRegistro=" + gracia + ", umbralAdecuado=" + adecuado.toPlainString()
                + ", umbralMinimo=" + minimo.toPlainString();
    }
}

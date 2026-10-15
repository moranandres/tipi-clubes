package ec.edu.ups.tipi.security;

import ec.edu.ups.tipi.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class AlcanceInstitucional {

    private static final Set<String> ROLES_GLOBALES = Set.of("ADMIN", "COORDINADOR", "CONSULTA");

    public boolean esGlobal(UsuarioPrincipal usuario) {
        return ROLES_GLOBALES.contains(usuario.getRolCodigo());
    }

    public Long institucionPropia(UsuarioPrincipal usuario) {
        if (usuario.getInstitucionId() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Su usuario no tiene una institución asignada.");
        }
        return usuario.getInstitucionId();
    }

    public void verificar(UsuarioPrincipal usuario, Long institucionId) {
        if (esGlobal(usuario)) {
            return;
        }
        if (!institucionPropia(usuario).equals(institucionId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos sobre esta institución.");
        }
    }
}
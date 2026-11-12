package ec.edu.ups.tipi.usuarios;

import ec.edu.ups.tipi.usuarios.dto.RolResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Roles", description = "Roles disponibles para asignar a los usuarios")
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RolController {

    private final RolRepository rolRepository;

    @Operation(summary = "Lista de roles del sistema")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RolResponse>> listar() {
        return ResponseEntity.ok(rolRepository.findAll(Sort.by("id")).stream()
                .map(r -> new RolResponse(r.getCodigo(), r.getNombre(), r.getDescripcion()))
                .toList());
    }
}

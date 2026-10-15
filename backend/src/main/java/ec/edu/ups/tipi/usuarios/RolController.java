package ec.edu.ups.tipi.usuarios;

import ec.edu.ups.tipi.usuarios.dto.RolResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RolController {

    private final RolRepository rolRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<RolResponse> listar() {
        return rolRepository.findAll(Sort.by("id")).stream()
                .map(r -> new RolResponse(r.getCodigo(), r.getNombre(), r.getDescripcion()))
                .toList();
    }
}
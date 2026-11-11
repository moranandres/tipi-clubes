package ec.edu.ups.tipi.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

public final class Respuestas {

    private Respuestas() {
    }

    public static <T> ResponseEntity<T> creado(Object id, T cuerpo) {
        URI ubicacion = ServletUriComponentsBuilder.fromCurrentRequestUri()
                .path("/{id}")
                .buildAndExpand(id)
                .toUri();
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    public static ResponseEntity<Void> sinContenido() {
        return ResponseEntity.noContent().build();
    }
}

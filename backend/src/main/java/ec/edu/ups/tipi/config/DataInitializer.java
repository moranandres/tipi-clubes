package ec.edu.ups.tipi.config;

import ec.edu.ups.tipi.usuarios.Rol;
import ec.edu.ups.tipi.usuarios.RolRepository;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${tipi.bootstrap.admin-password}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        if (usuarioRepository.count() > 0) {
            return;
        }
        Rol rolAdmin = rolRepository.findByCodigo("ADMIN").orElseThrow();

        Usuario admin = new Usuario();
        admin.setUsername("admin");
        admin.setEmail("admin@tipi.local");
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setNombres("Administrador");
        admin.setApellidos("del Sistema");
        admin.setRol(rolAdmin);
        usuarioRepository.save(admin);

        log.warn("Se creó el usuario inicial 'admin'. Cambia su contraseña antes de usar el sistema en producción.");
    }
}
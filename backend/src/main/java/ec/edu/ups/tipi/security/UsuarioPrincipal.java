package ec.edu.ups.tipi.security;

import ec.edu.ups.tipi.usuarios.Usuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public class UsuarioPrincipal implements UserDetails {

    private final Usuario usuario;

    public UsuarioPrincipal(Usuario usuario) {
        this.usuario = usuario;
    }

    public Usuario getUsuario() { return usuario; }
    public Long getId() { return usuario.getId(); }
    public Long getInstitucionId() { return usuario.getInstitucionId(); }
    public String getRolCodigo() { return usuario.getRol().getCodigo(); }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().getCodigo()));
    }

    @Override public String getPassword() { return usuario.getPasswordHash(); }
    @Override public String getUsername() { return usuario.getUsername(); }

    @Override
    public boolean isAccountNonLocked() {
        return usuario.getBloqueadoHasta() == null
                || usuario.getBloqueadoHasta().isBefore(Instant.now());
    }

    @Override public boolean isEnabled() { return usuario.isActivo(); }
}
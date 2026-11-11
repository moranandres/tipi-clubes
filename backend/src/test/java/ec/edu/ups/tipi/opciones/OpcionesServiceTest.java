package ec.edu.ups.tipi.opciones;

import ec.edu.ups.tipi.clubes.EstadoClub;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.docentes.Docente;
import ec.edu.ups.tipi.docentes.DocenteRepository;
import ec.edu.ups.tipi.opciones.dto.ClubOpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionResponse;
import ec.edu.ups.tipi.opciones.dto.OpcionesResponse;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Rol;
import ec.edu.ups.tipi.usuarios.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OpcionesServiceTest {

    private OpcionesRepository repository;
    private DocenteRepository docenteRepository;
    private OpcionesService service;

    @BeforeEach
    void preparar() {
        repository = mock(OpcionesRepository.class);
        docenteRepository = mock(DocenteRepository.class);
        service = new OpcionesService(repository, docenteRepository, new AlcanceInstitucional());
        when(repository.instituciones(any(), any(), anyInt())).thenReturn(List.of());
        when(repository.clubes(any(), any(), any(), any(), any(), anyInt())).thenReturn(List.of());
    }

    @Test
    void administradorBuscaInstitucionesSinRestriccion() {
        service.instituciones("  Eloy  ", 20, usuario("ADMIN", null));

        verify(repository).instituciones("%eloy%", null, 21);
    }

    @Test
    void responsableSoloObtieneSuInstitucion() {
        service.instituciones(null, 20, usuario("RESP_INSTITUCIONAL", 2L));

        verify(repository).instituciones(null, 2L, 21);
    }

    @Test
    void responsableSoloObtieneClubesDeSuInstitucion() {
        service.clubes("robot", null, 1, EstadoClub.ACTIVO, 20, usuario("RESP_INSTITUCIONAL", 2L));

        verify(repository).clubes("%robot%", 2L, null, 1, EstadoClub.ACTIVO, 21);
    }

    @Test
    void responsableNoPuedePedirOtraInstitucion() {
        assertThrows(ApiException.class,
                () -> service.clubes(null, 9L, null, null, 20, usuario("RESP_INSTITUCIONAL", 2L)));

        verify(repository, never()).clubes(any(), any(), any(), any(), any(), anyInt());
    }

    @Test
    void docenteSoloObtieneLosClubesQueCoordina() {
        Docente docente = new Docente();
        docente.setId(31L);
        when(docenteRepository.findByUsuarioId(10L)).thenReturn(Optional.of(docente));

        service.clubes(null, null, null, null, 20, usuario("DOCENTE", 1L));

        verify(repository).clubes(isNull(), isNull(), eq(31L), isNull(), isNull(), eq(21));
    }

    @Test
    void docenteSinRegistroDeDocenteEsRechazado() {
        when(docenteRepository.findByUsuarioId(10L)).thenReturn(Optional.empty());

        assertThrows(ApiException.class,
                () -> service.clubes(null, null, null, null, 20, usuario("DOCENTE", 1L)));
    }

    @Test
    void coordinadorPuedeFiltrarPorCualquierInstitucion() {
        service.clubes(null, 9L, null, null, 20, usuario("COORDINADOR", null));

        verify(repository).clubes(null, 9L, null, null, null, 21);
        verifyNoInteractions(docenteRepository);
    }

    @Test
    void elLimiteSeAcotaEntreUnoYCincuenta() {
        service.instituciones(null, 0, usuario("ADMIN", null));
        service.instituciones(null, 500, usuario("ADMIN", null));

        verify(repository).instituciones(null, null, 2);
        verify(repository).instituciones(null, null, 51);
    }

    @Test
    void losComodinesDeLaBusquedaSeEscapan() {
        service.instituciones("100%_a\\b", 20, usuario("ADMIN", null));

        verify(repository).instituciones("%100\\%\\_a\\\\b%", null, 21);
    }

    @Test
    void indicaCuandoHayMasResultadosQueElLimite() {
        when(repository.clubes(any(), any(), any(), any(), any(), anyInt())).thenReturn(clubes(3));

        OpcionesResponse<ClubOpcionResponse> respuesta =
                service.clubes(null, null, null, null, 2, usuario("ADMIN", null));

        assertTrue(respuesta.hayMas());
        assertEquals(2, respuesta.opciones().size());
        assertEquals(1L, respuesta.opciones().get(0).id());
    }

    @Test
    void noIndicaMasResultadosCuandoCabenEnElLimite() {
        when(repository.instituciones(any(), any(), anyInt()))
                .thenReturn(List.of(new OpcionResponse(1L, "Unidad Educativa de Prueba")));

        OpcionesResponse<OpcionResponse> respuesta = service.instituciones(null, 20, usuario("ADMIN", null));

        assertFalse(respuesta.hayMas());
        assertEquals(1, respuesta.opciones().size());
    }

    private List<ClubOpcionResponse> clubes(int cantidad) {
        List<ClubOpcionResponse> lista = new ArrayList<>();
        for (long i = 1; i <= cantidad; i++) {
            lista.add(new ClubOpcionResponse(i, "Club " + i, 1L));
        }
        return lista;
    }

    private UsuarioPrincipal usuario(String rolCodigo, Long institucionId) {
        Rol rol = new Rol();
        rol.setCodigo(rolCodigo);
        Usuario usuario = new Usuario();
        usuario.setId(10L);
        usuario.setUsername("prueba");
        usuario.setRol(rol);
        usuario.setInstitucionId(institucionId);
        return new UsuarioPrincipal(usuario);
    }
}

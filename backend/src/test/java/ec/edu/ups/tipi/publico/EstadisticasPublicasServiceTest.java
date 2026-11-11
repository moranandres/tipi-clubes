package ec.edu.ups.tipi.publico;

import ec.edu.ups.tipi.publico.dto.EstadisticasPublicasResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EstadisticasPublicasServiceTest {

    private EstadisticasPublicasRepository repository;

    @BeforeEach
    void preparar() {
        repository = mock(EstadisticasPublicasRepository.class);
        when(repository.agregados()).thenReturn(new Object[]{
                "2026-2027", 7L, 5L, 54L, 46L, 47L, 79L, 26L, new BigDecimal("49.5"), 5L, 12L, 2L});
    }

    @Test
    void convierteLosAgregadosEnLaRespuesta() {
        EstadisticasPublicasResponse respuesta = new EstadisticasPublicasService(repository, 300).obtener();

        assertEquals("2026-2027", respuesta.periodoActivo());
        assertEquals(7, respuesta.instituciones());
        assertEquals(5, respuesta.institucionesConClubes());
        assertEquals(54, respuesta.clubes());
        assertEquals(46, respuesta.clubesActivos());
        assertEquals(47, respuesta.docentesActivos());
        assertEquals(79, respuesta.estudiantesParticipantes());
        assertEquals(26, respuesta.sesionesEjecutadas());
        assertEquals(50, respuesta.horasEjecutadas());
        assertEquals(5, respuesta.evidenciasRegistradas());
        assertEquals(12, respuesta.proyectos());
        assertEquals(2, respuesta.certificadosEmitidos());
        assertNotNull(respuesta.actualizadoEn());
    }

    @Test
    void reutilizaElResultadoMientrasEstaVigente() {
        EstadisticasPublicasService service = new EstadisticasPublicasService(repository, 300);

        EstadisticasPublicasResponse primera = service.obtener();
        EstadisticasPublicasResponse segunda = service.obtener();

        assertSame(primera, segunda);
        verify(repository, times(1)).agregados();
    }

    @Test
    void recalculaCuandoLaVigenciaEsCero() {
        EstadisticasPublicasService service = new EstadisticasPublicasService(repository, 0);

        service.obtener();
        service.obtener();

        verify(repository, times(2)).agregados();
    }

    @Test
    void aceptaQueNoExistaPeriodoActivo() {
        when(repository.agregados()).thenReturn(new Object[]{
                null, 0L, 0L, 0L, 0L, 0L, 0L, 0L, BigDecimal.ZERO, 0L, 0L, 0L});

        EstadisticasPublicasResponse respuesta = new EstadisticasPublicasService(repository, 300).obtener();

        assertEquals(null, respuesta.periodoActivo());
        assertEquals(0, respuesta.horasEjecutadas());
    }
}

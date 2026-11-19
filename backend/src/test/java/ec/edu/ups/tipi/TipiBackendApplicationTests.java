package ec.edu.ups.tipi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ActiveProfiles("test")
@SpringBootTest
class TipiBackendApplicationTests {

	@Autowired
	private ApplicationContext contexto;

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void contextLoads() {
	}

	@Test
	void noRegistraUsuariosEnMemoria() {
		assertTrue(contexto.getBeansOfType(UserDetailsService.class).isEmpty());
	}

	@Test
	void usaExclusivamenteLaBaseDePruebas() {
		assertArrayEquals(new String[] {"test"}, contexto.getEnvironment().getActiveProfiles());
		assertEquals("tipi_clubes_test", jdbc.queryForObject("select current_database()", String.class));
	}

}

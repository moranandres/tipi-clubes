package ec.edu.ups.tipi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.core.userdetails.UserDetailsService;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class TipiBackendApplicationTests {

	@Autowired
	private ApplicationContext contexto;

	@Test
	void contextLoads() {
	}

	@Test
	void noRegistraUsuariosEnMemoria() {
		assertTrue(contexto.getBeansOfType(UserDetailsService.class).isEmpty());
	}

}

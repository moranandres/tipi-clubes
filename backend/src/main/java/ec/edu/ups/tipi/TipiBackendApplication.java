package ec.edu.ups.tipi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class TipiBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(TipiBackendApplication.class, args);
	}

}

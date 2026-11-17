package ec.edu.ups.tipi.common;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = CedulaEcuatorianaValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface CedulaEcuatoriana {

    String message() default "La cédula no es válida: debe tener 10 dígitos, un código de provincia existente y un dígito verificador correcto";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}

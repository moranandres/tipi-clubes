package ec.edu.ups.tipi.recuperacion;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificadorCorreo {

    private static final String ASUNTO = "TIPI 3.0 - Recuperación de contraseña";

    private final JavaMailSender mailSender;

    @Value("${tipi.recuperacion.remitente}")
    private String remitente;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void enviarRecuperacion(CorreoRecuperacion correo) {
        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");
            helper.setFrom(remitente);
            helper.setTo(correo.destinatario());
            helper.setSubject(ASUNTO);
            helper.setText(textoPlano(correo), html(correo));
            mailSender.send(mensaje);
            log.info("Correo de recuperación de contraseña enviado.");
        } catch (MessagingException | MailException e) {
            log.warn("No se pudo enviar el correo de recuperación de contraseña: {}", e.getMessage());
        }
    }

    private String textoPlano(CorreoRecuperacion correo) {
        return """
                Hola, %s:

                Recibimos una solicitud para restablecer la contraseña de su cuenta en el sistema de gestión de clubes de robótica y programación TIPI 3.0.

                Para elegir una nueva contraseña, abra este enlace:
                %s

                El enlace vence en %d minutos y solo puede usarse una vez.

                Si usted no solicitó este cambio, ignore este mensaje; su contraseña actual seguirá funcionando.

                Este es un mensaje automático; por favor no responda.
                """.formatted(correo.nombre(), correo.enlace(), correo.minutosValidez());
    }

    private String html(CorreoRecuperacion correo) {
        String nombre = HtmlUtils.htmlEscape(correo.nombre());
        String enlace = HtmlUtils.htmlEscape(correo.enlace());
        return """
                <!DOCTYPE html>
                <html lang="es">
                <body style="font-family: Arial, sans-serif; color: #212529; line-height: 1.5;">
                  <h2 style="color: #0d6efd; margin-bottom: 16px;">TIPI 3.0</h2>
                  <p>Hola, %s:</p>
                  <p>Recibimos una solicitud para restablecer la contraseña de su cuenta en el sistema de gestión de clubes de robótica y programación TIPI 3.0.</p>
                  <p>
                    <a href="%s" style="display: inline-block; padding: 10px 18px; background: #0d6efd; color: #ffffff; text-decoration: none; border-radius: 6px;">Restablecer contraseña</a>
                  </p>
                  <p>El enlace vence en %d minutos y solo puede usarse una vez.</p>
                  <p>Si el botón no funciona, copie este enlace en su navegador:<br><span style="word-break: break-all;">%s</span></p>
                  <p>Si usted no solicitó este cambio, ignore este mensaje; su contraseña actual seguirá funcionando.</p>
                  <p style="font-size: 12px; color: #6c757d;">Este es un mensaje automático; por favor no responda.</p>
                </body>
                </html>
                """.formatted(nombre, enlace, correo.minutosValidez(), enlace);
    }
}
package ec.edu.ups.tipi.certificados;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class GeneradorPdfCertificado {

    private static final Locale ES = Locale.forLanguageTag("es-EC");
    private static final DateTimeFormatter FECHA_LARGA = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", ES);
    private static final Color AZUL = new Color(28, 64, 115);
    private static final Color GRIS = new Color(90, 90, 90);
    private static final Color NEGRO = new Color(25, 25, 25);
    private static final Map<TipoCertificado, String> SUBTITULOS = Map.of(
            TipoCertificado.PARTICIPACION_CURSO, "DE PARTICIPACIÓN",
            TipoCertificado.APROBACION_CURSO, "DE APROBACIÓN",
            TipoCertificado.PARTICIPACION_COMPETENCIA, "DE PARTICIPACIÓN",
            TipoCertificado.RECONOCIMIENTO_COMPETENCIA, "DE RECONOCIMIENTO");

    private final PDFont normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private final PDFont negrita = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private final PDFont cursiva = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

    public byte[] generar(ContenidoCertificado c) {
        try (PDDocument documento = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PDRectangle tamano = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            PDPage pagina = new PDPage(tamano);
            documento.addPage(pagina);
            float ancho = tamano.getWidth();
            float alto = tamano.getHeight();
            float centro = ancho / 2;

            try (PDPageContentStream lienzo = new PDPageContentStream(documento, pagina)) {
                marco(lienzo, ancho, alto);

                centrado(lienzo, "PROYECTO DE VINCULACIÓN TIPI 3.0", negrita, 13, AZUL, centro, alto - 70);
                centrado(lienzo, "Clubes de robótica y programación de instituciones educativas fiscales",
                        normal, 10, GRIS, centro, alto - 86);

                centrado(lienzo, "CERTIFICADO", negrita, 40, AZUL, centro, alto - 150);
                centrado(lienzo, SUBTITULOS.get(c.tipo()), normal, 16, AZUL, centro, alto - 176);

                centrado(lienzo, "Se otorga el presente certificado a", cursiva, 13, GRIS, centro, alto - 218);

                float tamanoNombre = ajustar(c.estudianteNombre(), negrita, 28, 18, ancho - 160);
                centrado(lienzo, c.estudianteNombre(), negrita, tamanoNombre, NEGRO, centro, alto - 258);
                linea(lienzo, centro - 250, alto - 268, centro + 250, alto - 268, 0.8f, AZUL);

                float y = alto - 292;
                for (String renglon : envolver("estudiante de " + c.institucionNombre() + ",", normal, 12, ancho - 200)) {
                    centrado(lienzo, renglon, normal, 12, NEGRO, centro, y);
                    y -= 16;
                }
                y -= 4;
                for (String renglon : envolver(c.cuerpo(), normal, 13, ancho - 200)) {
                    centrado(lienzo, renglon, normal, 13, NEGRO, centro, y);
                    y -= 18;
                }
                y -= 8;
                centrado(lienzo, "Emitido el " + c.fechaEmision().format(FECHA_LARGA) + ".", normal, 11, GRIS,
                        centro, y);

                float firmaY = 132;
                linea(lienzo, centro - 120, firmaY, centro + 120, firmaY, 0.8f, NEGRO);
                centrado(lienzo, c.emisorNombre(), negrita, 11, NEGRO, centro, firmaY - 15);
                centrado(lienzo, c.emisorCargo(), normal, 10, GRIS, centro, firmaY - 29);

                float pieX = 52;
                texto(lienzo, "Código de verificación: " + c.codigoVerificacion(), negrita, 10, AZUL, pieX, 78);
                texto(lienzo, "Verifique la autenticidad de este documento en:", normal, 8, GRIS, pieX, 64);
                texto(lienzo, recortar(c.urlVerificacion(), normal, 8, 560), normal, 8, GRIS, pieX, 54);
                texto(lienzo, "Documento generado por el Sistema de gestión de clubes TIPI 3.0.", normal, 8, GRIS,
                        pieX, 44);

                qr(lienzo, c.urlVerificacion(), ancho - 52 - 78, 40, 78);
            }

            PDDocumentInformation info = documento.getDocumentInformation();
            info.setTitle(seguro(c.titulo(), normal));
            info.setSubject("Certificado " + c.codigoVerificacion());
            info.setAuthor("Sistema de gestión de clubes TIPI 3.0");
            info.setCreator("Sistema de gestión de clubes TIPI 3.0");
            info.setCreationDate(Calendar.getInstance());

            documento.save(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el PDF del certificado", e);
        }
    }

    private void marco(PDPageContentStream lienzo, float ancho, float alto) throws IOException {
        lienzo.setStrokingColor(AZUL);
        lienzo.setLineWidth(3f);
        lienzo.addRect(20, 20, ancho - 40, alto - 40);
        lienzo.stroke();
        lienzo.setLineWidth(0.8f);
        lienzo.addRect(28, 28, ancho - 56, alto - 56);
        lienzo.stroke();
    }

    private void qr(PDPageContentStream lienzo, String contenido, float x, float y, float lado) throws IOException {
        BitMatrix matriz;
        try {
            matriz = new QRCodeWriter().encode(contenido, BarcodeFormat.QR_CODE, 0, 0, Map.of(
                    EncodeHintType.MARGIN, 0,
                    EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                    EncodeHintType.CHARACTER_SET, "UTF-8"));
        } catch (WriterException e) {
            throw new IOException("No se pudo generar el código QR", e);
        }
        float modulo = lado / matriz.getWidth();
        lienzo.setNonStrokingColor(NEGRO);
        for (int fila = 0; fila < matriz.getHeight(); fila++) {
            for (int col = 0; col < matriz.getWidth(); col++) {
                if (matriz.get(col, fila)) {
                    lienzo.addRect(x + col * modulo, y + lado - (fila + 1) * modulo, modulo, modulo);
                }
            }
        }
        lienzo.fill();
    }

    private void linea(PDPageContentStream lienzo, float x1, float y1, float x2, float y2, float grosor, Color color)
            throws IOException {
        lienzo.setStrokingColor(color);
        lienzo.setLineWidth(grosor);
        lienzo.moveTo(x1, y1);
        lienzo.lineTo(x2, y2);
        lienzo.stroke();
    }

    private void centrado(PDPageContentStream lienzo, String valor, PDFont fuente, float tamano, Color color,
                          float centro, float y) throws IOException {
        String limpio = seguro(valor, fuente);
        texto(lienzo, limpio, fuente, tamano, color, centro - medir(limpio, fuente, tamano) / 2, y);
    }

    private void texto(PDPageContentStream lienzo, String valor, PDFont fuente, float tamano, Color color,
                       float x, float y) throws IOException {
        lienzo.beginText();
        lienzo.setFont(fuente, tamano);
        lienzo.setNonStrokingColor(color);
        lienzo.newLineAtOffset(x, y);
        lienzo.showText(seguro(valor, fuente));
        lienzo.endText();
    }

    private List<String> envolver(String valor, PDFont fuente, float tamano, float maximo) throws IOException {
        List<String> renglones = new ArrayList<>();
        StringBuilder actual = new StringBuilder();
        for (String palabra : seguro(valor, fuente).split(" ")) {
            if (palabra.isEmpty()) {
                continue;
            }
            String prueba = actual.isEmpty() ? palabra : actual + " " + palabra;
            if (medir(prueba, fuente, tamano) <= maximo || actual.isEmpty()) {
                actual = new StringBuilder(prueba);
            } else {
                renglones.add(actual.toString());
                actual = new StringBuilder(palabra);
            }
        }
        if (!actual.isEmpty()) {
            renglones.add(actual.toString());
        }
        return renglones;
    }

    private float ajustar(String valor, PDFont fuente, float inicial, float minimo, float maximo) throws IOException {
        float tamano = inicial;
        String limpio = seguro(valor, fuente);
        while (tamano > minimo && medir(limpio, fuente, tamano) > maximo) {
            tamano -= 1;
        }
        return tamano;
    }

    private String recortar(String valor, PDFont fuente, float tamano, float maximo) throws IOException {
        String limpio = seguro(valor, fuente);
        while (limpio.length() > 1 && medir(limpio, fuente, tamano) > maximo) {
            limpio = limpio.substring(0, limpio.length() - 1);
        }
        return limpio;
    }

    private float medir(String valor, PDFont fuente, float tamano) throws IOException {
        return fuente.getStringWidth(valor) / 1000f * tamano;
    }

    private String seguro(String valor, PDFont fuente) {
        if (valor == null) {
            return "";
        }
        String normalizado = Normalizer.normalize(valor, Normalizer.Form.NFC).replaceAll("\\s+", " ").trim();
        StringBuilder limpio = new StringBuilder(normalizado.length());
        normalizado.codePoints().forEach(cp -> {
            String caracter = new String(Character.toChars(cp));
            try {
                fuente.encode(caracter);
                limpio.append(caracter);
            } catch (IOException | IllegalArgumentException e) {
                limpio.append('?');
            }
        });
        return limpio.toString();
    }
}

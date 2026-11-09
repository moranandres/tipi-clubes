package ec.edu.ups.tipi.evidencias;

import ec.edu.ups.tipi.almacenamiento.TipoArchivo;
import ec.edu.ups.tipi.common.ApiException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentCatalog;
import org.apache.pdfbox.pdmodel.PDDocumentNameDictionary;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionJavaScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class SaneamientoArchivos {

    private static final int LADO_MAXIMO = 2560;
    private static final long PIXELES_MAXIMOS = 40_000_000L;
    private static final float CALIDAD_JPEG = 0.9f;
    private static final int ORIENTACION_NORMAL = 1;

    public ArchivoPreparado preparar(MultipartFile archivo, Set<TipoArchivo> permitidos, long maxBytes) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debe adjuntar un archivo.");
        }
        if (archivo.getSize() > maxBytes) {
            throw new ApiException(HttpStatus.valueOf(413), "El archivo supera el tamaño máximo permitido de "
                    + (maxBytes / (1024 * 1024)) + " MB.");
        }
        byte[] contenido;
        try {
            contenido = archivo.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No se pudo leer el archivo enviado.");
        }
        TipoArchivo tipo = TipoArchivo.detectar(contenido)
                .filter(permitidos::contains)
                .orElseThrow(() -> new ApiException(HttpStatus.valueOf(415),
                        "Tipo de archivo no permitido para esta evidencia. Formatos aceptados: "
                                + formatos(permitidos) + "."));
        byte[] limpio = tipo == TipoArchivo.PDF ? verificarPdf(contenido) : limpiarImagen(contenido, tipo);
        if (limpio.length > maxBytes) {
            throw new ApiException(HttpStatus.valueOf(413), "Después de procesarla, la imagen supera "
                    + (maxBytes / (1024 * 1024)) + " MB. Guárdela como JPG e intente de nuevo.");
        }
        return new ArchivoPreparado(limpio, tipo, archivo.getOriginalFilename());
    }

    private byte[] verificarPdf(byte[] contenido) {
        try (PDDocument documento = Loader.loadPDF(contenido)) {
            if (documento.isEncrypted()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "El PDF está protegido con contraseña o cifrado. Súbalo sin protección.");
            }
            if (documento.getNumberOfPages() == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El PDF no tiene páginas.");
            }
            PDDocumentCatalog catalogo = documento.getDocumentCatalog();
            PDDocumentNameDictionary nombres = catalogo.getNames();
            if ((nombres != null && nombres.getJavaScript() != null)
                    || catalogo.getOpenAction() instanceof PDActionJavaScript) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "El PDF contiene código JavaScript. Expórtelo de nuevo como PDF simple e intente otra vez.");
            }
            return contenido;
        } catch (InvalidPasswordException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "El PDF está protegido con contraseña o cifrado. Súbalo sin protección.");
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El PDF está dañado o no se puede leer.");
        }
    }

    private byte[] limpiarImagen(byte[] contenido, TipoArchivo tipo) {
        BufferedImage original = leerImagen(contenido);
        int orientacion = tipo == TipoArchivo.JPEG ? orientacionExif(contenido) : ORIENTACION_NORMAL;
        boolean conTransparencia = tipo == TipoArchivo.PNG && original.getColorModel().hasAlpha();
        BufferedImage orientada = orientar(original, orientacion, conTransparencia);
        BufferedImage reducida = reducir(orientada, conTransparencia);
        try {
            return tipo == TipoArchivo.JPEG ? escribirJpeg(reducida) : escribirPng(reducida);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo procesar la imagen. Intente nuevamente.");
        }
    }

    private BufferedImage leerImagen(byte[] contenido) {
        try (ImageInputStream entrada = ImageIO.createImageInputStream(new ByteArrayInputStream(contenido))) {
            Iterator<ImageReader> lectores = ImageIO.getImageReaders(entrada);
            if (!lectores.hasNext()) {
                throw imagenIlegible();
            }
            ImageReader lector = lectores.next();
            try {
                lector.setInput(entrada, true, true);
                long pixeles = (long) lector.getWidth(0) * lector.getHeight(0);
                if (pixeles > PIXELES_MAXIMOS) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "La imagen es demasiado grande: el máximo es de 40 megapíxeles.");
                }
                BufferedImage imagen = lector.read(0);
                if (imagen == null) {
                    throw imagenIlegible();
                }
                return imagen;
            } finally {
                lector.dispose();
            }
        } catch (ApiException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            throw imagenIlegible();
        }
    }

    private BufferedImage orientar(BufferedImage imagen, int orientacion, boolean conTransparencia) {
        int w = imagen.getWidth();
        int h = imagen.getHeight();
        boolean girada = orientacion >= 5 && orientacion <= 8;
        AffineTransform t = new AffineTransform();
        switch (orientacion) {
            case 2 -> {
                t.scale(-1, 1);
                t.translate(-w, 0);
            }
            case 3 -> {
                t.translate(w, h);
                t.rotate(Math.PI);
            }
            case 4 -> {
                t.scale(1, -1);
                t.translate(0, -h);
            }
            case 5 -> {
                t.rotate(Math.PI / 2);
                t.scale(1, -1);
            }
            case 6 -> {
                t.translate(h, 0);
                t.rotate(Math.PI / 2);
            }
            case 7 -> {
                t.scale(-1, 1);
                t.translate(-h, 0);
                t.translate(0, w);
                t.rotate(3 * Math.PI / 2);
            }
            case 8 -> {
                t.translate(0, w);
                t.rotate(3 * Math.PI / 2);
            }
            default -> {
            }
        }
        BufferedImage destino = lienzo(girada ? h : w, girada ? w : h, conTransparencia);
        Graphics2D g = destino.createGraphics();
        try {
            g.drawImage(imagen, t, null);
        } finally {
            g.dispose();
        }
        return destino;
    }

    private BufferedImage reducir(BufferedImage imagen, boolean conTransparencia) {
        int w = imagen.getWidth();
        int h = imagen.getHeight();
        int lado = Math.max(w, h);
        if (lado <= LADO_MAXIMO) {
            return imagen;
        }
        double escala = (double) LADO_MAXIMO / lado;
        int nuevoAncho = Math.max(1, (int) Math.round(w * escala));
        int nuevoAlto = Math.max(1, (int) Math.round(h * escala));
        BufferedImage destino = lienzo(nuevoAncho, nuevoAlto, conTransparencia);
        Graphics2D g = destino.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(imagen, 0, 0, nuevoAncho, nuevoAlto, null);
        } finally {
            g.dispose();
        }
        return destino;
    }

    private BufferedImage lienzo(int ancho, int alto, boolean conTransparencia) {
        BufferedImage destino = new BufferedImage(ancho, alto,
                conTransparencia ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        if (!conTransparencia) {
            Graphics2D g = destino.createGraphics();
            try {
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, ancho, alto);
            } finally {
                g.dispose();
            }
        }
        return destino;
    }

    private byte[] escribirJpeg(BufferedImage imagen) throws IOException {
        Iterator<ImageWriter> escritores = ImageIO.getImageWritersByFormatName("jpeg");
        if (!escritores.hasNext()) {
            throw new IOException("Sin escritor JPEG");
        }
        ImageWriter escritor = escritores.next();
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        try (ImageOutputStream destino = ImageIO.createImageOutputStream(salida)) {
            escritor.setOutput(destino);
            ImageWriteParam parametros = escritor.getDefaultWriteParam();
            parametros.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            parametros.setCompressionQuality(CALIDAD_JPEG);
            escritor.write(null, new IIOImage(imagen, null, null), parametros);
        } finally {
            escritor.dispose();
        }
        return salida.toByteArray();
    }

    private byte[] escribirPng(BufferedImage imagen) throws IOException {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        if (!ImageIO.write(imagen, "png", salida)) {
            throw new IOException("Sin escritor PNG");
        }
        return salida.toByteArray();
    }

    private int orientacionExif(byte[] b) {
        if (b.length < 4 || (b[0] & 0xFF) != 0xFF || (b[1] & 0xFF) != 0xD8) {
            return ORIENTACION_NORMAL;
        }
        int i = 2;
        while (i + 4 <= b.length) {
            if ((b[i] & 0xFF) != 0xFF) {
                return ORIENTACION_NORMAL;
            }
            int marcador = b[i + 1] & 0xFF;
            if (marcador == 0xFF) {
                i++;
                continue;
            }
            if (marcador == 0x01 || (marcador >= 0xD0 && marcador <= 0xD8)) {
                i += 2;
                continue;
            }
            if (marcador == 0xD9 || marcador == 0xDA) {
                return ORIENTACION_NORMAL;
            }
            int largo = ((b[i + 2] & 0xFF) << 8) | (b[i + 3] & 0xFF);
            if (largo < 2 || i + 2 + largo > b.length) {
                return ORIENTACION_NORMAL;
            }
            if (marcador == 0xE1 && largo >= 16 && b[i + 4] == 'E' && b[i + 5] == 'x' && b[i + 6] == 'i'
                    && b[i + 7] == 'f' && b[i + 8] == 0 && b[i + 9] == 0) {
                return orientacionTiff(b, i + 10, i + 2 + largo);
            }
            i += 2 + largo;
        }
        return ORIENTACION_NORMAL;
    }

    private int orientacionTiff(byte[] b, int inicio, int fin) {
        if (inicio + 8 > fin) {
            return ORIENTACION_NORMAL;
        }
        boolean little = b[inicio] == 'I' && b[inicio + 1] == 'I';
        boolean big = b[inicio] == 'M' && b[inicio + 1] == 'M';
        if (!little && !big) {
            return ORIENTACION_NORMAL;
        }
        long desplazamiento = entero32(b, inicio + 4, little);
        long posicion = inicio + desplazamiento;
        if (desplazamiento < 8 || posicion + 2 > fin) {
            return ORIENTACION_NORMAL;
        }
        int entradas = entero16(b, (int) posicion, little);
        for (int k = 0; k < entradas; k++) {
            long entrada = posicion + 2 + 12L * k;
            if (entrada + 12 > fin) {
                return ORIENTACION_NORMAL;
            }
            if (entero16(b, (int) entrada, little) == 0x0112) {
                int valor = entero16(b, (int) entrada + 8, little);
                return valor >= 1 && valor <= 8 ? valor : ORIENTACION_NORMAL;
            }
        }
        return ORIENTACION_NORMAL;
    }

    private int entero16(byte[] b, int i, boolean little) {
        int a = b[i] & 0xFF;
        int c = b[i + 1] & 0xFF;
        return little ? (c << 8) | a : (a << 8) | c;
    }

    private long entero32(byte[] b, int i, boolean little) {
        long resultado = 0;
        for (int k = 0; k < 4; k++) {
            int indice = little ? i + 3 - k : i + k;
            resultado = (resultado << 8) | (b[indice] & 0xFF);
        }
        return resultado;
    }

    private ApiException imagenIlegible() {
        return new ApiException(HttpStatus.BAD_REQUEST,
                "La imagen está dañada o usa un formato interno no compatible. Guárdela de nuevo como JPG o PNG e intente otra vez.");
    }

    private String formatos(Set<TipoArchivo> permitidos) {
        return permitidos.stream()
                .map(t -> t.extension().toUpperCase())
                .sorted()
                .collect(Collectors.joining(", "));
    }
}

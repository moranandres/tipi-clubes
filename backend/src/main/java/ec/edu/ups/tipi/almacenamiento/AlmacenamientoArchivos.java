package ec.edu.ups.tipi.almacenamiento;

import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.common.Hashes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AlmacenamientoArchivos {

    private static final DateTimeFormatter CARPETA_MES = DateTimeFormatter.ofPattern("yyyy/MM");
    private static final ZoneId ZONA = ZoneId.of("America/Guayaquil");

    private final Path base;

    public AlmacenamientoArchivos(@Value("${tipi.storage.directorio}") String directorio) throws IOException {
        this.base = Paths.get(directorio).toAbsolutePath().normalize();
        Files.createDirectories(this.base);
        log.info("Repositorio de archivos en {}", this.base);
    }

    public ArchivoGuardado guardar(MultipartFile archivo, String subcarpeta,
                                   Set<TipoArchivo> permitidos, long maxBytes) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debe adjuntar un archivo.");
        }
        if (archivo.getSize() > maxBytes) {
            throw new ApiException(HttpStatus.valueOf(413),
                    "El archivo supera el tamaño máximo permitido de " + (maxBytes / (1024 * 1024)) + " MB.");
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
                        "Tipo de archivo no permitido. Formatos aceptados: " + formatos(permitidos) + "."));

        Path carpeta = resolver(subcarpeta + "/" + LocalDate.now(ZONA).format(CARPETA_MES));
        Path destino = carpeta.resolve(UUID.randomUUID() + "." + tipo.extension());
        try {
            Files.createDirectories(carpeta);
            Files.write(destino, contenido, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            log.error("No se pudo guardar un archivo en el repositorio: {}", e.getMessage());
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo guardar el archivo. Intente nuevamente.");
        }
        eliminarSiSeRevierte(destino);

        return new ArchivoGuardado(
                base.relativize(destino).toString().replace('\\', '/'),
                nombreSeguro(archivo.getOriginalFilename(), tipo),
                tipo.mime(),
                contenido.length,
                Hashes.sha256Hex(contenido));
    }

    public Resource abrir(String ruta) {
        Path archivo = resolver(ruta);
        if (!Files.isRegularFile(archivo)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "El archivo no se encuentra en el repositorio.");
        }
        return new FileSystemResource(archivo);
    }

    public void eliminarAlConfirmar(String ruta) {
        Path archivo = resolver(ruta);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    eliminar(archivo);
                }
            });
        } else {
            eliminar(archivo);
        }
    }

    private void eliminarSiSeRevierte(Path archivo) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int estado) {
                    if (estado != STATUS_COMMITTED) {
                        eliminar(archivo);
                    }
                }
            });
        }
    }

    private Path resolver(String ruta) {
        Path resultado = base.resolve(ruta).normalize();
        if (!resultado.startsWith(base)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ruta de archivo no válida.");
        }
        return resultado;
    }

    private void eliminar(Path archivo) {
        try {
            Files.deleteIfExists(archivo);
        } catch (IOException e) {
            log.warn("No se pudo eliminar un archivo del repositorio: {}", e.getMessage());
        }
    }

    private String nombreSeguro(String original, TipoArchivo tipo) {
        String nombre = original == null ? "" : original;
        nombre = nombre.substring(Math.max(nombre.lastIndexOf('/'), nombre.lastIndexOf('\\')) + 1);
        nombre = nombre.replaceAll("[\\p{Cntrl}\"<>|:*?]", "").trim();
        if (nombre.isEmpty()) {
            nombre = "documento." + tipo.extension();
        }
        return nombre.length() > 150 ? nombre.substring(nombre.length() - 150) : nombre;
    }

    private String formatos(Set<TipoArchivo> permitidos) {
        return permitidos.stream()
                .map(t -> t.extension().toUpperCase())
                .sorted()
                .collect(Collectors.joining(", "));
    }
}
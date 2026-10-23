package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.almacenamiento.AlmacenamientoArchivos;
import ec.edu.ups.tipi.almacenamiento.ArchivoGuardado;
import ec.edu.ups.tipi.almacenamiento.TipoArchivo;
import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionResponse;
import ec.edu.ups.tipi.estudiantes.dto.DocumentoDescarga;
import ec.edu.ups.tipi.security.AlcanceInstitucional;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AutorizacionService {

    private static final long MAX_DOCUMENTO_BYTES = 5L * 1024 * 1024;
    private static final Set<TipoArchivo> FORMATOS_DOCUMENTO = Set.of(TipoArchivo.PDF, TipoArchivo.JPEG, TipoArchivo.PNG);

    private final EstudianteRepository estudianteRepository;
    private final AutorizacionRepository autorizacionRepository;
    private final AlcanceInstitucional alcance;
    private final AuditoriaService auditoria;
    private final AlmacenamientoArchivos almacenamiento;

    @Transactional(readOnly = true)
    public List<AutorizacionResponse> listar(Long estudianteId, UsuarioPrincipal usuario) {
        buscarEstudiante(estudianteId, usuario);
        return autorizacionRepository.findByEstudianteIdOrderByTipoAsc(estudianteId).stream()
                .map(AutorizacionResponse::de)
                .toList();
    }

    @Transactional
    public AutorizacionResponse actualizar(Long estudianteId, TipoAutorizacion tipo,
                                           AutorizacionRequest request, UsuarioPrincipal usuario) {
        Estudiante estudiante = buscarEstudiante(estudianteId, usuario);
        Autorizacion autorizacion = asegurar(estudianteId, tipo);

        EstadoAutorizacion actual = autorizacion.getEstado();
        EstadoAutorizacion nuevo = request.estado();
        String observacion = StringUtils.hasText(request.observacion()) ? request.observacion().trim() : null;

        validarTransicion(autorizacion, actual, nuevo, request, observacion);

        Instant ahora = Instant.now();
        autorizacion.setEstado(nuevo);
        autorizacion.setFechaRegistro(request.fechaRegistro());
        autorizacion.setObservacion(observacion);
        autorizacion.setRegistradoPor(usuario.getId());
        autorizacion.setActualizadoEn(ahora);
        if (nuevo == EstadoAutorizacion.REVOCADA && actual != EstadoAutorizacion.REVOCADA) {
            autorizacion.setRevocadoEn(ahora);
        }
        autorizacion = autorizacionRepository.saveAndFlush(autorizacion);

        String advertencia = null;
        StringBuilder detalle = new StringBuilder("codigo=" + estudiante.getCodigoInterno() + ", tipo=" + tipo
                + "; estado: '" + actual + "' -> '" + nuevo + "'");
        if (tipo == TipoAutorizacion.PARTICIPACION && nuevo == EstadoAutorizacion.REVOCADA) {
            long activas = estudianteRepository.contarInscripcionesActivas(estudianteId);
            if (activas > 0) {
                advertencia = "La autorización quedó revocada. El estudiante tiene " + activas
                        + " inscripción(es) activa(s) en clubes que deben tramitarse como retiro.";
                detalle.append("; inscripciones activas pendientes de retiro: ").append(activas);
            }
        }
        auditoria.registrar("AUTORIZACION_ACTUALIZADA", "ESTUDIANTE", estudianteId, detalle.toString());
        return AutorizacionResponse.de(autorizacion, advertencia);
    }

    @Transactional
    public AutorizacionResponse cargarDocumento(Long estudianteId, TipoAutorizacion tipo,
                                                MultipartFile archivo, UsuarioPrincipal usuario) {
        Estudiante estudiante = buscarEstudiante(estudianteId, usuario);
        Autorizacion autorizacion = asegurar(estudianteId, tipo);

        ArchivoGuardado guardado = almacenamiento.guardar(archivo, "autorizaciones",
                FORMATOS_DOCUMENTO, MAX_DOCUMENTO_BYTES);
        String rutaAnterior = autorizacion.getDocumentoRuta();

        Instant ahora = Instant.now();
        autorizacion.setDocumentoRuta(guardado.ruta());
        autorizacion.setDocumentoNombre(guardado.nombreOriginal());
        autorizacion.setDocumentoTipo(guardado.tipoMime());
        autorizacion.setDocumentoTamano(guardado.tamano());
        autorizacion.setDocumentoHash(guardado.hash());
        autorizacion.setDocumentoSubidoEn(ahora);
        autorizacion.setDocumentoSubidoPor(usuario.getId());
        autorizacion.setActualizadoEn(ahora);
        autorizacion = autorizacionRepository.saveAndFlush(autorizacion);

        if (rutaAnterior != null) {
            almacenamiento.eliminarAlConfirmar(rutaAnterior);
        }

        auditoria.registrar("AUTORIZACION_DOCUMENTO_CARGADO", "ESTUDIANTE", estudianteId,
                "codigo=" + estudiante.getCodigoInterno() + ", tipo=" + tipo
                        + ", formato=" + guardado.tipoMime() + ", tamano=" + guardado.tamano()
                        + ", sha256=" + guardado.hash()
                        + (rutaAnterior != null ? "; reemplaza al documento anterior" : ""));
        return AutorizacionResponse.de(autorizacion);
    }

    @Transactional
    public DocumentoDescarga descargarDocumento(Long estudianteId, TipoAutorizacion tipo, UsuarioPrincipal usuario) {
        Estudiante estudiante = buscarEstudiante(estudianteId, usuario);
        Autorizacion autorizacion = autorizacionRepository.findByEstudianteIdAndTipo(estudianteId, tipo)
                .filter(a -> a.getDocumentoRuta() != null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "La autorización no tiene un documento cargado."));

        Resource recurso = almacenamiento.abrir(autorizacion.getDocumentoRuta());
        auditoria.registrar("AUTORIZACION_DOCUMENTO_DESCARGADO", "ESTUDIANTE", estudianteId,
                "codigo=" + estudiante.getCodigoInterno() + ", tipo=" + tipo);
        return new DocumentoDescarga(recurso, autorizacion.getDocumentoTipo(),
                autorizacion.getDocumentoNombre(), autorizacion.getDocumentoTamano());
    }

    private void validarTransicion(Autorizacion autorizacion, EstadoAutorizacion actual, EstadoAutorizacion nuevo,
                                   AutorizacionRequest request, String observacion) {
        if (actual == EstadoAutorizacion.OTORGADA
                && (nuevo == EstadoAutorizacion.PENDIENTE || nuevo == EstadoAutorizacion.NO_OTORGADA)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Una autorización otorgada no puede volver a pendiente ni a no otorgada. "
                    + "Si el representante la retira, regístrela como revocada.");
        }
        if (nuevo == EstadoAutorizacion.REVOCADA) {
            if (actual != EstadoAutorizacion.OTORGADA && actual != EstadoAutorizacion.REVOCADA) {
                throw new ApiException(HttpStatus.CONFLICT, "Solo se puede revocar una autorización otorgada.");
            }
            if (observacion == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Indique en la observación el motivo de la revocación.");
            }
        }
        if (nuevo == EstadoAutorizacion.OTORGADA) {
            if (autorizacion.getDocumentoRuta() == null) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Cargue primero el documento firmado por el representante legal.");
            }
            if (request.fechaRegistro() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Indique la fecha en que se otorgó la autorización.");
            }
            if (actual == EstadoAutorizacion.REVOCADA
                    && !autorizacion.getDocumentoSubidoEn().isAfter(autorizacion.getRevocadoEn())) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Para otorgar nuevamente una autorización revocada, cargue un documento firmado nuevo.");
            }
        }
    }

    private Estudiante buscarEstudiante(Long estudianteId, UsuarioPrincipal usuario) {
        Estudiante estudiante = estudianteRepository.findById(estudianteId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Estudiante no encontrado."));
        alcance.verificar(usuario, estudiante.getInstitucionId());
        return estudiante;
    }

    private Autorizacion asegurar(Long estudianteId, TipoAutorizacion tipo) {
        return autorizacionRepository.findByEstudianteIdAndTipo(estudianteId, tipo).orElseGet(() -> {
            Autorizacion nueva = new Autorizacion();
            nueva.setEstudianteId(estudianteId);
            nueva.setTipo(tipo);
            return autorizacionRepository.saveAndFlush(nueva);
        });
    }
}
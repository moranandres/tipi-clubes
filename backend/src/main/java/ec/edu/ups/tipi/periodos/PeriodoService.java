package ec.edu.ups.tipi.periodos;

import ec.edu.ups.tipi.auditoria.AuditoriaService;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.periodos.dto.PeriodoRequest;
import ec.edu.ups.tipi.periodos.dto.PeriodoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PeriodoService {

    private final PeriodoRepository repository;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<PeriodoResponse> listar() {
        return repository.findAll(Sort.by(Sort.Direction.DESC, "fechaInicio")).stream()
                .map(PeriodoResponse::de)
                .toList();
    }

    @Transactional
    public PeriodoResponse crear(PeriodoRequest request) {
        String nombre = request.nombre().trim();
        validarFechas(request);
        if (repository.existsByNombreIgnoreCase(nombre)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe un período con ese nombre.");
        }
        PeriodoAcademico periodo = new PeriodoAcademico();
        periodo.setNombre(nombre);
        periodo.setFechaInicio(request.fechaInicio());
        periodo.setFechaFin(request.fechaFin());
        periodo = repository.saveAndFlush(periodo);

        auditoria.registrar("PERIODO_CREADO", "PERIODO", periodo.getId().longValue(),
                "nombre=" + periodo.getNombre() + ", inicio=" + periodo.getFechaInicio()
                        + ", fin=" + periodo.getFechaFin());
        return PeriodoResponse.de(periodo);
    }

    @Transactional
    public PeriodoResponse actualizar(Integer id, PeriodoRequest request) {
        PeriodoAcademico periodo = buscar(id);
        String nombre = request.nombre().trim();
        validarFechas(request);
        if (repository.existsByNombreIgnoreCaseAndIdNot(nombre, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Ya existe otro período con ese nombre.");
        }
        String antes = "nombre=" + periodo.getNombre() + ", inicio=" + periodo.getFechaInicio()
                + ", fin=" + periodo.getFechaFin();
        periodo.setNombre(nombre);
        periodo.setFechaInicio(request.fechaInicio());
        periodo.setFechaFin(request.fechaFin());
        periodo = repository.saveAndFlush(periodo);

        auditoria.registrar("PERIODO_ACTUALIZADO", "PERIODO", id.longValue(),
                "antes: [" + antes + "] -> despues: [nombre=" + periodo.getNombre() + ", inicio="
                        + periodo.getFechaInicio() + ", fin=" + periodo.getFechaFin() + "]");
        return PeriodoResponse.de(periodo);
    }

    @Transactional
    public PeriodoResponse activar(Integer id) {
        PeriodoAcademico periodo = buscar(id);
        if (periodo.isActivo()) {
            return PeriodoResponse.de(periodo);
        }
        repository.findByActivoTrue().ifPresent(actual -> {
            actual.setActivo(false);
            repository.saveAndFlush(actual);
        });
        periodo.setActivo(true);
        periodo = repository.saveAndFlush(periodo);

        auditoria.registrar("PERIODO_ACTIVADO", "PERIODO", id.longValue(), "nombre=" + periodo.getNombre());
        return PeriodoResponse.de(periodo);
    }

    private PeriodoAcademico buscar(Integer id) {
        return repository.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Período académico no encontrado."));
    }

    private void validarFechas(PeriodoRequest request) {
        if (!request.fechaFin().isAfter(request.fechaInicio())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "La fecha de fin debe ser posterior a la fecha de inicio.");
        }
    }
}
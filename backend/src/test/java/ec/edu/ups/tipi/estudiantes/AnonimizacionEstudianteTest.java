package ec.edu.ups.tipi.estudiantes;

import ec.edu.ups.tipi.asistencias.AsistenciaService;
import ec.edu.ups.tipi.asistencias.dto.ResumenAsistenciaResponse;
import ec.edu.ups.tipi.certificados.CertificadoService;
import ec.edu.ups.tipi.certificados.dto.VerificacionPublicaResponse;
import ec.edu.ups.tipi.common.ApiException;
import ec.edu.ups.tipi.estudiantes.dto.AnonimizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.AutorizacionRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteActualizarRequest;
import ec.edu.ups.tipi.estudiantes.dto.EstudianteResponse;
import ec.edu.ups.tipi.estudiantes.dto.RepresentanteRequest;
import ec.edu.ups.tipi.security.UsuarioPrincipal;
import ec.edu.ups.tipi.usuarios.Rol;
import ec.edu.ups.tipi.usuarios.Usuario;
import ec.edu.ups.tipi.usuarios.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ActiveProfiles("test")
@SpringBootTest
class AnonimizacionEstudianteTest {

    private static final String ALFABETO_VERIFICACION = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private static final SecureRandom AZAR = new SecureRandom();
    private static final AnonimizacionRequest MOTIVO = new AnonimizacionRequest("Solicitud del representante legal");

    @Autowired
    private EstudianteService estudianteService;

    @Autowired
    private AutorizacionService autorizacionService;

    @Autowired
    private CertificadoService certificadoService;

    @Autowired
    private AsistenciaService asistenciaService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Value("${tipi.storage.directorio}")
    private String directorio;

    @AfterEach
    void limpiarSesion() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void anonimizaEstudianteConHistorialYConservaLasMetricasDelClub() throws IOException {
        Escenario escenario = escenarioConHistorial();
        UsuarioPrincipal admin = administrador();
        autenticar(admin);

        EstudianteResponse respuesta = estudianteService.anonimizar(escenario.estudianteId(), MOTIVO, admin);

        assertTrue(respuesta.anonimizado());
        assertEquals(Estudiante.NOMBRE_ANONIMIZADO, respuesta.nombres());
        assertEquals("", respuesta.apellidos());
        assertEquals("Solicitud del representante legal", respuesta.motivoAnonimizacion());
        assertNotNull(respuesta.fechaAnonimizacion());
        assertEquals(escenario.codigo(), respuesta.codigoInterno());
        assertEquals(EstadoEstudiante.EGRESADO, respuesta.estado());
        assertEquals(EstadoAutorizacion.OTORGADA, respuesta.autorizacionParticipacion());

        Map<String, Object> autorizacion = jdbc.queryForMap("""
                select estado, fecha_registro, documento_ruta, documento_nombre, documento_hash, observacion,
                       representante_nombres, representante_cedula, representante_telefono, representante_correo,
                       anonimizada_en
                from autorizaciones_estudiante where estudiante_id = ? and tipo = 'PARTICIPACION'
                """, escenario.estudianteId());
        assertEquals("OTORGADA", autorizacion.get("estado"));
        assertNotNull(autorizacion.get("fecha_registro"));
        assertNotNull(autorizacion.get("anonimizada_en"));
        for (String columna : new String[] {"documento_ruta", "documento_nombre", "documento_hash", "observacion",
                "representante_nombres", "representante_cedula", "representante_telefono", "representante_correo"}) {
            assertNull(autorizacion.get(columna), columna);
        }
        assertFalse(Files.exists(escenario.documento()), "El documento de autorización debe eliminarse del disco");
        assertFalse(Files.exists(escenario.pdf()), "El PDF del certificado debe eliminarse del disco");

        Map<String, Object> certificado = jdbc.queryForMap(
                "select estado, archivo_hash, archivo_eliminado_en from certificados where id = ?",
                escenario.certificadoId());
        assertEquals("EMITIDO", certificado.get("estado"));
        assertNotNull(certificado.get("archivo_eliminado_en"));

        VerificacionPublicaResponse verificacion = certificadoService.verificarPublico(escenario.codigoVerificacion());
        assertTrue(verificacion.valido());
        assertEquals(certificado.get("archivo_hash"), verificacion.archivoHash());

        ApiException descarga = assertThrows(ApiException.class,
                () -> certificadoService.descargar(escenario.certificadoId(), admin));
        assertEquals(HttpStatus.GONE, descarga.getStatus());

        assertEquals(1, contar("select count(*) from inscripciones where estudiante_id = ?", escenario.estudianteId()));
        assertEquals(1, contar("select count(*) from asistencias where estudiante_id = ?", escenario.estudianteId()));
        ResumenAsistenciaResponse resumen = asistenciaService.resumen(escenario.clubId(), null,
                LocalDate.now().minusDays(60), LocalDate.now(), admin);
        assertEquals(1, resumen.sesionesEjecutadas());
        assertEquals(1, resumen.conteo().presentes());

        Map<String, Object> auditoria = jdbc.queryForMap("""
                select usuario_id, detalle from auditoria
                where accion = 'ESTUDIANTE_ANONIMIZADO' and entidad_id = ? order by id desc limit 1
                """, escenario.estudianteId());
        assertEquals(admin.getId(), ((Number) auditoria.get("usuario_id")).longValue());
        String detalle = (String) auditoria.get("detalle");
        assertTrue(detalle.contains(escenario.codigo()));
        assertTrue(detalle.contains("Solicitud del representante legal"));
        assertTrue(detalle.contains("documentos de autorización eliminados=1"));
        assertTrue(detalle.contains("PDF de certificados eliminados=1"));
        for (String dato : new String[] {"Lucía", "Pérez", "María", "0926687856", "0991234567", "maria@"}) {
            assertFalse(detalle.contains(dato), "La auditoría no debe contener " + dato);
        }
    }

    @Test
    void rechazaRepetirLaAnonimizacionYModificarAlEstudianteAnonimizado() throws IOException {
        Escenario escenario = escenarioConHistorial();
        UsuarioPrincipal admin = administrador();
        autenticar(admin);
        estudianteService.anonimizar(escenario.estudianteId(), MOTIVO, admin);
        Long id = escenario.estudianteId();

        assertEquals(HttpStatus.CONFLICT, estado(() -> estudianteService.anonimizar(id, MOTIVO, admin)));
        assertEquals(HttpStatus.CONFLICT, estado(() -> estudianteService.actualizar(id,
                new EstudianteActualizarRequest("Lucía", "Pérez Mora", CursoEducativo.EGB_8, true), admin)));
        assertEquals(HttpStatus.CONFLICT,
                estado(() -> estudianteService.cambiarEstado(id, EstadoEstudiante.ACTIVO, admin)));
        assertEquals(HttpStatus.CONFLICT, estado(() -> estudianteService.eliminar(id, admin)));
        assertEquals(HttpStatus.CONFLICT, estado(() -> autorizacionService.actualizar(id, TipoAutorizacion.USO_IMAGEN,
                new AutorizacionRequest(EstadoAutorizacion.NO_OTORGADA, null, null,
                        new RepresentanteRequest("María", "Mora", "0926687856", Parentesco.MADRE, "0991234567", null)),
                admin)));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "update estudiantes set nombres = 'Lucía', apellidos = 'Pérez Mora' where id = ?", id));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("""
                insert into inscripciones (estudiante_id, club_id, institucion_id, periodo_id)
                values (?, ?, ?, ?)
                """, id, escenario.clubId(), escenario.institucionId(), escenario.periodoId()));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "update autorizaciones_estudiante set observacion = 'Nuevo dato' where estudiante_id = ?", id));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "update certificados set archivo_eliminado_en = null where id = ?", escenario.certificadoId()));
    }

    @Test
    void soloAdministradorYResponsableDeLaInstitucionPuedenAnonimizar() throws IOException {
        Escenario escenario = escenarioConHistorial();
        Long id = escenario.estudianteId();
        Long otraInstitucion = nuevaInstitucion();

        assertEquals(HttpStatus.FORBIDDEN, estado(() ->
                estudianteService.anonimizar(id, MOTIVO, enMemoria("DOCENTE", escenario.institucionId()))));
        assertEquals(HttpStatus.FORBIDDEN, estado(() ->
                estudianteService.anonimizar(id, MOTIVO, enMemoria("COORDINADOR", null))));
        assertEquals(HttpStatus.FORBIDDEN, estado(() ->
                estudianteService.anonimizar(id, MOTIVO, enMemoria("CONSULTA", null))));
        assertEquals(HttpStatus.FORBIDDEN, estado(() ->
                estudianteService.anonimizar(id, MOTIVO, enMemoria("RESP_INSTITUCIONAL", otraInstitucion))));
        assertFalse(jdbc.queryForObject("select anonimizado from estudiantes where id = ?", Boolean.class, id));

        UsuarioPrincipal responsable = responsable(escenario.institucionId());
        autenticar(responsable);
        EstudianteResponse respuesta = estudianteService.anonimizar(id, MOTIVO, responsable);
        assertTrue(respuesta.anonimizado());
        assertEquals(responsable.getId(),
                jdbc.queryForObject("select anonimizado_por from estudiantes where id = ?", Long.class, id));
    }

    @Test
    void rechazaEstudiantesActivosOSinHistorial() {
        UsuarioPrincipal admin = administrador();
        Long institucion = nuevaInstitucion();
        Long activo = nuevoEstudiante(institucion);
        assertEquals(HttpStatus.CONFLICT, estado(() -> estudianteService.anonimizar(activo, MOTIVO, admin)));

        Long sinHistorial = nuevoEstudiante(institucion);
        jdbc.update("update estudiantes set estado = 'RETIRADO' where id = ?", sinHistorial);
        assertEquals(HttpStatus.CONFLICT, estado(() -> estudianteService.anonimizar(sinHistorial, MOTIVO, admin)));

        assertEquals(HttpStatus.BAD_REQUEST, estado(() -> estudianteService.anonimizar(sinHistorial,
                new AnonimizacionRequest("   corto       "), admin)));
    }

    private Escenario escenarioConHistorial() throws IOException {
        Long institucion = nuevaInstitucion();
        Long periodo = jdbc.queryForObject("""
                insert into periodos_academicos (nombre, fecha_inicio, fecha_fin)
                values (?, current_date - 60, current_date + 120) returning id
                """, Long.class, "Período " + UUID.randomUUID().toString().substring(0, 8));
        Long docente = jdbc.queryForObject(
                "insert into docentes (institucion_id, nombres, apellidos) values (?, 'Ana', 'Docente') returning id",
                Long.class, institucion);
        Long club = jdbc.queryForObject("""
                insert into clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, cupo_maximo, estado)
                values (?, ?, ?, 'Club de robótica de prueba', 'Construir robots', 20, 'ACTIVO') returning id
                """, Long.class, institucion, periodo, docente);
        Long estudiante = nuevoEstudiante(institucion);
        String codigo = jdbc.queryForObject("select codigo_interno from estudiantes where id = ?", String.class,
                estudiante);

        String rutaDocumento = "autorizaciones/prueba/" + UUID.randomUUID() + ".pdf";
        Path documento = escribir(rutaDocumento);
        jdbc.update("""
                insert into autorizaciones_estudiante (estudiante_id, tipo, estado, fecha_registro, documento_ruta,
                    documento_nombre, documento_tipo, documento_tamano, documento_hash, documento_subido_en,
                    documento_subido_por, registrado_por, observacion, representante_nombres, representante_apellidos,
                    representante_cedula, representante_parentesco, representante_telefono, representante_correo)
                values (?, 'PARTICIPACION', 'OTORGADA', current_date - 40, ?, 'autorizacion-lucia-perez.pdf',
                    'application/pdf', 10, ?, now(), 1, 1, 'Firmada por la madre', 'María', 'Mora', '0926687856',
                    'MADRE', '0991234567', 'maria@example.com')
                """, estudiante, rutaDocumento, "a".repeat(64));
        jdbc.update("insert into autorizaciones_estudiante (estudiante_id, tipo) values (?, 'USO_IMAGEN')", estudiante);

        Long inscripcion = jdbc.queryForObject("""
                insert into inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
                values (?, ?, ?, ?, current_date - 30) returning id
                """, Long.class, estudiante, club, institucion, periodo);
        Long curso = jdbc.queryForObject("""
                insert into cursos (club_id, institucion_id, nombre, nivel, modalidad, lugar, fecha_inicio, fecha_fin,
                    cupo_maximo, estado)
                values (?, ?, 'Programación con bloques', 'PRINCIPIANTE', 'PRESENCIAL', 'Aula 1',
                    current_date - 25, current_date - 1, 10, 'PLANIFICADO') returning id
                """, Long.class, club, institucion);
        jdbc.update("""
                insert into horarios (curso_id, dia_semana, hora_inicio, hora_fin, tipo_sesion)
                values (?, 3, '15:00', '16:00', 'PRESENCIAL')
                """, curso);
        jdbc.update("update cursos set estado = 'EN_CURSO' where id = ?", curso);
        Long inscripcionCurso = jdbc.queryForObject("""
                insert into inscripciones_curso (estudiante_id, curso_id, club_id, fecha_ingreso)
                values (?, ?, ?, current_date - 25) returning id
                """, Long.class, estudiante, curso, club);
        Long actividad = jdbc.queryForObject("""
                insert into actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema,
                    objetivo, creado_por)
                values (?, ?, ?, current_date - 5, '10:00', '11:00', 'Sensores ultrasónicos', 'Medir distancias', 1)
                returning id
                """, Long.class, club, institucion, docente);
        jdbc.update("""
                update actividades set estado = 'EJECUTADA', resumen_ejecucion = 'Sesión completa',
                    ejecutada_por = 1, fecha_registro_ejecucion = now()
                where id = ?
                """, actividad);
        jdbc.update("""
                insert into asistencias (actividad_id, club_id, estudiante_id, inscripcion_id, estado, registrado_por)
                values (?, ?, ?, ?, 'PRESENTE', 1)
                """, actividad, club, estudiante, inscripcion);
        jdbc.update("update cursos set estado = 'FINALIZADO' where id = ?", curso);
        jdbc.update("""
                update inscripciones_curso set estado = 'FINALIZADA', fecha_fin = current_date - 1, resultado = 'APROBADO'
                where id = ?
                """, inscripcionCurso);

        String codigoVerificacion = nuevoCodigoVerificacion();
        String rutaPdf = "certificados/prueba/" + UUID.randomUUID() + ".pdf";
        Path pdf = escribir(rutaPdf);
        Long certificado = jdbc.queryForObject("""
                insert into certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo,
                    inscripcion_curso_id, titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
                values (?, ?, ?, ?, 'APROBACION_CURSO', ?, 'Aprobación del curso Programación con bloques',
                    (now() at time zone 'America/Guayaquil')::date, 1, ?, ?, 10)
                returning id
                """, Long.class, codigoVerificacion, estudiante, institucion, club, inscripcionCurso, rutaPdf,
                "b".repeat(64));

        jdbc.update("update clubes set estado = 'CERRADO' where id = ?", club);
        jdbc.update("update estudiantes set estado = 'EGRESADO' where id = ?", estudiante);
        return new Escenario(institucion, periodo, club, estudiante, codigo, certificado, codigoVerificacion,
                documento, pdf);
    }

    private Long nuevaInstitucion() {
        String amie = String.format("%02d%c%05d", AZAR.nextInt(100), (char) ('A' + AZAR.nextInt(26)),
                AZAR.nextInt(100000));
        return jdbc.queryForObject("""
                insert into instituciones (codigo_amie, nombre, provincia, canton, estado_adhesion, fecha_adhesion)
                values (?, ?, 'Guayas', 'Guayaquil', 'ADHERIDA', current_date - 90) returning id
                """, Long.class, amie, "Unidad Educativa de prueba " + amie);
    }

    private Long nuevoEstudiante(Long institucion) {
        return jdbc.queryForObject("""
                insert into estudiantes (nombres, apellidos, institucion_id, curso)
                values ('Lucía', 'Pérez Mora', ?, 'EGB_8') returning id
                """, Long.class, institucion);
    }

    private String nuevoCodigoVerificacion() {
        StringBuilder codigo = new StringBuilder("TIPI");
        for (int bloque = 0; bloque < 3; bloque++) {
            codigo.append('-');
            for (int i = 0; i < 4; i++) {
                codigo.append(ALFABETO_VERIFICACION.charAt(AZAR.nextInt(ALFABETO_VERIFICACION.length())));
            }
        }
        return codigo.toString();
    }

    private Path escribir(String ruta) throws IOException {
        Path archivo = Paths.get(directorio).toAbsolutePath().normalize().resolve(ruta);
        Files.createDirectories(archivo.getParent());
        Files.writeString(archivo, "%PDF-1.4 prueba", StandardCharsets.UTF_8);
        return archivo;
    }

    private long contar(String sql, Object... argumentos) {
        return jdbc.queryForObject(sql, Long.class, argumentos);
    }

    private UsuarioPrincipal administrador() {
        return new UsuarioPrincipal(usuarioRepository.findById(1L).orElseThrow());
    }

    private UsuarioPrincipal responsable(Long institucion) {
        String usuario = "resp_anon_" + UUID.randomUUID().toString().substring(0, 8);
        Long id = jdbc.queryForObject("""
                insert into usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id)
                values (?, ?, 'sin-clave', 'Rosa', 'Responsable', (select id from roles where codigo = 'RESP_INSTITUCIONAL'), ?)
                returning id
                """, Long.class, usuario, usuario + "@prueba.ec", institucion);
        return new UsuarioPrincipal(usuarioRepository.findById(id).orElseThrow());
    }

    private UsuarioPrincipal enMemoria(String rol, Long institucion) {
        Rol entidad = new Rol();
        entidad.setCodigo(rol);
        Usuario usuario = new Usuario();
        usuario.setId(999_999L);
        usuario.setUsername("prueba_" + rol.toLowerCase());
        usuario.setRol(entidad);
        usuario.setInstitucionId(institucion);
        return new UsuarioPrincipal(usuario);
    }

    private void autenticar(UsuarioPrincipal principal) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private HttpStatus estado(Runnable accion) {
        return assertThrows(ApiException.class, accion::run).getStatus();
    }

    private record Escenario(Long institucionId, Long periodoId, Long clubId, Long estudianteId, String codigo,
                             Long certificadoId, String codigoVerificacion, Path documento, Path pdf) {
    }
}

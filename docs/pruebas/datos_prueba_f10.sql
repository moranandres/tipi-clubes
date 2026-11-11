INSERT INTO usuarios (username, email, password_hash, nombres, apellidos, rol_id, institucion_id, debe_cambiar_password)
SELECT v.u, v.u || '@tipi.local', (SELECT password_hash FROM usuarios WHERE username = 'admin'), v.n, 'Prueba F10',
       (SELECT id FROM roles WHERE codigo = v.r), v.i, false
FROM (VALUES ('f10resp1', 'Ramiro', 'RESP_INSTITUCIONAL', 1),
             ('f10doc1', 'Delia', 'DOCENTE', 1),
             ('f10doc2', 'Damián', 'DOCENTE', 1),
             ('f10resp2', 'Regina', 'RESP_INSTITUCIONAL', 2),
             ('f10doc3', 'Dalia', 'DOCENTE', 2),
             ('f10coord', 'Camila', 'COORDINADOR', NULL),
             ('f10consulta', 'Carlos', 'CONSULTA', NULL)) v(u, n, r, i);

INSERT INTO docentes (institucion_id, usuario_id, nombres, apellidos)
SELECT u.institucion_id, u.id, u.nombres, u.apellidos
FROM usuarios u
WHERE u.username IN ('f10doc1', 'f10doc2', 'f10doc3');

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo)
SELECT '2026-2027', DATE '2026-09-01', DATE '2027-07-31', true
WHERE NOT EXISTS (SELECT 1 FROM periodos_academicos WHERE activo);

INSERT INTO clubes (institucion_id, periodo_id, docente_id, nombre, objetivo, fecha_creacion, dia_semana,
                    hora_inicio, hora_fin, lugar, cupo_maximo, estado)
SELECT v.i,
       (SELECT id FROM periodos_academicos WHERE activo ORDER BY id DESC LIMIT 1),
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.d),
       v.n, v.o, fn_hoy_guayaquil() - 50, 4, TIME '14:00', TIME '16:00', v.l, 20, 'ACTIVO'
FROM (VALUES (1, 'f10doc1', 'F10 Robótica', 'Robótica educativa con Arduino', 'Laboratorio de computación'),
             (1, 'f10doc1', 'F10 Programación', 'Programación de aplicaciones con MIT App Inventor', 'Aula 4'),
             (2, 'f10doc3', 'F10 Robótica Institución 2', 'Robótica con kits LEGO', 'Biblioteca')
     ) v(i, d, n, o, l);

INSERT INTO estudiantes (nombres, apellidos, institucion_id, curso) VALUES
    ('Ana', 'Prueba F10', 1, 'EGB_8'),
    ('Beto', 'Prueba F10', 1, 'EGB_8'),
    ('Caro', 'Prueba F10', 1, 'EGB_9'),
    ('Dani', 'Prueba F10', 1, 'EGB_9'),
    ('Eva', 'Prueba F10', 1, 'EGB_10'),
    ('Fabi', 'Prueba F10', 1, 'EGB_10'),
    ('Gabi', 'Prueba F10', 2, 'EGB_8');

INSERT INTO autorizaciones_estudiante (estudiante_id, tipo)
SELECT e.id, t.tipo
FROM estudiantes e CROSS JOIN (VALUES ('PARTICIPACION'), ('USO_IMAGEN')) t(tipo)
WHERE e.apellidos = 'Prueba F10';

UPDATE autorizaciones_estudiante a
SET estado = 'OTORGADA', fecha_registro = fn_hoy_guayaquil(), documento_ruta = 'pruebas/f10.pdf',
    documento_nombre = 'autorizacion-f10.pdf', documento_hash = repeat('c', 64), documento_tipo = 'application/pdf',
    documento_tamano = 10, documento_subido_en = now()
FROM estudiantes e
WHERE e.id = a.estudiante_id AND e.apellidos = 'Prueba F10';

INSERT INTO inscripciones (estudiante_id, club_id, institucion_id, periodo_id, fecha_ingreso)
SELECT e.id, c.id, c.institucion_id, c.periodo_id, fn_hoy_guayaquil() - v.dias
FROM (VALUES ('Ana', 'F10 Robótica', 40),
             ('Beto', 'F10 Robótica', 40),
             ('Caro', 'F10 Robótica', 40),
             ('Dani', 'F10 Robótica', 40),
             ('Eva', 'F10 Robótica', 3),
             ('Fabi', 'F10 Programación', 40),
             ('Gabi', 'F10 Robótica Institución 2', 40)) v(nombre, club, dias)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F10'
JOIN clubes c ON c.nombre = v.club;

INSERT INTO actividades (club_id, institucion_id, responsable_id, fecha, hora_inicio, hora_fin, tema, objetivo,
                         lugar, creado_por)
SELECT c.id, c.institucion_id,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.responsable),
       fn_hoy_guayaquil() + v.dias, v.inicio, v.fin, v.tema, v.objetivo, c.lugar,
       (SELECT id FROM usuarios WHERE username = v.responsable)
FROM (VALUES ('F10 Robótica', 'f10doc1', -28, TIME '14:00', TIME '16:00', 'F10 Armado del chasis', 'Ensamblar la base del robot'),
             ('F10 Robótica', 'f10doc1', -21, TIME '14:00', TIME '16:00', 'F10 Motores y ruedas', 'Conectar los motores DC'),
             ('F10 Robótica', 'f10doc1', -14, TIME '14:00', TIME '16:00', 'F10 Sensores de distancia', 'Leer el sensor ultrasónico'),
             ('F10 Robótica', 'f10doc1', -12, TIME '14:00', TIME '16:00', 'F10 Programación del brazo', 'Mover los servomotores del brazo'),
             ('F10 Robótica', 'f10doc1', -7, TIME '14:00', TIME '16:00', 'F10 Sesión cancelada', 'Visitar la feria de ciencias'),
             ('F10 Robótica', 'f10doc2', -5, TIME '10:00', TIME '11:30', 'F10 Refuerzo con Damián', 'Repasar la protoboard'),
             ('F10 Robótica', 'f10doc1', -1, TIME '14:00', TIME '16:00', 'F10 Sesión de ayer', 'Probar el semáforo'),
             ('F10 Robótica', 'f10doc1', 6, TIME '14:00', TIME '16:00', 'F10 Sesión próxima', 'Preparar la demostración'),
             ('F10 Programación', 'f10doc1', -20, TIME '09:00', TIME '10:30', 'F10 Bloques de App Inventor', 'Conocer el diseñador de pantallas'),
             ('F10 Programación', 'f10doc1', -13, TIME '09:00', TIME '10:30', 'F10 Base de datos local', 'Guardar datos con TinyDB'),
             ('F10 Programación', 'f10doc1', -6, TIME '09:00', TIME '10:30', 'F10 Publicación de la app', 'Generar el instalador APK'),
             ('F10 Robótica Institución 2', 'f10doc3', -16, TIME '14:00', TIME '16:00', 'F10 Piezas LEGO', 'Reconocer las piezas del kit'),
             ('F10 Robótica Institución 2', 'f10doc3', -9, TIME '14:00', TIME '16:00', 'F10 Engranajes LEGO', 'Construir un tren de engranajes'),
             ('F10 Robótica Institución 2', 'f10doc3', -2, TIME '14:00', TIME '16:00', 'F10 Robot seguidor LEGO', 'Programar el seguidor de línea')
     ) v(club, responsable, dias, inicio, fin, tema, objetivo)
JOIN clubes c ON c.nombre = v.club;

DO $$
BEGIN
    PERFORM set_config('tipi.motivo_reprogramacion', 'El laboratorio estuvo ocupado por las pruebas de grado', true);
    PERFORM set_config('tipi.usuario_id', (SELECT id::text FROM usuarios WHERE username = 'f10doc1'), true);
    UPDATE actividades SET fecha = fecha + 2, actualizado_en = now() WHERE tema = 'F10 Programación del brazo';
    UPDATE actividades SET fecha = fecha + 7, actualizado_en = now() WHERE tema = 'F10 Sesión próxima';
END $$;

UPDATE actividades a
SET estado = 'EJECUTADA', resumen_ejecucion = 'Sesión desarrollada según lo planificado',
    ejecutada_por = a.creado_por,
    fecha_registro_ejecucion = ((a.fecha + v.dias_registro) + TIME '18:00') AT TIME ZONE 'America/Guayaquil',
    actualizado_en = now()
FROM (VALUES ('F10 Armado del chasis', 0),
             ('F10 Motores y ruedas', 5),
             ('F10 Programación del brazo', 1),
             ('F10 Refuerzo con Damián', 0),
             ('F10 Publicación de la app', 0),
             ('F10 Engranajes LEGO', 0),
             ('F10 Robot seguidor LEGO', 1)) v(tema, dias_registro)
WHERE a.tema = v.tema;

UPDATE actividades
SET estado = 'CANCELADA', motivo_cancelacion = 'La feria se suspendió por lluvias', cancelada_por = creado_por,
    fecha_cancelacion = now(), actualizado_en = now()
WHERE tema = 'F10 Sesión cancelada';

INSERT INTO evidencias (actividad_id, club_id, institucion_id, tipo, titulo, descripcion, fecha_evidencia, url,
                        registrado_por)
SELECT a.id, a.club_id, a.institucion_id, 'ENLACE', v.titulo, v.descripcion, a.fecha, v.url, a.creado_por
FROM (VALUES ('F10 Armado del chasis', 'F10 Video del chasis', 'Video del primer armado del chasis del brazo', 'https://example.org/f10-chasis'),
             ('F10 Programación del brazo', 'F10 Código del brazo', 'Repositorio con el programa de los servomotores', 'https://example.org/f10-brazo'),
             ('F10 Publicación de la app', 'F10 Instalador de la app', 'Enlace al instalador APK de la app de reciclaje', 'https://example.org/f10-app')
     ) v(tema, titulo, descripcion, url)
JOIN actividades a ON a.tema = v.tema;

INSERT INTO proyectos (club_id, institucion_id, docente_id, tipo, titulo, objetivo, descripcion, fecha_inicio,
                       fecha_fin_prevista, creado_por)
SELECT c.id, c.institucion_id,
       (SELECT d.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id WHERE u.username = v.tutor),
       v.tipo, v.titulo, v.objetivo, v.descripcion, fn_hoy_guayaquil() - v.inicio,
       CASE WHEN v.fin IS NULL THEN NULL ELSE fn_hoy_guayaquil() + v.fin END,
       (SELECT id FROM usuarios WHERE username = 'f10doc1')
FROM (VALUES ('F10 Robótica', 'f10doc1', 'PROTOTIPO', 'F10 Brazo robótico', 'Construir un brazo que clasifique piezas por color', 'Brazo de cuatro servomotores controlado con Arduino', 30, 40),
             ('F10 Robótica', 'f10doc2', 'PROTOTIPO', 'F10 Semáforo inteligente', 'Simular un semáforo que detecta peatones', NULL, 25, NULL),
             ('F10 Robótica', 'f10doc1', 'OTRO', 'F10 Maqueta descartada', 'Maqueta de una ciudad inteligente', NULL, 35, NULL),
             ('F10 Programación', 'f10doc1', 'SOFTWARE', 'F10 App de reciclaje', 'App que enseña a separar residuos', 'Aplicación Android hecha con App Inventor', 25, 30)
     ) v(club, tutor, tipo, titulo, objetivo, descripcion, inicio, fin)
JOIN clubes c ON c.nombre = v.club;

INSERT INTO proyectos (club_id, institucion_id, docente_id, tipo, titulo, objetivo, fecha_inicio, creado_por)
SELECT c.id, c.institucion_id, c.docente_id, 'PROTOTIPO', 'F10 Robot LEGO de rescate',
       'Robot que recorre un laberinto y encuentra una víctima', fn_hoy_guayaquil() - 20,
       (SELECT id FROM usuarios WHERE username = 'f10doc3')
FROM clubes c WHERE c.nombre = 'F10 Robótica Institución 2';

INSERT INTO proyecto_integrantes (proyecto_id, estudiante_id)
SELECT p.id, e.id
FROM (VALUES ('F10 Brazo robótico', 'Ana'),
             ('F10 Brazo robótico', 'Beto'),
             ('F10 Brazo robótico', 'Caro'),
             ('F10 Semáforo inteligente', 'Dani'),
             ('F10 Maqueta descartada', 'Caro'),
             ('F10 App de reciclaje', 'Fabi'),
             ('F10 Robot LEGO de rescate', 'Gabi')) v(titulo, nombre)
JOIN proyectos p ON p.titulo = v.titulo
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F10';

INSERT INTO proyecto_evidencias (proyecto_id, evidencia_id)
SELECT p.id, ev.id
FROM proyectos p JOIN evidencias ev ON ev.titulo = 'F10 Video del chasis'
WHERE p.titulo = 'F10 Brazo robótico';

INSERT INTO avances (club_id, institucion_id, alcance, estudiante_id, proyecto_id, actividad_id, fecha, resultados,
                     logros, dificultades, proximos_pasos, porcentaje_avance, registrado_por)
SELECT c.id, c.institucion_id, v.alcance,
       (SELECT e.id FROM estudiantes e WHERE e.nombres = v.estudiante AND e.apellidos = 'Prueba F10'),
       (SELECT p.id FROM proyectos p WHERE p.titulo = v.proyecto),
       (SELECT a.id FROM actividades a WHERE a.tema = v.actividad),
       fn_hoy_guayaquil() - v.dias, v.resultados, v.logros, v.dificultades, v.pasos, v.porcentaje,
       (SELECT id FROM usuarios WHERE username = v.autor)
FROM (VALUES ('F10 Robótica', 'PROYECTO', NULL, 'F10 Brazo robótico', 'F10 Armado del chasis', 28, 'Chasis del brazo armado y probado', 'La base soporta el peso de los servos', 'Faltan tornillos M3', 'Montar los servomotores', 30, 'f10doc1'),
             ('F10 Robótica', 'PROYECTO', NULL, 'F10 Brazo robótico', 'F10 Programación del brazo', 10, 'Servos del brazo programados con posiciones fijas', 'El brazo levanta piezas de 50 g', NULL, 'Agregar el sensor de color', 55, 'f10doc1'),
             ('F10 Robótica', 'PROYECTO', NULL, 'F10 Semáforo inteligente', 'F10 Refuerzo con Damián', 5, 'Circuito de LEDs del semáforo montado', NULL, 'El pulsador rebota', 'Programar los tiempos', 40, 'f10doc2'),
             ('F10 Robótica', 'CLUB', NULL, NULL, 'F10 Motores y ruedas', 21, 'El club completó el montaje de motores en todos los equipos', 'Todos los equipos movieron su robot', 'Dos motores llegaron dañados', 'Comenzar con sensores', NULL, 'f10doc1'),
             ('F10 Robótica', 'ESTUDIANTE', 'Ana', NULL, 'F10 Armado del chasis', 28, 'Ana armó el chasis siguiendo el plano', NULL, 'Le cuesta leer el diagrama', NULL, NULL, 'f10doc1'),
             ('F10 Robótica', 'ESTUDIANTE', 'Ana', NULL, 'F10 Programación del brazo', 10, 'Ana programó la secuencia de los servos sin ayuda', 'Explicó su programa al grupo', NULL, 'Resolver el reto del sensor de color', NULL, 'f10doc1'),
             ('F10 Robótica', 'ESTUDIANTE', 'Beto', NULL, 'F10 Programación del brazo', 10, 'Beto coordinó el trabajo del equipo', NULL, NULL, NULL, NULL, 'f10doc1'),
             ('F10 Robótica', 'ESTUDIANTE', 'Caro', NULL, NULL, 15, 'Registro hecho por error', NULL, NULL, NULL, NULL, 'f10doc1'),
             ('F10 Programación', 'PROYECTO', NULL, 'F10 App de reciclaje', 'F10 Publicación de la app', 6, 'App publicada para pruebas', NULL, NULL, NULL, 90, 'f10doc1'),
             ('F10 Robótica Institución 2', 'ESTUDIANTE', 'Gabi', NULL, 'F10 Engranajes LEGO', 9, 'Gabi armó el tren de engranajes', NULL, NULL, NULL, NULL, 'f10doc3')
     ) v(club, alcance, estudiante, proyecto, actividad, dias, resultados, logros, dificultades, pasos, porcentaje, autor)
JOIN clubes c ON c.nombre = v.club;

INSERT INTO avance_competencias (avance_id, contenido_id, nivel)
SELECT av.id, cc.id, v.nivel
FROM (VALUES ('Ana', 28, 'Mecánica y ensamblaje', 'INICIAL'),
             ('Ana', 28, 'Pensamiento computacional', 'INICIAL'),
             ('Ana', 10, 'Mecánica y ensamblaje', 'LOGRADO'),
             ('Ana', 10, 'Pensamiento computacional', 'EN_PROCESO'),
             ('Ana', 10, 'Comunicación de resultados', 'DESTACADO'),
             ('Beto', 10, 'Trabajo en equipo', 'LOGRADO'),
             ('Gabi', 9, 'Mecánica y ensamblaje', 'EN_PROCESO')) v(nombre, dias, competencia, nivel)
JOIN estudiantes e ON e.nombres = v.nombre AND e.apellidos = 'Prueba F10'
JOIN avances av ON av.estudiante_id = e.id AND av.fecha = fn_hoy_guayaquil() - v.dias
JOIN catalogo_contenidos cc ON cc.nombre = v.competencia;

UPDATE avances av
SET estado = 'ANULADO', motivo_anulacion = 'Se registró en la fecha equivocada', anulado_por = av.registrado_por,
    fecha_anulacion = now(), actualizado_en = now()
FROM estudiantes e
WHERE e.id = av.estudiante_id AND e.nombres = 'Caro' AND e.apellidos = 'Prueba F10';

UPDATE proyectos p
SET estado = 'FINALIZADO', resultado_final = 'App instalada en 12 teléfonos de la institución',
    fecha_finalizacion = fn_hoy_guayaquil() - 3, finalizado_por = p.creado_por, actualizado_en = now()
WHERE p.titulo = 'F10 App de reciclaje';

UPDATE proyectos p
SET estado = 'CANCELADO', motivo_cancelacion = 'El equipo decidió concentrarse en el brazo robótico',
    cancelado_por = p.creado_por, fecha_cancelacion = now(), actualizado_en = now()
WHERE p.titulo = 'F10 Maqueta descartada';

SELECT c.nombre AS club, p.titulo, p.tipo, p.estado,
       (SELECT count(*) FROM proyecto_integrantes pi WHERE pi.proyecto_id = p.id) AS integrantes,
       (SELECT count(*) FROM avances av WHERE av.proyecto_id = p.id AND av.estado = 'ACTIVO') AS avances
FROM proyectos p
JOIN clubes c ON c.id = p.club_id
WHERE p.titulo LIKE 'F10 %'
ORDER BY c.nombre, p.titulo;

SELECT c.nombre AS club, a.tema, to_char(a.fecha, 'DD/MM') AS fecha, a.estado,
       (SELECT count(*) FROM actividad_reprogramaciones r WHERE r.actividad_id = a.id) AS reprogramaciones
FROM actividades a
JOIN clubes c ON c.id = a.club_id
WHERE a.tema LIKE 'F10 %'
ORDER BY c.nombre, a.fecha;

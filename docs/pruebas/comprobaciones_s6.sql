SELECT max(ic.id) FILTER (WHERE e.nombres = 'Ana') AS ic_ana,
       max(ic.id) FILTER (WHERE e.nombres = 'Beto') AS ic_beto,
       max(ic.id) FILTER (WHERE e.nombres = 'Caro') AS ic_caro
FROM inscripciones_curso ic JOIN estudiantes e ON e.id = ic.estudiante_id
WHERE e.apellidos = 'Prueba S6' \gset

SELECT max(p.id) FILTER (WHERE e.nombres = 'Ana') AS p_ana,
       max(p.id) FILTER (WHERE e.nombres = 'Beto') AS p_beto,
       max(p.id) FILTER (WHERE e.nombres = 'Dani') AS p_dani
FROM participaciones_competencia p JOIN estudiantes e ON e.id = p.estudiante_id
WHERE e.apellidos = 'Prueba S6' \gset

SELECT max(c.id) FILTER (WHERE c.estado = 'EMITIDO') AS cert_vigente,
       max(c.id) FILTER (WHERE c.estado = 'ANULADO') AS cert_anulado
FROM certificados c
WHERE c.inscripcion_curso_id = :ic_ana AND c.tipo = 'APROBACION_CURSO' \gset

SELECT max(id) FILTER (WHERE username = 'admin') AS admin_id,
       max(id) FILTER (WHERE username = 's6doc1') AS doc1_id
FROM usuarios \gset

SELECT id AS ed_pasada FROM ediciones_competencia WHERE nombre = 'Prueba S6 Killtronic pasada' \gset

SELECT id AS club_prog FROM clubes WHERE nombre = 'S6 Programación' \gset

BEGIN;
DELETE FROM certificados WHERE id = :cert_vigente;
ROLLBACK;

BEGIN;
UPDATE certificados SET titulo = 'Aprobación con honores' WHERE id = :cert_vigente;
ROLLBACK;

BEGIN;
UPDATE certificados SET estado = 'EMITIDO', anulado_por = NULL, fecha_anulacion = NULL, motivo_anulacion = NULL
WHERE id = :cert_anulado;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, inscripcion_curso_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'TIPI-TEST-0000-0001', ic.estudiante_id, cu.institucion_id, ic.club_id, 'PARTICIPACION_CURSO', ic.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date, :doc1_id, 'certificados/prueba-1.pdf',
       repeat('a', 64), 100
FROM inscripciones_curso ic JOIN cursos cu ON cu.id = ic.curso_id WHERE ic.id = :ic_beto;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, inscripcion_curso_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'TIPI-TEST-0000-0002', ic.estudiante_id, cu.institucion_id, ic.club_id, 'APROBACION_CURSO', ic.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date, :admin_id, 'certificados/prueba-2.pdf',
       repeat('a', 64), 100
FROM inscripciones_curso ic JOIN cursos cu ON cu.id = ic.curso_id WHERE ic.id = :ic_beto;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, inscripcion_curso_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'TIPI-TEST-0000-0003', ic.estudiante_id, cu.institucion_id, ic.club_id, 'PARTICIPACION_CURSO', ic.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date, :admin_id, 'certificados/prueba-3.pdf',
       repeat('a', 64), 100
FROM inscripciones_curso ic JOIN cursos cu ON cu.id = ic.curso_id WHERE ic.id = :ic_caro;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, participacion_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'TIPI-TEST-0000-0004', p.estudiante_id, p.institucion_id, p.club_id, 'RECONOCIMIENTO_COMPETENCIA', p.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date, :admin_id, 'certificados/prueba-4.pdf',
       repeat('a', 64), 100
FROM participaciones_competencia p WHERE p.id = :p_beto;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, participacion_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'TIPI-TEST-0000-0005', p.estudiante_id, p.institucion_id, p.club_id, 'PARTICIPACION_COMPETENCIA', p.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date, :admin_id, 'certificados/prueba-5.pdf',
       repeat('a', 64), 100
FROM participaciones_competencia p WHERE p.id = :p_dani;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, participacion_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'TIPI-TEST-0000-0006', p.estudiante_id, p.institucion_id, p.club_id, 'PARTICIPACION_COMPETENCIA', p.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date - 1, :admin_id, 'certificados/prueba-6.pdf',
       repeat('a', 64), 100
FROM participaciones_competencia p WHERE p.id = :p_beto;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, participacion_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'TIPI-TEST-0000-0007', p.estudiante_id, p.institucion_id, :club_prog, 'PARTICIPACION_COMPETENCIA', p.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date, :admin_id, 'certificados/prueba-7.pdf',
       repeat('a', 64), 100
FROM participaciones_competencia p WHERE p.id = :p_beto;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, inscripcion_curso_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'TIPI-TEST-0000-0008', ic.estudiante_id, cu.institucion_id, ic.club_id, 'APROBACION_CURSO', ic.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date, :admin_id, 'certificados/prueba-8.pdf',
       repeat('a', 64), 100
FROM inscripciones_curso ic JOIN cursos cu ON cu.id = ic.curso_id WHERE ic.id = :ic_ana;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, club_id, tipo, participacion_id,
                          titulo, fecha_emision, emitido_por, archivo_ruta, archivo_hash, archivo_tamano)
SELECT 'ABC-123', p.estudiante_id, p.institucion_id, p.club_id, 'PARTICIPACION_COMPETENCIA', p.id,
       'Prueba', (now() AT TIME ZONE 'America/Guayaquil')::date, :admin_id, 'certificados/prueba-9.pdf',
       repeat('a', 64), 100
FROM participaciones_competencia p WHERE p.id = :p_beto;
ROLLBACK;

BEGIN;
UPDATE inscripciones_curso SET resultado = 'NO_APROBADO' WHERE id = :ic_ana;
ROLLBACK;

BEGIN;
UPDATE ediciones_competencia SET fecha_inicio = NULL, fecha_fin = NULL WHERE id = :ed_pasada;
ROLLBACK;

SELECT accion, count(*) AS veces
FROM auditoria
WHERE accion LIKE 'CERTIFICADO_%' OR accion = 'RESULTADO_CURSO_REGISTRADO'
GROUP BY accion
ORDER BY accion;

SELECT c.codigo_verificacion, c.tipo, c.estado, e.codigo_interno, c.archivo_tamano, left(c.archivo_hash, 12) AS huella
FROM certificados c JOIN estudiantes e ON e.id = c.estudiante_id
WHERE e.apellidos = 'Prueba S6'
ORDER BY c.id;

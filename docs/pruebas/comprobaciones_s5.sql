SELECT max(i.id) FILTER (WHERE e.nombres = 'Ana') AS insc_ana,
       max(i.id) FILTER (WHERE e.nombres = 'Caro') AS insc_caro,
       max(i.id) FILTER (WHERE e.nombres = 'Eva') AS insc_eva,
       max(e.id) FILTER (WHERE e.nombres = 'Beto') AS est_beto
FROM inscripciones i JOIN estudiantes e ON e.id = i.estudiante_id
WHERE e.apellidos = 'Prueba S5' \gset

SELECT max(id) FILTER (WHERE nombre = 'Killtronic 2026') AS ed26,
       max(id) FILTER (WHERE nombre = 'Killtronic 2027') AS ed27
FROM ediciones_competencia \gset

SELECT max(id) FILTER (WHERE nombre = 'Sumo LEGO') AS cat_sumo,
       max(id) FILTER (WHERE nombre = 'Laberinto') AS cat_laberinto
FROM categorias_competencia \gset

SELECT max(p.id) FILTER (WHERE e.nombres = 'Ana' AND p.categoria_id = :cat_sumo) AS p_ana,
       max(p.id) FILTER (WHERE e.nombres = 'Dani') AS p_dani,
       max(p.id) FILTER (WHERE e.nombres = 'Fede') AS p_fede
FROM participaciones_competencia p JOIN estudiantes e ON e.id = p.estudiante_id
WHERE e.apellidos = 'Prueba S5' \gset

SELECT id AS admin_id FROM usuarios WHERE username = 'admin' \gset

SELECT id AS comp FROM competencias WHERE nombre = 'Killtronic' \gset

BEGIN;
INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, registrado_por)
SELECT i.estudiante_id, i.institucion_id, i.club_id, i.id, :comp, :ed26, :cat_laberinto, :admin_id
FROM inscripciones i WHERE i.id = :insc_eva;
ROLLBACK;

BEGIN;
INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, registrado_por)
SELECT i.estudiante_id, i.institucion_id, i.club_id, i.id, :comp, :ed26, :cat_laberinto, :admin_id
FROM inscripciones i WHERE i.id = :insc_caro;
ROLLBACK;

BEGIN;
UPDATE participaciones_competencia SET categoria_id = :cat_laberinto WHERE id = :p_ana;
ROLLBACK;

BEGIN;
INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, registrado_por)
SELECT :est_beto, i.institucion_id, i.club_id, i.id, :comp, :ed26, :cat_laberinto, :admin_id
FROM inscripciones i WHERE i.id = :insc_ana;
ROLLBACK;

BEGIN;
INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, registrado_por)
SELECT i.estudiante_id, i.institucion_id, i.club_id, i.id, :comp, :ed26, :cat_sumo, :admin_id
FROM inscripciones i WHERE i.id = :insc_ana;
ROLLBACK;

BEGIN;
UPDATE participaciones_competencia SET equipo_nombre = 'LOS TITANES' WHERE id = :p_dani;
ROLLBACK;

BEGIN;
INSERT INTO participaciones_competencia (estudiante_id, institucion_id, club_id, inscripcion_id, competencia_id,
                                         edicion_id, categoria_id, puesto, registrado_por)
SELECT i.estudiante_id, i.institucion_id, i.club_id, i.id, :comp, :ed27, :cat_laberinto, 1, :admin_id
FROM inscripciones i WHERE i.id = :insc_ana;
ROLLBACK;

BEGIN;
DELETE FROM ediciones_competencia WHERE id = :ed27;
ROLLBACK;

BEGIN;
UPDATE categorias_competencia SET nivel = 'AVANZADA' WHERE id = :cat_sumo;
ROLLBACK;

BEGIN;
UPDATE ediciones_competencia SET anio = 2099, fecha_inicio = DATE '2099-01-10', fecha_fin = DATE '2099-01-11'
WHERE id = :ed26;
ROLLBACK;

BEGIN;
INSERT INTO certificados (codigo_verificacion, estudiante_id, institucion_id, tipo, participacion_id, titulo, emitido_por)
SELECT 'PRUEBA-S5-0001', p.estudiante_id, p.institucion_id, 'RECONOCIMIENTO_COMPETENCIA', p.id,
       'Primer lugar Sumo LEGO', :admin_id
FROM participaciones_competencia p WHERE p.id = :p_ana;
DELETE FROM participaciones_competencia WHERE id = :p_ana;
ROLLBACK;

BEGIN;
UPDATE participaciones_competencia SET equipo_nombre = ' Trujillo Bots ' WHERE id = :p_fede;
ROLLBACK;

SELECT accion, count(*) AS veces
FROM auditoria
WHERE entidad IN ('PARTICIPACION_COMPETENCIA', 'EDICION_COMPETENCIA', 'CATEGORIA_COMPETENCIA', 'COMPETENCIA')
GROUP BY accion
ORDER BY accion;

SELECT detalle FROM auditoria
WHERE entidad = 'PARTICIPACION_COMPETENCIA'
ORDER BY id;

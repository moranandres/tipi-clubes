\set r1 1
\set r3 3
\set r5 5
SELECT max(i.id) FILTER (WHERE e.nombres = 'Gaby') AS gaby,
       max(i.id) FILTER (WHERE e.nombres = 'Hugo') AS hugo
FROM inscripciones i JOIN estudiantes e ON e.id = i.estudiante_id
WHERE e.apellidos = 'Prueba S4' \gset

BEGIN;
UPDATE inscripciones SET estado = 'RETIRADA', fecha_retiro = current_date WHERE id = :hugo;
ROLLBACK;

BEGIN;
UPDATE solicitudes_retiro SET observacion_resolucion = 'Cambio posterior' WHERE id = :r1;
ROLLBACK;

BEGIN;
DELETE FROM solicitudes_retiro WHERE id = :r3;
ROLLBACK;

BEGIN;
UPDATE solicitudes_retiro SET motivo = 'Otro motivo distinto' WHERE id = :r5;
ROLLBACK;

BEGIN;
UPDATE solicitudes_retiro
SET estado = 'APROBADA', resuelto_por = (SELECT id FROM usuarios WHERE username = 'admin'),
    fecha_resolucion = now(), fecha_retiro = current_date
WHERE id = :r5;
ROLLBACK;

BEGIN;
UPDATE solicitudes_retiro
SET estado = 'RECHAZADA', resuelto_por = solicitado_por, fecha_resolucion = now(),
    observacion_resolucion = 'Se rechaza a sí mismo'
WHERE id = :r5;
ROLLBACK;

BEGIN;
INSERT INTO solicitudes_retiro (inscripcion_id, institucion_id, motivo, solicitado_por)
VALUES (:gaby, 1, 'Gaby ya fue retirada antes', (SELECT id FROM usuarios WHERE username = 'admin'));
ROLLBACK;

BEGIN;
INSERT INTO solicitudes_retiro (inscripcion_id, institucion_id, motivo, solicitado_por, estado,
                                resuelto_por, fecha_resolucion, observacion_resolucion)
VALUES (:hugo, 1, 'Intento de nacer rechazada', (SELECT id FROM usuarios WHERE username = 's4doc1'),
        'RECHAZADA', (SELECT id FROM usuarios WHERE username = 'admin'), now(), 'Sin pasar por PENDIENTE');
ROLLBACK;

BEGIN;
DELETE FROM solicitudes_retiro_cursos WHERE solicitud_retiro_id = :r1;
ROLLBACK;

BEGIN;
UPDATE inscripciones_curso SET fecha_fin = NULL
WHERE id = (SELECT min(inscripcion_curso_id) FROM solicitudes_retiro_cursos WHERE solicitud_retiro_id = :r1);
ROLLBACK;

SELECT accion, entidad_id, detalle FROM auditoria
WHERE entidad = 'SOLICITUD_RETIRO' OR detalle LIKE '%por retiro aprobado%'
ORDER BY id;

ALTER TABLE inscripciones DROP CONSTRAINT ck_insc_estado;
ALTER TABLE inscripciones
    ADD CONSTRAINT ck_insc_estado CHECK (estado IN ('ACTIVA', 'RETIRADA', 'TRASLADADA', 'FINALIZADA'));

CREATE FUNCTION fn_fecha_salida_club(p_fecha_ingreso DATE, p_periodo_id INT) RETURNS DATE AS $$
    SELECT greatest(p_fecha_ingreso, least(current_date, p.fecha_fin))
    FROM periodos_academicos p
    WHERE p.id = p_periodo_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION fn_validar_salida_inscripcion() RETURNS trigger AS $$
DECLARE
    v_estado_club VARCHAR(15);
BEGIN
    IF NEW.estado = OLD.estado OR NEW.estado = 'ACTIVA' THEN
        RETURN NEW;
    END IF;
    IF OLD.estado <> 'ACTIVA' THEN
        RAISE EXCEPTION 'La inscripción ya está en estado % y solo puede reactivarse mediante una nueva solicitud de inscripción aprobada',
            OLD.estado
            USING ERRCODE = '23TP1';
    END IF;
    IF EXISTS (
        SELECT 1 FROM inscripciones_curso ic
        WHERE ic.estudiante_id = NEW.estudiante_id
          AND ic.club_id = NEW.club_id
          AND ic.estado = 'ACTIVA'
    ) THEN
        RAISE EXCEPTION 'El estudiante conserva inscripciones activas en cursos del club; deben cerrarse antes de su salida del club'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.estado = 'RETIRADA' AND NOT EXISTS (
        SELECT 1 FROM solicitudes_retiro r
        WHERE r.inscripcion_id = NEW.id
          AND r.estado = 'PENDIENTE'
    ) THEN
        RAISE EXCEPTION 'El retiro de un estudiante de un club solo se registra al aprobar su solicitud de retiro'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.estado = 'FINALIZADA' THEN
        SELECT estado INTO v_estado_club FROM clubes WHERE id = NEW.club_id;
        IF v_estado_club <> 'CERRADO' THEN
            RAISE EXCEPTION 'La participación en un club solo se finaliza al cerrar el club; el club está en estado %',
                v_estado_club
                USING ERRCODE = '23TP1';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_validar_club_cursos() RETURNS trigger AS $$
DECLARE
    v_cursos TEXT;
    v_solicitudes BIGINT;
    v_retiros BIGINT;
BEGIN
    IF NEW.estado = 'CERRADO' AND OLD.estado <> 'CERRADO' THEN
        SELECT string_agg(format('«%s» (%s)', cu.nombre, cu.estado), ', ' ORDER BY cu.nombre)
        INTO v_cursos
        FROM cursos cu
        WHERE cu.club_id = NEW.id AND cu.estado IN ('PLANIFICADO', 'EN_CURSO');
        IF v_cursos IS NOT NULL THEN
            RAISE EXCEPTION 'El club tiene cursos planificados o en curso: %. Finalícelos o cancélelos antes de cerrar el club',
                v_cursos
                USING ERRCODE = '23TP1';
        END IF;
        SELECT count(*) INTO v_solicitudes
        FROM solicitudes_inscripcion s
        WHERE s.club_id = NEW.id AND s.estado IN ('PENDIENTE', 'EN_REVISION');
        SELECT count(*) INTO v_retiros
        FROM solicitudes_retiro r
        JOIN inscripciones i ON i.id = r.inscripcion_id
        WHERE i.club_id = NEW.id AND r.estado = 'PENDIENTE';
        IF v_solicitudes > 0 OR v_retiros > 0 THEN
            RAISE EXCEPTION 'El club tiene % solicitudes de inscripción abiertas y % solicitudes de retiro pendientes; deben cancelarse antes de cerrar el club',
                v_solicitudes, v_retiros
                USING ERRCODE = '23TP1';
        END IF;
    END IF;
    IF NEW.cupo_maximo < OLD.cupo_maximo AND EXISTS (
        SELECT 1 FROM cursos
        WHERE club_id = NEW.id AND estado IN ('PLANIFICADO', 'EN_CURSO') AND cupo_maximo > NEW.cupo_maximo
    ) THEN
        RAISE EXCEPTION 'El club tiene cursos con un cupo mayor que el nuevo cupo del club. Reduzca primero el cupo de esos cursos'
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION fn_finalizar_integrantes_club() RETURNS trigger AS $$
BEGIN
    UPDATE inscripciones i
    SET estado = 'FINALIZADA',
        fecha_retiro = fn_fecha_salida_club(i.fecha_ingreso, i.periodo_id)
    WHERE i.club_id = NEW.id
      AND i.estado = 'ACTIVA';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clubes_cierre_integrantes
    AFTER UPDATE OF estado ON clubes
    FOR EACH ROW
    WHEN (NEW.estado = 'CERRADO' AND OLD.estado IS DISTINCT FROM 'CERRADO')
    EXECUTE FUNCTION fn_finalizar_integrantes_club();

UPDATE solicitudes_inscripcion s
SET estado = 'CANCELADA',
    resuelto_por = (SELECT id FROM usuarios WHERE username = 'admin'),
    fecha_resolucion = now(),
    observacion_resolucion = 'Cancelada automáticamente por el cierre del club'
FROM clubes c
WHERE c.id = s.club_id
  AND c.estado = 'CERRADO'
  AND s.estado IN ('PENDIENTE', 'EN_REVISION');

UPDATE solicitudes_retiro r
SET estado = 'CANCELADA',
    resuelto_por = (SELECT id FROM usuarios WHERE username = 'admin'),
    fecha_resolucion = now(),
    observacion_resolucion = 'Cancelada automáticamente por el cierre del club'
FROM inscripciones i
JOIN clubes c ON c.id = i.club_id
WHERE i.id = r.inscripcion_id
  AND c.estado = 'CERRADO'
  AND r.estado = 'PENDIENTE';

UPDATE inscripciones i
SET estado = 'FINALIZADA',
    fecha_retiro = fn_fecha_salida_club(i.fecha_ingreso, i.periodo_id)
FROM clubes c
WHERE c.id = i.club_id
  AND c.estado = 'CERRADO'
  AND i.estado = 'ACTIVA';

CREATE OR REPLACE VIEW vw_historial_estudiante AS
SELECT ('IC-' || i.id)::varchar(30) AS id,
       i.estudiante_id,
       i.institucion_id,
       i.club_id,
       NULL::bigint AS registrado_por,
       i.fecha_ingreso AS fecha,
       1 AS orden,
       'INGRESO_CLUB'::varchar(30) AS tipo,
       i.id AS referencia_id,
       format('Ingresó al club «%s» en el período %s', c.nombre, p.nombre) AS descripcion
FROM inscripciones i
JOIN clubes c ON c.id = i.club_id
JOIN periodos_academicos p ON p.id = i.periodo_id
UNION ALL
SELECT ('SC-' || i.id)::varchar(30),
       i.estudiante_id,
       i.institucion_id,
       i.club_id,
       NULL::bigint,
       i.fecha_retiro,
       6,
       'SALIDA_CLUB'::varchar(30),
       i.id,
       CASE i.estado
           WHEN 'RETIRADA' THEN format('Se retiró del club «%s»', c.nombre)
           WHEN 'FINALIZADA' THEN format('Completó su participación en el club «%s» al cierre del club', c.nombre)
           ELSE format('Salió del club «%s» por traslado', c.nombre)
       END
FROM inscripciones i
JOIN clubes c ON c.id = i.club_id
WHERE i.fecha_retiro IS NOT NULL
UNION ALL
SELECT ('ICU-' || ic.id)::varchar(30),
       ic.estudiante_id,
       cu.institucion_id,
       ic.club_id,
       NULL::bigint,
       ic.fecha_ingreso,
       2,
       'INGRESO_CURSO'::varchar(30),
       ic.id,
       format('Se inscribió en el curso «%s», nivel %s', cu.nombre, lower(cu.nivel))
FROM inscripciones_curso ic
JOIN cursos cu ON cu.id = ic.curso_id
UNION ALL
SELECT ('FCU-' || ic.id)::varchar(30),
       ic.estudiante_id,
       cu.institucion_id,
       ic.club_id,
       NULL::bigint,
       ic.fecha_fin,
       3,
       (CASE ic.estado WHEN 'RETIRADA' THEN 'RETIRO_CURSO' ELSE 'FIN_CURSO' END)::varchar(30),
       ic.id,
       CASE
           WHEN ic.estado = 'RETIRADA' THEN format('Se retiró del curso «%s»', cu.nombre)
           WHEN ic.resultado = 'APROBADO' THEN format('Aprobó el curso «%s»', cu.nombre)
           WHEN ic.resultado = 'NO_APROBADO' THEN format('Terminó el curso «%s» sin aprobarlo', cu.nombre)
           ELSE format('Terminó el curso «%s»; el resultado está pendiente', cu.nombre)
       END
FROM inscripciones_curso ic
JOIN cursos cu ON cu.id = ic.curso_id
WHERE ic.fecha_fin IS NOT NULL
UNION ALL
SELECT ('PC-' || pc.id)::varchar(30),
       pc.estudiante_id,
       pc.institucion_id,
       pc.club_id,
       pc.registrado_por,
       coalesce(ed.fecha_inicio, (pc.created_at AT TIME ZONE 'America/Guayaquil')::date),
       4,
       'COMPETENCIA'::varchar(30),
       pc.id,
       CASE
           WHEN ed.fecha_inicio IS NULL OR ed.fecha_inicio > (now() AT TIME ZONE 'America/Guayaquil')::date
               THEN format('Inscripción para competir en «%s» · %s', ed.nombre, cat.nombre)
           ELSE format('Compitió en «%s» · %s', ed.nombre, cat.nombre)
                || coalesce(', puesto ' || pc.puesto, '')
                || coalesce(', reconocimiento «' || pc.reconocimiento || '»', '')
       END
FROM participaciones_competencia pc
JOIN ediciones_competencia ed ON ed.id = pc.edicion_id
JOIN categorias_competencia cat ON cat.id = pc.categoria_id
UNION ALL
SELECT ('CE-' || ce.id)::varchar(30),
       ce.estudiante_id,
       ce.institucion_id,
       ce.club_id,
       NULL::bigint,
       ce.fecha_emision,
       5,
       'CERTIFICADO_EMITIDO'::varchar(30),
       ce.id,
       format('Recibió el certificado %s: %s', ce.codigo_verificacion, ce.titulo)
FROM certificados ce
UNION ALL
SELECT ('CA-' || ce.id)::varchar(30),
       ce.estudiante_id,
       ce.institucion_id,
       ce.club_id,
       NULL::bigint,
       (ce.fecha_anulacion AT TIME ZONE 'America/Guayaquil')::date,
       7,
       'CERTIFICADO_ANULADO'::varchar(30),
       ce.id,
       format('Se anuló el certificado %s', ce.codigo_verificacion)
FROM certificados ce
WHERE ce.estado = 'ANULADO';

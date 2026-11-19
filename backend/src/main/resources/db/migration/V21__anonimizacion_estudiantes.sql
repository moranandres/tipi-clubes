ALTER TABLE estudiantes
    ADD COLUMN anonimizado          BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN fecha_anonimizacion  TIMESTAMPTZ,
    ADD COLUMN motivo_anonimizacion VARCHAR(300),
    ADD COLUMN anonimizado_por      BIGINT REFERENCES usuarios (id);

ALTER TABLE estudiantes DROP CONSTRAINT ck_estudiantes_nombres;

ALTER TABLE estudiantes
    ADD CONSTRAINT ck_estudiantes_nombres CHECK (
        anonimizado OR (btrim(nombres) <> '' AND btrim(apellidos) <> '')
    ),
    ADD CONSTRAINT ck_estudiantes_anonimizacion CHECK (
        (NOT anonimizado
            AND fecha_anonimizacion IS NULL AND motivo_anonimizacion IS NULL AND anonimizado_por IS NULL)
        OR (anonimizado
            AND nombres = 'Estudiante anonimizado' AND apellidos = ''
            AND estado <> 'ACTIVO'
            AND fecha_anonimizacion IS NOT NULL AND anonimizado_por IS NOT NULL
            AND char_length(btrim(motivo_anonimizacion)) BETWEEN 10 AND 300)
    );

ALTER TABLE autorizaciones_estudiante ADD COLUMN anonimizada_en TIMESTAMPTZ;

ALTER TABLE autorizaciones_estudiante DROP CONSTRAINT ck_autorizacion_otorgada_documento;

ALTER TABLE autorizaciones_estudiante
    ADD CONSTRAINT ck_autorizacion_otorgada_documento CHECK (
        estado <> 'OTORGADA' OR documento_ruta IS NOT NULL OR anonimizada_en IS NOT NULL
    ),
    ADD CONSTRAINT ck_autorizacion_anonimizada CHECK (
        anonimizada_en IS NULL
        OR num_nulls(documento_ruta, documento_nombre, documento_subido_por, observacion,
                     representante_nombres, representante_apellidos, representante_cedula,
                     representante_parentesco, representante_telefono, representante_correo) = 10
    );

ALTER TABLE certificados ADD COLUMN archivo_eliminado_en TIMESTAMPTZ;

CREATE FUNCTION fn_proteger_estudiante_anonimizado() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.anonimizado THEN
            RAISE EXCEPTION 'El estudiante % fue anonimizado y su registro forma parte del historial; no se elimina',
                OLD.codigo_interno
                USING ERRCODE = '23TP1';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.anonimizado THEN
        RAISE EXCEPTION 'El estudiante % fue anonimizado; su registro ya no se modifica', OLD.codigo_interno
            USING ERRCODE = '23TP1';
    END IF;

    IF NEW.anonimizado THEN
        IF (NEW.codigo_interno, NEW.institucion_id, NEW.curso, NEW.estado, NEW.created_at)
           IS DISTINCT FROM
           (OLD.codigo_interno, OLD.institucion_id, OLD.curso, OLD.estado, OLD.created_at) THEN
            RAISE EXCEPTION 'La anonimización del estudiante % solo reemplaza sus datos personales', OLD.codigo_interno
                USING ERRCODE = '23TP1';
        END IF;
        IF EXISTS (SELECT 1 FROM inscripciones WHERE estudiante_id = OLD.id AND estado = 'ACTIVA') THEN
            RAISE EXCEPTION 'El estudiante % tiene inscripciones activas en clubes; tramite su retiro antes de anonimizarlo',
                OLD.codigo_interno
                USING ERRCODE = '23TP1';
        END IF;
        IF EXISTS (SELECT 1 FROM solicitudes_inscripcion
                   WHERE estudiante_id = OLD.id AND estado IN ('PENDIENTE', 'EN_REVISION')) THEN
            RAISE EXCEPTION 'El estudiante % tiene solicitudes de inscripción abiertas; resuélvalas antes de anonimizarlo',
                OLD.codigo_interno
                USING ERRCODE = '23TP1';
        END IF;
        IF EXISTS (SELECT 1 FROM autorizaciones_estudiante
                   WHERE estudiante_id = OLD.id AND anonimizada_en IS NULL) THEN
            RAISE EXCEPTION 'Las autorizaciones del estudiante % deben depurarse antes de anonimizarlo', OLD.codigo_interno
                USING ERRCODE = '23TP1';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estudiantes_anonimizacion
    BEFORE UPDATE OR DELETE ON estudiantes
    FOR EACH ROW EXECUTE FUNCTION fn_proteger_estudiante_anonimizado();

CREATE FUNCTION fn_proteger_autorizacion_anonimizada() RETURNS trigger AS $$
BEGIN
    IF OLD.anonimizada_en IS NOT NULL THEN
        RAISE EXCEPTION 'La autorización se depuró al anonimizar al estudiante y ya no se modifica'
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.anonimizada_en IS NOT NULL
       AND (NEW.estudiante_id, NEW.tipo, NEW.estado, NEW.fecha_registro, NEW.revocado_en, NEW.registrado_por)
           IS DISTINCT FROM
           (OLD.estudiante_id, OLD.tipo, OLD.estado, OLD.fecha_registro, OLD.revocado_en, OLD.registrado_por) THEN
        RAISE EXCEPTION 'La depuración de una autorización solo retira los datos personales y el documento'
            USING ERRCODE = '23TP1';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_autorizaciones_anonimizadas
    BEFORE UPDATE OR DELETE ON autorizaciones_estudiante
    FOR EACH ROW EXECUTE FUNCTION fn_proteger_autorizacion_anonimizada();

CREATE FUNCTION fn_rechazar_registro_de_anonimizado() RETURNS trigger AS $$
DECLARE
    v_codigo VARCHAR(20);
BEGIN
    IF NEW.estudiante_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT codigo_interno INTO v_codigo FROM estudiantes WHERE id = NEW.estudiante_id AND anonimizado;
    IF FOUND THEN
        RAISE EXCEPTION 'El estudiante % fue anonimizado y no admite registros nuevos', v_codigo
            USING ERRCODE = '23TP1';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON autorizaciones_estudiante
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON inscripciones
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON inscripciones_curso
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON solicitudes_inscripcion
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON participaciones_competencia
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON certificados
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON asistencias
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON evidencia_estudiantes
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON avances
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();
CREATE TRIGGER trg_anonimizado_sin_registros BEFORE INSERT ON proyecto_integrantes
    FOR EACH ROW EXECUTE FUNCTION fn_rechazar_registro_de_anonimizado();

CREATE OR REPLACE FUNCTION fn_validar_certificado() RETURNS trigger AS $$
DECLARE
    v_hoy              DATE := (now() AT TIME ZONE 'America/Guayaquil')::date;
    v_estado_curso_ins VARCHAR(15);
    v_resultado        VARCHAR(15);
    v_club             BIGINT;
    v_institucion      BIGINT;
    v_nombre           VARCHAR(150);
    v_inicio_edicion   DATE;
    v_puesto           SMALLINT;
    v_reconocimiento   VARCHAR(100);
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Los certificados forman parte del historial y no se eliminan; anúlelo en su lugar'
            USING ERRCODE = '23TP1';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.archivo_eliminado_en IS DISTINCT FROM OLD.archivo_eliminado_en THEN
            IF OLD.archivo_eliminado_en IS NOT NULL THEN
                RAISE EXCEPTION 'El PDF del certificado % ya se eliminó y no se restituye', OLD.codigo_verificacion
                    USING ERRCODE = '23TP1';
            END IF;
            IF (NEW.codigo_verificacion, NEW.estudiante_id, NEW.institucion_id, NEW.club_id, NEW.tipo,
                NEW.inscripcion_curso_id, NEW.participacion_id, NEW.titulo, NEW.fecha_emision, NEW.emitido_por,
                NEW.archivo_ruta, NEW.archivo_hash, NEW.archivo_tamano, NEW.created_at,
                NEW.estado, NEW.anulado_por, NEW.fecha_anulacion, NEW.motivo_anulacion)
               IS DISTINCT FROM
               (OLD.codigo_verificacion, OLD.estudiante_id, OLD.institucion_id, OLD.club_id, OLD.tipo,
                OLD.inscripcion_curso_id, OLD.participacion_id, OLD.titulo, OLD.fecha_emision, OLD.emitido_por,
                OLD.archivo_ruta, OLD.archivo_hash, OLD.archivo_tamano, OLD.created_at,
                OLD.estado, OLD.anulado_por, OLD.fecha_anulacion, OLD.motivo_anulacion) THEN
                RAISE EXCEPTION 'La eliminación del PDF del certificado % no se combina con otros cambios',
                    OLD.codigo_verificacion
                    USING ERRCODE = '23TP1';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM estudiantes WHERE id = OLD.estudiante_id AND anonimizado) THEN
                RAISE EXCEPTION 'El PDF del certificado % solo se elimina al anonimizar al estudiante',
                    OLD.codigo_verificacion
                    USING ERRCODE = '23TP1';
            END IF;
            RETURN NEW;
        END IF;
        IF OLD.estado = 'ANULADO' THEN
            RAISE EXCEPTION 'El certificado % ya está anulado y no se puede modificar', OLD.codigo_verificacion
                USING ERRCODE = '23TP1';
        END IF;
        IF (NEW.codigo_verificacion, NEW.estudiante_id, NEW.institucion_id, NEW.club_id, NEW.tipo,
            NEW.inscripcion_curso_id, NEW.participacion_id, NEW.titulo, NEW.fecha_emision, NEW.emitido_por,
            NEW.archivo_ruta, NEW.archivo_hash, NEW.archivo_tamano, NEW.created_at)
           IS DISTINCT FROM
           (OLD.codigo_verificacion, OLD.estudiante_id, OLD.institucion_id, OLD.club_id, OLD.tipo,
            OLD.inscripcion_curso_id, OLD.participacion_id, OLD.titulo, OLD.fecha_emision, OLD.emitido_por,
            OLD.archivo_ruta, OLD.archivo_hash, OLD.archivo_tamano, OLD.created_at) THEN
            RAISE EXCEPTION 'El contenido de un certificado emitido no se modifica; anúlelo y emita uno nuevo'
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.estado = 'ANULADO' THEN
            PERFORM fn_verificar_emisor_certificado(NEW.anulado_por, NEW.institucion_id, 'anular');
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.archivo_eliminado_en IS NOT NULL THEN
        RAISE EXCEPTION 'Un certificado nuevo se registra con su PDF disponible'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.estado <> 'EMITIDO' THEN
        RAISE EXCEPTION 'Todo certificado se registra en estado EMITIDO'
            USING ERRCODE = '23TP1';
    END IF;
    IF NEW.fecha_emision <> v_hoy THEN
        RAISE EXCEPTION 'La fecha de emisión de un certificado debe ser la fecha actual (%)', to_char(v_hoy, 'DD/MM/YYYY')
            USING ERRCODE = '23TP1';
    END IF;

    PERFORM fn_verificar_emisor_certificado(NEW.emitido_por, NEW.institucion_id, 'emitir');

    IF NEW.tipo IN ('PARTICIPACION_CURSO', 'APROBACION_CURSO') THEN
        SELECT ic.estado, ic.resultado, ic.club_id, c.institucion_id, c.nombre
        INTO v_estado_curso_ins, v_resultado, v_club, v_institucion, v_nombre
        FROM inscripciones_curso ic
        JOIN cursos c ON c.id = ic.curso_id
        WHERE ic.id = NEW.inscripcion_curso_id;
        IF (v_club, v_institucion) IS DISTINCT FROM (NEW.club_id, NEW.institucion_id) THEN
            RAISE EXCEPTION 'El club y la institución del certificado deben ser los del curso certificado'
                USING ERRCODE = '23TP1';
        END IF;
        IF v_estado_curso_ins <> 'FINALIZADA' THEN
            RAISE EXCEPTION 'Solo se certifican cursos finalizados; la inscripción del estudiante en el curso «%» está en estado %',
                v_nombre, v_estado_curso_ins
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.tipo = 'APROBACION_CURSO' AND v_resultado IS DISTINCT FROM 'APROBADO' THEN
            RAISE EXCEPTION 'El certificado de aprobación exige que el estudiante haya aprobado el curso «%»', v_nombre
                USING ERRCODE = '23TP1';
        END IF;
    ELSE
        SELECT p.club_id, p.institucion_id, p.puesto, p.reconocimiento, e.fecha_inicio, e.nombre
        INTO v_club, v_institucion, v_puesto, v_reconocimiento, v_inicio_edicion, v_nombre
        FROM participaciones_competencia p
        JOIN ediciones_competencia e ON e.id = p.edicion_id
        WHERE p.id = NEW.participacion_id;
        IF (v_club, v_institucion) IS DISTINCT FROM (NEW.club_id, NEW.institucion_id) THEN
            RAISE EXCEPTION 'El club y la institución del certificado deben ser los de la participación certificada'
                USING ERRCODE = '23TP1';
        END IF;
        IF v_inicio_edicion IS NULL OR v_inicio_edicion > v_hoy THEN
            RAISE EXCEPTION 'Solo se certifica la participación en una edición que ya empezó; «%» %', v_nombre,
                CASE WHEN v_inicio_edicion IS NULL THEN 'no tiene fecha de inicio registrada'
                     ELSE 'empieza el ' || to_char(v_inicio_edicion, 'DD/MM/YYYY') END
                USING ERRCODE = '23TP1';
        END IF;
        IF NEW.tipo = 'RECONOCIMIENTO_COMPETENCIA' AND v_puesto IS NULL AND v_reconocimiento IS NULL THEN
            RAISE EXCEPTION 'El certificado de reconocimiento exige que la participación tenga un puesto o un reconocimiento registrado'
                USING ERRCODE = '23TP1';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

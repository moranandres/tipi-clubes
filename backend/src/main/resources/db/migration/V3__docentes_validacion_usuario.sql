CREATE FUNCTION fn_validar_usuario_docente() RETURNS trigger AS $$
DECLARE
    v_codigo VARCHAR(30);
    v_institucion BIGINT;
BEGIN
    IF NEW.usuario_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT r.codigo, u.institucion_id INTO v_codigo, v_institucion
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = NEW.usuario_id;
    IF v_codigo IS DISTINCT FROM 'DOCENTE' OR v_institucion IS DISTINCT FROM NEW.institucion_id THEN
        RAISE EXCEPTION 'El usuario vinculado debe tener rol DOCENTE y pertenecer a la misma institución del docente'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_docentes_usuario_valido
    BEFORE INSERT OR UPDATE OF usuario_id, institucion_id ON docentes
    FOR EACH ROW EXECUTE FUNCTION fn_validar_usuario_docente();

CREATE INDEX ix_clubes_periodo ON clubes (periodo_id);
CREATE INDEX ix_clubes_estado ON clubes (estado);
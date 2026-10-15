-- V2: contraseña temporal, regla rol-institución y auditoría inmutable
ALTER TABLE usuarios ADD COLUMN debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Regla: RESP_INSTITUCIONAL y DOCENTE requieren institución; los roles globales no la tienen
CREATE FUNCTION fn_validar_institucion_usuario() RETURNS trigger AS $$
DECLARE
    v_codigo VARCHAR(30);
BEGIN
    SELECT codigo INTO v_codigo FROM roles WHERE id = NEW.rol_id;
    IF v_codigo IN ('RESP_INSTITUCIONAL', 'DOCENTE') AND NEW.institucion_id IS NULL THEN
        RAISE EXCEPTION 'El rol % requiere una institución asignada', v_codigo
            USING ERRCODE = 'check_violation';
    END IF;
    IF v_codigo IN ('ADMIN', 'COORDINADOR', 'CONSULTA') AND NEW.institucion_id IS NOT NULL THEN
        RAISE EXCEPTION 'El rol % no debe tener institución asignada', v_codigo
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_rol_institucion
    BEFORE INSERT OR UPDATE OF rol_id, institucion_id ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_validar_institucion_usuario();

-- La auditoría es de solo inserción
CREATE FUNCTION fn_auditoria_solo_insercion() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'La tabla de auditoría es de solo inserción';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_solo_insercion
    BEFORE UPDATE OR DELETE ON auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_solo_insercion();

CREATE INDEX ix_auditoria_entidad ON auditoria (entidad, entidad_id);
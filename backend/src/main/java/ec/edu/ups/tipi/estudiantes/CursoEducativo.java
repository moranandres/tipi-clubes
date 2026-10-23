package ec.edu.ups.tipi.estudiantes;

public enum CursoEducativo {
    INICIAL_1("Inicial 1", "Educación Inicial"),
    INICIAL_2("Inicial 2", "Educación Inicial"),
    EGB_1("1.º EGB", "Preparatoria"),
    EGB_2("2.º EGB", "Básica Elemental"),
    EGB_3("3.º EGB", "Básica Elemental"),
    EGB_4("4.º EGB", "Básica Elemental"),
    EGB_5("5.º EGB", "Básica Media"),
    EGB_6("6.º EGB", "Básica Media"),
    EGB_7("7.º EGB", "Básica Media"),
    EGB_8("8.º EGB", "Básica Superior"),
    EGB_9("9.º EGB", "Básica Superior"),
    EGB_10("10.º EGB", "Básica Superior"),
    BGU_1("1.º BGU", "Bachillerato General Unificado"),
    BGU_2("2.º BGU", "Bachillerato General Unificado"),
    BGU_3("3.º BGU", "Bachillerato General Unificado");

    private final String etiqueta;
    private final String nivel;

    CursoEducativo(String etiqueta, String nivel) {
        this.etiqueta = etiqueta;
        this.nivel = nivel;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    public String getNivel() {
        return nivel;
    }
}
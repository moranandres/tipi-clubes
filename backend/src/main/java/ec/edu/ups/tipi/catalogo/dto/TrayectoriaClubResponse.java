package ec.edu.ups.tipi.catalogo.dto;

import ec.edu.ups.tipi.catalogo.CatalogoClub;

public record TrayectoriaClubResponse(long integrantesHistoricos, long retiros, long cursosTotal,
                                      long participacionesCompetencia, long certificadosVigentes) {

    public static TrayectoriaClubResponse de(CatalogoClub c) {
        return new TrayectoriaClubResponse(c.getIntegrantesHistoricos(), c.getRetiros(), c.getCursosTotal(),
                c.getParticipaciones(), c.getCertificadosVigentes());
    }
}

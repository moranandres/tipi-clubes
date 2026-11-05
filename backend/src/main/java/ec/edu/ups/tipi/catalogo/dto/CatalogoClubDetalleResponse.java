package ec.edu.ups.tipi.catalogo.dto;

import java.util.List;

public record CatalogoClubDetalleResponse(CatalogoClubResponse club, TrayectoriaClubResponse trayectoria,
                                          List<CatalogoCursoResponse> cursos) {
}

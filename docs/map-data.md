# Dados de mapa (Milestone 2)

Arquivo ativo nesta versão:
- `public/assets/maps/world-countries-v0.geojson`

Status atual:
- É um **placeholder técnico** para validar integração do MapLibre + camada de dono (`owner`).
- Possui 8 features mapeadas para os `regionId` da campanha inicial.

Origem/licença para produção:
1. Natural Earth (Admin 0 Countries) - domínio público.
2. Conversão para GeoJSON simplificado (TopoJSON opcional) para mobile.
3. Mapeamento 1:1 entre feature e `regionId` estável.

Pipeline recomendado (próxima etapa):
1. Baixar shapefile Admin 0 Countries do Natural Earth.
2. Converter para GeoJSON.
3. Simplificar geometria (2 níveis: desktop/mobile).
4. Gerar `world-countries-v1.geojson` com propriedades:
   - `regionId`
   - `iso_a3`
   - `name`
5. Validar integridade: todo `regionId` do estado deve existir no GeoJSON.

Observação:
- Este projeto roda em hospedagem estática; por isso os assets devem permanecer em `public/assets/maps`.

# Projektový formát — plán

Model RasterDocument je připravený pro JSON, ale ukládání/otevírání projektů se implementuje až ve fázi 6. Object URL a textury nejsou přenositelné a nesmějí být v dokumentu.

Obálka projektu bude obsahovat `format: "rasterlab"`, `version: 1`, dokument a manifest assetů. Asset manifest mapuje UUID na relativní soubor v `assets/` a jeho metadata. ProjectDeserializer nejprve ověří verzi, rozměry, reference a typy, potom provede migration, pokud existuje, a znovu načte assety do AssetManageru. Neznámá budoucí verze se odmítne s čitelnou chybou.

První formát bude `project.json` a `assets/`, nikoliv ZIP. Export bude samostatně renderovat plné dokumentové rozlišení a nezávisí na viewportu.

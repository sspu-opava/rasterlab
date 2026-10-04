# RasterLab 1.0.0

Vydání pro Windows x64, 4. 10. 2026. Jde o místní distribuci na žádost uživatele; žádné soubory nebyly publikovány na externí server. Licence projektu zůstává `UNLICENSED`, práva k veřejnému šíření se tímto vydáním neudělují.

## Obsah

- 53 nedestruktivních efektů, osm generátorů, skupiny a masky, presety a undo/redo.
- Model projektu v3 s migrací v1/v2, přenosný `.rlab`, poslední projekty a zotavovací kopie.
- Opravy z [revize před 1.0](revize-pred-1.0.md), popsané ve [stabilizaci 0.11](stabilizace-0.11.md).
- Stav ukládání se ukončí také při zrušení dialogu nebo chybě zápisu; dokument zůstane rozpracovaný.
- Instalátor a samostatné EXE, [návod](navod.md), SHA-256, inventář závislostí a strojový testovací protokol.

## Podporované meze

Windows x64 s Microsoft WebView2 Runtime a funkčním WebGL. Dokumenty/bitmapy 1–8192 px v ose, omezené také skutečným MAX_TEXTURE_SIZE a odhadem renderovacích textur 512 MiB. Bitmapa nejvýše 100 MiB, knihovna 100 obrázků, 300 MiB původních souborů a 256 MiB dekódovaných pixelů. Desktopový projekt, archiv a export mají limit přenosu 32 MiB. Náročné stacky lze odmítnout i při menších rozměrech; dokument lze uložit.

Archiv `.rlab` používá ZIP/STORE bez komprese. Export zachovává rozlišení celého dokumentu a nezávisí na viewportu. Synchronní výpočet GPU/readback není přerušitelný. Rozpuštění skupiny je omezené na neutrální skupiny, kde se výsledek zachová.

## Rozsah kontroly

Finální sestavení prošlo typovou kontrolou bez chyb a varování, 70 testy ve 22 souborech, šesti Rust testy, format/clippy a všemi 14 browser regresními sadami. Samostatně prošla zátěžová kontrola níže. EXE i NSIS mají systémovou verzi 1.0.0.

Na hostiteli Windows 10 Education 19042 s NVIDIA GeForce GT 640 (ovladač 30.0.14.7514) bylo přes dovednost computer-use ověřeno spuštění nového EXE, rozhraní 1.0.0 s připraveným WebGL, otevření nativního open/save dialogu, zrušení obou dialogů, zpráva „Uložení zrušeno“, odblokování operací a čisté zavření testovacího okna. Starší uživatelské okno nebylo změněno.

Nativní snímání vracelo `FrameArrived timed out`; klikání `coordinate input geometry is unavailable` a nastavení pole dialogu `element ... is not available in cached app state`. Proto nebylo možné ověřit skutečný zápis/načtení/export přes nativní dialogy. Pokus o spuštění instalátoru skončil `Computer Use app approval timed out`; instalace neproběhla. Tyto výsledky nejsou označené jako PASS. Filesystem zápis a chybové větve backendu ověřují Rust testy, frontendové workflow browser testy.

Dodatečný zátěžový test provedl 100 cyklů import/delete/undo/new. Zkontroloval uchování zdroje pro undo, zničení 100 textur a konečný nulový počet assetů a objektových URL. Výsledek je v `test-results/release/soak.json`; nejde o měření rezidentní paměti fyzické GPU.

Finální automatický protokol je distribuován jako `validation-1.0.0.json`; jednotlivé reprodukce jsou v `test-results/review/` a `test-results/release/`. Kontrola zahrnuje TypeScript, Vitest, Rust testy, format/clippy, všech 14 browser sad a nativní sestavení. Browser testy používají CSP desktopové aplikace a kontrolují exportované pixely, migrace, historii, souběh, zotavení a WebGL loss/restore.

Kontrola hostitelského Windows nenahrazuje test čistého systému ani matici Intel/AMD/NVIDIA. Nelze tvrdit, že byla otestována instalace bez předinstalovaného WebView2, upgrade, odinstalace, všechny ovladače či fyzické DPI. Tyto položky mají [samostatný protokol](release-native-protocol.md) a zůstávají evidované jako neprovedené, dokud nebude přiložen výsledek konkrétního testera. Označení 1.0.0 nezmění neprovedenou kontrolu na úspěšnou.

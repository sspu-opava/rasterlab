# Experimenty a zotavení v RasterLabu 0.7

## Hledání a oblíbené efekty

V záložce Effects je pole Hledat efekty. Filtruje registry podle názvu, kategorie i popisu bez ohledu na velikost písmen. Hvězdička vedle výběru přidá nebo odebere vybraný efekt z oblíbených. Hvězdička u hledání přepíná zobrazení pouze oblíbených. Při prázdném výsledku je přidání efektu nedostupné. Oblíbené jsou místní nastavení uživatele, nezapisují se do projektu a nemění historii dokumentu.

## Kopírování a duplikace

Duplikovat efekt vloží nezávislou instanci hned za vybraný efekt. Parametry, seed, vstupy a enabled stav se zachovají; instance dostane nové UUID. Úprava kopie nemění originál a duplikaci vrátí jediný undo.

Kopírovat stack uloží celý stack do interní schránky aplikace. Vyberte cílovou vrstvu a použijte Vložit stack. Dialog nabízí přidání na konec nebo nahrazení celého stacku. Vstupní vrstvy se přiřadí podle pojmenovaných zdrojů; UUID z původní vrstvy se nepřenáší. Pokud více efektů používalo stejný zdroj, dialog jej vyžádá pouze jednou. Schránka zůstává při přepínání vrstev, ale ne po restartu aplikace.

Pořadí efektů a seedy se zachovají, každá vložená instance dostane nové UUID. Cyklická reference, zamčený cíl nebo překročení 32 efektů operaci odmítnou před změnou dokumentu. Kontrola cyklů zahrnuje i reference vypnutých efektů, stejně jako projektový deserializer. Nahrazení nebo přidání celého stacku má jediný krok undo/redo.

## Presety

Uložit stack otevře pojmenování presetu celého stacku. Tlačítko s ikonou uložení v sekci vybraného efektu uloží jen tento efekt. Názvy mají nejvýše 80 znaků. Preset obsahuje verze definic, pořadí, parametry, enabled stav a role vstupů; originální bitmapy neobsahuje.

Levá záložka Presets nabízí hledání, použití, export a odstranění vlastních presetů a import ze souboru. Knihovna má nejvýše 100 vlastních položek. Deset ukázkových postupů je dodaných s aplikací a nelze je z knihovny odstranit. Importovaná položka získá nové ID, takže nepřepisuje existující preset. Duplicitní názvy jsou dovolené. Uložení a odstranění položky knihovny nemění dokumentovou historii.

Soubor `.preset.json` má vlastní formát `rasterlab-preset`, verzi 1 a limit 1 MB. Nejde o projektový JSON. Číselné a jiné známé parametry se validují podle definice efektu. Neznámé moduly zůstanou zachované s varováním; chybějící aktivní efekt způsobí běžnou diagnostiku v náhledu a zabrání exportu. Rozdíl verze definice je upozornění pro uživatele. Knihovna je v localStorage daného WebView/prohlížeče; pro přenos nebo zálohu použijte export.

Desktopový export používá nativní dialog a atomický Rust zápis; zrušení dialogu nic nezapíše. Browser soubor stáhne obvyklým způsobem. Import přes výběr souboru funguje v obou prostředích.

## Automatická zotavovací kopie

Po 15 sekundách bez změny neuloženého dokumentu vznikne kopie v IndexedDB. Manifest a původní Bloby obrázků se zapisují společně v jedné transakci; neúspěšný zápis zachová předchozí platnou kopii. Během importu, uložení, otevření a exportu se nová kopie nevytváří. Stav kopie se zobrazuje dole v aplikaci. Zápis do kopie nezruší hvězdičku neuložených změn ani neoznačí dokument jako ručně uložený.

Při dalším startu aplikace nabídne Obnovit projekt nebo Zahodit kopii. Dokud uživatel nerozhodne, kopie se nepřepisuje prázdným startovním dokumentem. Obnovení provede stejné validační a dekódovací kontroly jako otevření projektu. Selhání ponechá současný dokument i kopii. Pokud už je současný dokument rozpracovaný, obnova vyžádá potvrzení nahrazení.

Obnovený dokument nemá obnovenou historii kroků a zůstává dirty až do ručního uložení. Při desktopové obnově si pamatuje původní cestu projektu. Úspěšné Ctrl+S odstraní již nepotřebnou kopii před dokončením operace. Explicitní zahazování neuložené práce při nativním zavření odstraní i kopii. Browserové zavření/reload může nabídnout standardní potvrzení prohlížeče; kopie zůstane k obnově.

Úložiště drží jednu poslední kopii pro daný origin/profil, není archivem verzí ani zálohou více souběžných oken. Mezi spuštěním v prohlížeči a Tauri se nesdílí. Při nedostupném úložišti nebo nedostatku místa se zobrazí stavová chyba; běžné ruční ukládání zůstává dostupné. Kopie má stejné limity bitmap a projektu jako deserializer. Ztrátu posledních úprav před uplynutím 15 sekund nelze vyloučit; důležité výsledky nadále ukládejte ručně.

## Ověření

`npm run test:workflow` používá produkční frontend s CSP Tauri. Ověřuje hledání, persistentní oblíbené, nezávislou duplikaci, presety jednotlivých efektů i stacků, import/export a trvalost knihovny, nové přiřazení vstupů, odmítnutí cyklu a limitu bez částečného zápisu, undo/redo a shodné GPU pixely při použití presetu a obnově projektu. Zotavení používá skutečný IndexedDB zápis původních Blobů a reload stránky. Unit testy doplňují validaci formátu, neznámé moduly, limity, závislosti skupin a dirty stav obnoveného dokumentu.

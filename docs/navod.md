# RasterLab 1.0 — stručný návod

RasterLab je nedestruktivní rastrový editor pro Windows x64. Obsahuje 53 efektů, osm procedurálních generátorů, masky, skupiny a presety. Originální obrázek zůstává zachovaný; projekt ukládá vrstvy a parametry, export ukládá výsledný obraz.

## Instalace a první projekt

Spusťte `RasterLab-1.0.0-setup.exe`. Aplikace vyžaduje Microsoft WebView2 Runtime; instalátor může při jeho doplnění potřebovat internet. Node.js, Rust ani Visual Studio nejsou pro použití potřeba. Samostatné `RasterLab-1.0.0.exe` lze spustit bez instalace, WebView2 je potřeba i zde.

Přes **Importovat obrázky** nebo přetažení na plátno vložte PNG, JPEG či WebP. Každý obrázek má vlastní vrstvu. Vlevo lze místo obrázku vložit také generátor. Vyberte vrstvu v pravém seznamu, přepněte na **Efekty** a přidejte efekt. Pořadí efektů mění výsledek. Přepínač efekt dočasně vypne; parametry a seed lze vracet historií.

**Dokument…** mění název, rozměry a barvu/alfa pozadí. Změna rozměrů nepřepočítává pozice vrstev ani parametry udávané v pixelech. Ctrl/Shift při výběru vrstev umožňuje vybrat více sousedních vrstev a seskupit je. Rozpuštění skupiny je dostupné pouze tehdy, když lze zachovat výsledek bez změny transformací či efektů.

## Pohyb po plátně

- **V** vybere nástroj přesunu aktivní vrstvy; vrstvu vyberte v seznamu.
- **H**, podržený mezerník nebo prostřední tlačítko posouvají pohled.
- Kolečko přibližuje k ukazateli; Shift+kolečko nebo převážně vodorovný touchpad posouvá pohled.
- **F** přizpůsobí dokument pracovní ploše, **1** zobrazí skutečnou velikost.
- **Dosah** ponechá alespoň část dokumentu na pracovní ploše.

Posun pohledu a zoom nemění uložený dokument ani exportované pixely.

## Uložení, export a obnova

**Ctrl+S** uloží projekt, **Ctrl+Shift+S** uloží pod jiným názvem. Uložení dokončí právě upravované pole. Neplatnou hodnotu nejprve opravte. JSON projekt může odkazovat na bitmapy ve složce `assets` vedle souboru; při přesunu přeneste i tuto složku.

**Uložit .rlab** vytvoří jediný přenosný archiv včetně původních obrázků. Pro zálohy a přenos mezi počítači použijte tento formát. Otevřít lze `.rlab` i JSON a starší modely v1/v2 se automaticky migrují. Archiv používaný RasterLabem je nekomprimovaný ZIP/STORE, aplikace nepřijímá libovolné cizí ZIP archivy.

**Ctrl+E** exportuje celý dokument do PNG, JPEG nebo WebP bez ohledu na zoom. PNG zachovává průhlednost; JPEG má bílé podložení. Export lze zrušit ve fázích označených jako zrušitelné. Samotný synchronní výpočet na GPU a čtení pixelů nelze přerušit.

**Ctrl+Z**, **Ctrl+Shift+Z** nebo **Ctrl+Y** vrací/opakuje změny. Při úpravě textového či číselného pole patří Ctrl+Z tomuto poli. Při novém projektu, otevření či zavření se neuložené změny řeší volbami **Uložit / Zahodit / Zrušit**.

Po nečinnosti aplikace ukládá zotavovací kopii. Po dalším spuštění nabídne **Obnovit projekt**. Kopie nenahrazuje ruční zálohu; běžné uložení odstraní aktuální zotavovací kopii. Dosud neotevřená starší kopie se při prostém zavření zachová. Pět posledních projektů je dostupných nad pracovní plochou.

## Meze a řešení potíží

Dokument a bitmapa mohou mít 1–8192 px v každé ose, přičemž platí také limit skutečné GPU a konzervativní rozpočet renderovacích textur 512 MiB. Jedna bitmapa má nejvýše 100 MiB; knihovna nejvýše 100 obrázků, 300 MiB zdrojových souborů a 256 MiB dekódovaných pixelů. Desktopový přenos projektu, archivu nebo exportu je omezen na 32 MiB. Menší rozměr či jednodušší stack sníží nároky.

Při ztrátě WebGL aplikace pozastaví renderer a čeká na obnovu kontextu. Pokud se neobnoví, uložte projekt a znovu spusťte aplikaci. U chybného vstupu efektu nebo masky zvolte dostupnou zdrojovou vrstvu; vazby nesmí vytvářet cyklus. **Vyčistit nepoužívané** ponechá i zdroje potřebné pro undo/redo.

Při hlášení chyby přiložte verzi aplikace, malý `.rlab` projekt, postup reprodukce, Windows a GPU/ovladač. Podrobný rozsah ověření a známá omezení jsou v [poznámkách k vydání](vydani-1.0.md).

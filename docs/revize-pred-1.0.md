# Revize RasterLabu před vydáním 1.0

Datum: 3. 10. 2026. Revidovaná verze: 0.10.0, Windows, produkční frontend s CSP desktopové aplikace.

**Doporučení: verzi 1.0 zatím nevydávat.** Výpočet efektů a základní projektový workflow jsou funkční, ale revize odhalila problémy s uložením rozpracovaných hodnot, souběhem importu, pan, klávesovým undo a obnovou WebGL. Nejde o nedostatek dalších efektů; další etapa má být stabilizace.

Níže je historický nález pro 0.10.0. Následné opravy jsou v [stabilizaci 0.11](stabilizace-0.11.md). A13 a skutečné hardwarové/DPI ověření zůstávají otevřené; ostatní body mají implementaci nebo výslovně vymezené bezpečné chování.

## Rozsah a síla důkazů

- **UI**: reprodukce přes skutečné ovládání produkční aplikace v Chromium.
- **Model**: diagnostika skutečných modulů přes vývojový server; ne mock implementace.
- **Kód**: doložené chování nebo mezera ve zdrojích, která nebyla testována v celém desktopovém scénáři.
- **Neověřeno**: oblast, kterou nelze považovat za hotovou bez dalšího ověření.

Browser používá ANGLE/Vulkan **SwiftShader**, tedy softwarový WebGL backend. Testy ověřují shaderovou funkčnost, nikoli výkon konkrétní fyzické GPU. Zátěžové výsledky níže jsou orientační pro tuto konfiguraci. Nebyl proveden test vyčerpání GPU paměti ani maximálního dokumentu 8192 × 8192.

Nativní UI automatizace je nedostupná: `Computer Use native pipe is unavailable`, os error 2. Nativní okno, dialogy, instalace a odinstalace proto touto revizí nebyly ověřeny. Rust filesystem testy toto ověření nenahrazují.

## Prioritizovaný seznam oprav

P0 = riziko ztráty nebo chybného uložení práce. P1 = nutné pro spolehlivou 1.0. P2 = doporučené doplnění, které lze při jasném vymezení rozsahu odložit.

| ID | Priorita | Nezbytná oprava / doplněk | Důkaz |
| --- | --- | --- | --- |
| A01 | P0 | Uložit právě editované pole před Ctrl+S a odchodem | UI, `SAVE-DRAFT` |
| A02 | P0 | Serializovat import, nový dokument a otevření projektu | UI + model, `IMPORT-RACE`, `BUSY-NEW` |
| A03 | P1 | Sjednotit stav trvalého/dočasného pan, fokus a kurzor | UI, `PAN-FOCUS`, `PAN-CURSOR` |
| A04 | P1 | Oddělit textové undo/redo od historie dokumentu | UI, `UNDO-TEXT` |
| A05 | P1 | Respektovat viditelnost předků při dragu dítěte | UI, `HIDDEN-DRAG` |
| A06 | P1 | Po obnově WebGL znovu vyhodnotit celý render graph | Experiment, `CONTEXT-RESTORE` |
| A07 | P1 | Opravit signatury a rozsah invalidace cache | Model, `CACHE-OPACITY` |
| A08 | P1 | Sjednotit validaci transformací při načtení a editaci | Model, `LOAD-SCALE` |
| A09 | P1 | Zavést životní cyklus a čištění assetů včetně historie | Model + kód, `NEW-ASSETS` |
| A10 | P1 | Rozpočet paměti, detekce GPU limitů a odezva náročných operací | Měření + kód |
| A11 | P1 | Dialog Uložit / Zahodit / Zrušit pro nový/open/close | Kód, část desktopu neověřena |
| A12 | P1 | Před načtením a uložením provádět společnou kontrolu velikosti | Kód |
| A13 | P1 | Dokončit nativní a instalační ověření kandidáta 1.0 | Neověřeno |
| A14 | P1 | Reprodukovatelná release kontrola a distribuční metadata | Kód / chybějící proces |

### A01 — Ctrl+S neuloží rozpracovanou hodnotu

**Reprodukce:** vybrat vrstvu, do názvu napsat `Must be saved`, nepoužít Tab ani Enter, stisknout Ctrl+S. JSON obsahoval předchozí `Draft name`. Záložka dokumentu přitom neobsahovala hvězdičku neuložených změn.

**Příčina:** vlastnosti vrstvy se zapisují až přes `onchange` v [LayersPanel.svelte](../src/components/layers/LayersPanel.svelte). Globální shortcut v [App.svelte](../src/App.svelte) rovnou spustí save. Speciální textové parametry efektů mají vlastní Ctrl+S commit; ostatní pole stejnou ochranu nemají. Výsledek je falešně úspěšné uložení.

**Oprava:** zavést společný mechanismus dokončení aktivní editace před save/open/new/export/close, nebo aktualizovat model průběžně s explicitním uzavřením historie. Validace nesmí připustit mezistav jako prázdné číslo. Po dokončení editace teprve pořídit snapshot.

**Akceptace:** automatické testy Ctrl+S u názvu vrstvy, pozice, scale, seedu a číselného parametru uloží zobrazenou hodnotu. Zrušený nebo neúspěšný save ponechá dirty stav. Odchod z rozpracovaného pole nesmí přijít o hodnotu.

### A02 — Pozdní import vstoupí do nového dokumentu

**Reprodukce:** zahájit import do dokumentu 64 × 64, během dekódování zvolit Nový dokument 32 × 32. Po dokončení se `slow-import` objevil v novém dokumentu. Dekódování bylo pro reprodukci řízeně zpomaleno o 2,5 s; ostatní cesta importu byla skutečná.

**Příčina:** [importFiles/newDocument](../src/lib/editor/state.ts) nemají společný zámek a import po `await` používá aktuální dokument. Toolbar a globální shortcut blokují hlavně `busy`, nikoli `importing`; přímé `newDocument` nehlídá ani jeden stav. Otevření projektu v browseru má obdobnou mezeru. Reprodukce open/import nebyla samostatně provedena.

**Oprava:** jeden koordinátor dokumentových operací a token identity/revize dokumentu pro asynchronní výsledky. Zvolit blokování nebo bezpečné zrušení pozdního výsledku; stejné pravidlo v UI i příkazech. Zohlednit import také při close a obnově.

**Akceptace:** opožděný import a souběžné new/open/recovery nikdy nezmění jiný dokument. Zrušení nepoškodí původní dokument ani asset manager. Zámky mají stejný význam pro tlačítka i zkratky.

### A03 — Pan: dvě potvrzené chyby

1. Kliknout na **Výběr**, podržet mezerník a táhnout. Fokus zůstane na tlačítku; dočasný pan se nezapne a místo pohledu se posune vrstva. Při 80 × 40 obrazovkových px se pozice vrstvy změnila z `(0, 0)` na přibližně `(13,69; 6,84)`.
2. Zapnout **Posun pohledu**, stisknout a uvolnit mezerník. Aktivní Pan zůstal zapnutý, ale kurzor se změnil z `grab` na `auto` a CSS třída `pan-cursor` zmizela.

**Příčina:** [CanvasViewport.svelte:65](../src/components/canvas/CanvasViewport.svelte#L65) odmítá Space při fokusu na tlačítku; zároveň `keyup` ručně odstraňuje stejnou CSS třídu, kterou ovládá Svelte podle trvalého nástroje.

**Oprava:** odvozený stav `effectivePan = selectedToolPan || temporarySpacePan || middleButtonPan`; jediný vlastník kurzoru. Rozlišit textový editor a tlačítko. Vyřešit nativní aktivaci tlačítka mezerníkem bez porušení klávesové přístupnosti. Při blur, pointercancel a ztrátě capture ukončit dočasný stav. Omezit aktivní drag na jeden pointer.

**Akceptace:** pan přes H, tlačítko, mezerník po použití toolbaru i prostřední myš. Všechny varianty mění jen viewport; netvoří undo krok ani dirty stav a nemění export. Správný kurzor při stisku, tažení, uvolnění a návratu fokusu. Navíc otestovat zoom během dragu, pan ven z hostu, modální dialog a touchpad; tyto varianty dosud nemají kompletní pokrytí.

**Co funguje:** obyčejné tažení při aktivním Pan nemění model ani export; po ukončení dragu mimo host se stav `dragging` uklidí.

### A04 — Ctrl+Z v textu vrací dokument

**Reprodukce:** posunout vrstvu, začít psát název a bez opuštění pole použít Ctrl+Z. Změnila se pozice vrstvy zpět, místo lokálního undo psaného textu. Následné opuštění pole zapsalo nový název.

**Příčina:** [App.svelte:45](../src/App.svelte#L45) obsluhuje Ctrl+Z/Y před kontrolou textových prvků. `input`, `textarea`, `select` se filtrují pouze u jednoduchých zkratek H/V/F/1.

**Oprava a akceptace:** textové editory mají lokální historii; dokumentové undo se spustí až mimo editaci nebo po explicitním dokončení. Testovat Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y a contenteditable, nejen textový parametr Channel Algebra.

### A05 — Dítě skryté skupiny lze neviditelně posunout

**Reprodukce:** skrýt Group, vybrat její viditelné dítě Checker v seznamu a táhnout na plátně. Pozice dítěte se změnila, přestože se ve výsledku vůbec nezobrazuje.

**Příčina:** pointerdown kontroluje vlastní `layer.visible`, ale ne viditelnost předků. Zámek předků už rekurzivní kontrolu má.

**Oprava a akceptace:** rekurzivní effective visibility pro interakce s plátnem. Skryté zdroje musí nadále fungovat jako vstup efektu/masky; pouze drag nemá nepozorovaně editovat neviditelný obsah. Testovat více úrovní skupin.

### A06 — Obnova WebGL ponechá odlišný náhled

**Experiment:** přes `WEBGL_lose_context` ztratit a obnovit kontext samostatného DocumentRenderEngine s generátorem Checker. Událost obnovení nastala; náhled stejného dokumentu nebyl totožný. Nový final export mohl proběhnout a error callback nehlásil chybu.

**Příčina:** [DocumentRenderEngine](../src/lib/render/DocumentRenderEngine.ts) nemá vlastní obnovu render graphu. Čisté cached RenderTexture po obnově kontextu neobsahují dříve vypočtené pixely, ale graf je stále považuje za platné.

**Oprava a akceptace:** při context loss pozastavit render/export a ukázat srozumitelný stav; při restore vyčistit targety i efektové/generátorové/maskové runtime, obnovit zdroje a přepočítat vše. Stejné preview pixely po obnovení, zachovaný model/historie/dirty stav, funkční další editace a export. Následně zopakovat na fyzické GPU a ve WebView2.

### A07 — Krytí a metadata zbytečně přepočítávají efekty

**Důkaz:** změna opacity vrstvy s Threshold invalidovala `source`, Threshold, `output` i dokument. Krytí se přitom aplikuje až při skládání. Source signatura zahrnuje i name, locked a další hodnoty; group signatura obsahuje celý podstrom.

**Oprava:** v [RenderGraph](../src/lib/render/RenderGraph.ts) oddělit signaturu obsahu, transformací a složení. Krytí/blend/visibility musí invalidovat příslušné složení, nikoli výpočet obsahu; přejmenování nebo zámek nemají měnit pixely. Zachovat správnou invalidaci sourozeneckých vstupů a masek. Pro větší graf sestavit index downstream hran místo opakovaného průchodu všemi uzly.

**Akceptace:** testy přesného rozsahu dirty uzlů; na skupinách a multipass stacku doložit nižší počet přepočtů. Nezměněný viewport nesmí vyvolat GPU výpočet efektů.

### A08 — Loader přijme nulové a extrémní scale

**Důkaz:** projekt s `scale.x = 0` byl přijat. Loader používá obecnou validaci bodu s rozsahem ±1e6, zatímco UI a updateLayer podporují kladné měřítko 0,01–100. `localDragDelta` dělí scale předků, takže nula znamená neplatný výpočet dragu. Toto následné selhání nebylo měřeno na plátně.

**Oprava a akceptace:** jednotná transform validační funkce pro UI, commandy, load a migrace. Pro současný rozsah odmítnout nulu, záporné hodnoty a hodnoty mimo 0,01–100; pokud mají být podporována zrcadlení, explicitně změnit model i ovládání. Chybný load zachová živý dokument.

### A09 — Správa assetů nemá úplný životní cyklus

**Důkaz:** po importu jednoho obrázku a Novém dokumentu zůstalo v manageru jedno asset, přestože nový dokument byl prázdný a historie resetovaná. Ve správci jsou stále originální Bloby, dekódované obrázky, URL a případné textury. V UI není odstranění assetu ani vyčištění knihovny.

**Rozhodnutí a oprava:** určit, zda je knihovna dokumentová, nebo záměrně globální. Dokumentová se při new/load uvolní. Globální potřebuje jasné označení a ovládání čištění. Při editaci nelze prostě smazat vše nepoužité aktuálními vrstvami: asset může potřebovat undo/redo. Sbírat reference ze živého dokumentu, obou větví historie a rozpracovaných operací; uvolnit je po vyřazení poslední reference.

**Akceptace:** opakované import/delete/new nepřidávají neomezeně paměť. Undo stále obnoví správný obraz. GPU textury i object URL se skutečně uvolní.

### A10 — Paměť a odezva náročných dokumentů

Kód omezuje pool na osm **volných** targetů, ale ne omezení všech cached/live targetů. Není rozpočet GPU paměti, preflight vůči `MAX_TEXTURE_SIZE`, detekce nedostatku paměti ani nižší preview kvalita. Final export navíc vytvoří další graph vedle preview. Jediný RGBA8 target 8192 × 8192 znamená asi **256 MiB** bez dalších kopií a režie; osm takových volných targetů by představovalo přibližně 2 GiB. Jde o výpočet, nikoli provedený alokační test.

Měření na SwiftShader:

| Dokument / efekt | Cold PNG export | Opoždění event-loop timeru při exportu |
| --- | ---: | ---: |
| 512², Threshold | 36 ms | 29 ms |
| 1024², Threshold | 220 ms | 192 ms |
| 512², Morphology radius 8 | 1 133 ms | 1 128 ms |
| 1024², Morphology radius 8 | 4 443 ms | 4 435 ms |
| 512², Reaction Diffusion 32 iterací | 912 ms | 893 ms |

Preview měření ve výstupu skriptu měří odeslání renderu, ne dokončení veškeré GPU práce. Výsledky nejsou reprezentativní benchmark fyzické GPU ani garantovaná doba exportu. Ukazují však několikasetmilisekundové až sekundové blokování při readback/exportu v této konfiguraci.

**Oprava:** diagnostika počtu targetů/odhadovaných bytes a času efektů; omezení cache podle bytes; kontroly dostupného backendu/rozměrů; definovaný safe rozsah 1.0. Pomalé operace musí mít viditelný průběh a skutečně funkční zrušení tam, kde se dá výpočet přerušit. Nezaměňovat tlačítko Zrušit se zrušitelností synchronního GPU readbacku. Zvážit menší preview pro vhodné efekty a zachovat přesný režim pro mřížkové/bitové algoritmy.

**Akceptace:** měření na fyzických integrovaných i dedikovaných GPU, žádný nekontrolovaný pád při překročení podporované kapacity, zachovaný projekt a srozumitelná diagnostika. Limity v UI odpovídají ověřenému rozsahu.

### A11 — Ochrana při nahrazení a zavření dokumentu

Open a native close používají confirm se zahazováním změn, New vyžaduje checkbox při existenci vrstev. Chybí společný dialog s možností okamžitě uložit. Dirty dokument bez vrstev může vzniknout jejich odstraněním; New v takovém případě checkbox neukáže.

**Oprava:** Uložit / Zahodit / Zrušit podle dirty stavu, ne podle počtu vrstev. Uložení musí dokončit aktivní pole podle A01. Zrušení save dialogu nebo chyba zápisu musí zrušit i původní close/open/new. Rozlišit ruční uložení a kopii obnovy; otestovat explicitní zahazování i přerušení aplikace. Nativní dialogovou cestu teprve ověřit.

### A12 — Velikostní limity nejsou sjednoceny mezi čtením a zápisem

Browser project input nejprve volá `file.text()` a teprve parser kontroluje délku řetězce. Portable save načítá assety souběžně do base64 a nemá preflight na velikost výsledného JSON; jednotlivé importy mají limit 100 MB, ale není společný rozpočet knihovny. Výsledný portable soubor může přesáhnout 300 MB, které jeho vlastní loader odmítá. Tento hraniční případ nebyl vytvořen kvůli paměťovým nárokům. Rust kontroluje velikost souboru před čtením a součet externích assetů; browser cesta nemá stejné kontroly.

**Oprava a akceptace:** `File.size` před čtením, limity výsledného JSON i celkových dekódovaných assetů před save, definovat bytes versus UTF-16 délku. Omezit souběžné převody a native IPC přes pole čísel. Každý úspěšně uložený projekt musí být znovu otevřitelný v deklarovaném prostředí; nedostatek místa/chyba dekódování nezmění živý dokument ani poslední validní soubor.

### A13 — Desktop a instalátor musí projít skutečným release testem

Dosavadní build a pět Rust testů jsou dobrý základ. Před 1.0 ale chybí aktuální ověření WebView2 UI, nativních open/save/export/close dialogů a jejich rušení, Unicode/dlouhých cest, read-only složky, chybějících assetů, instalace bez vývojových nástrojů, upgrade a odinstalace. Ověřit také chování WebView2 při DPI 125/150/200 % a ztrátě kontextu. Nutný je explicitní seznam podporovaných OS; současný ověřený build je Windows x64.

**Akceptace:** protokol na čistém Windows účtu nebo VM, ručně či automaticky. Pokud nebude nativní automatizace dostupná, test musí provést člověk; vynechání nelze nahradit dalšími headless browser testy.

### A14 — Release disciplína

Repozitář nemá `.github` workflow a v kořeni nebyl nalezen LICENSE/CHANGELOG. Verze v package, Cargo, Tauri a toolbaru se upravuje na více místech. Doplnit jedním příkazem spustitelnou úplnou kontrolu, CI nebo ekvivalentní uložený release protokol, migrační fixtures v1/v2/v3, konzistentní verzi, checksums artefaktů a changelog. Vyjasnit licenční a distribuční metadata a přehled závislostí; případné podepisování instalátoru je samostatné distribuční rozhodnutí.

## Doporučené doplňky P2

Tyto body nejsou automaticky blokátory. Pokud se před 1.0 nestihnou, musí jejich omezení být viditelné v nápovědě a rozsahu vydání.

| ID | Doplněk | Důvod / akceptace |
| --- | --- | --- |
| B01 | Vícečetný výběr, seskupení a bezpečné rozpuštění skupiny | Seskupení nyní obaluje jedinou vrstvu. Rozpuštění transformované/efektové skupiny vyžaduje definovat zachování výsledku; neřešit pouhým přesunutím dětí. |
| B02 | Výběr na plátně a jednoznačné chování dragu | Výběr se dělá v seznamu; tažení posouvá zvolenou vrstvu i mimo její obsah. Přidat hit testing nebo srozumitelně odlišit nástroj přesunu od výběru. |
| B03 | Nastavení dokumentu a názvu | Umožnit upravit název, background a případně rozměry. Jasně definovat účinek resize na pixelové parametry a generátory. |
| B04 | Přenosný `.rlab` a poslední projekty | Dnešní JSON + assets je funkční, ale snadno se přenese jen manifest. Dokud není archiv, přenos vysvětlit přímo v save dialogu/nápovědě. |
| B05 | Přístupnost, lokalizace a DPI | Sjednotit češtinu/angličtinu, doplnit klávesové označení aktivního nástroje, popisy barevných hodnot a fokus. Ověřit minimální okno a DPI s otevřenými modály. |
| B06 | Cesty vstupních vrstev ve výběru | Po duplikaci skupin mají zdroje stejné názvy; zobrazovat `skupina / vrstva`, ne jen název. Informovat při odstranění používaného zdroje. |
| B07 | Souhrnná diagnostika generátorů, masek a chyb | Chyby generátorů se ukládají pod ID vrstvy, ale jejich vlastnosti nemají obdobný panel jako efekt/maska. Cleanup errors map musí zahrnout i instance, jejichž runtime nevznikl. Odstranit chybu po opravě/smazání, zachovat vysvětlení při exportu. Tento cleanup nález je z kódu, ne samostatná UI reprodukce. |
| B08 | Touchpad a komfort viewportu | Definovat dvouprstý pan versus wheel zoom, přidat spolehlivý návrat na Fit a volitelné omezení úplného odtažení dokumentu. |

Další efekty, animace, WebGPU, uzlový editor, dávkový export a malované masky nyní nemají přednost před A01–A14.

## Kontroly a artefakty

- `npm run build`: TypeScript/Svelte 0 chyb, 0 varování; produkční build úspěšný.
- `npm test`: 53 testů, 16 souborů, vše prošlo.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: 5 testů prošlo.
- Regresní browser sady: Features 10, Catalog 12, Expansion 20, Remaining 6, Creative 5; pokrytí všech 53 efektů. Composition pokrývá všech osm generátorů a skupiny. Workflow, Masks a Smoke doplňují presety, zotavení, masky a základní ovládání.
- Reprodukční kontroly: [review-ui.mjs](../scripts/review-ui.mjs), [review-model.mjs](../scripts/review-model.mjs), [review-races.mjs](../scripts/review-races.mjs), [review-context.mjs](../scripts/review-context.mjs), [review-performance.mjs](../scripts/review-performance.mjs).
- Výsledky jsou v `test-results/review/`: `ui.json`, `model.json`, `import-race.json`, `context.json`, `performance.json`; screenshoty `pan-space-focus.png`, `import-race.png`.

Od stabilizace 0.11 skripty UI/model/race/context vracejí nenulový kód při neúspěšné akceptaci a jsou zahrnuté v `npm run release:check`; výkonnostní skript zůstává diagnostickým měřením. Původní výsledky popisují stav 0.10.0.

Spuštění: produkční preview na 4173 pro UI/races, vývojový server na 5173 pro model/context/performance; poté `node scripts/review-*.mjs` jednotlivě. Pro opakování nepoužívat otevřený osobní dokument: skripty vytvářejí izolované headless browser sessions. Vývojové diagnostiky používají interní pole rendereru pouze pro revizi, nejde o veřejné aplikační API.

## Doporučený postup k 1.0

1. **Bezpečnost práce:** A01, A02, A04, A11 a regresní testy polí/operací. Teprve potom pokračovat k release candidate.
2. **Ovládání a rendering:** A03, A05, A06, A07, A08. Rozšířit testy o skutečné uživatelské sekvence, nejen pixelovou správnost filtrů.
3. **Kapacita:** A09, A10, A12; změřit reálné GPU a rozhodnout podporované rozměry a odezvu.
4. **Vydání:** A13, A14; nativní protokol, všechny regresní sady na finálním buildu, migrační fixtures a finální seznam omezení. B01–B08 zařadit podle zbývající kapacity.

**Podmínka vydání:** žádné otevřené P0; všechny P1 opravené nebo s konkrétním, ověřeným omezením produktu, které odstraňuje dané riziko. Nestačí přeznačit problém v dokumentaci. Každá oprava musí dostat test reprodukující původní nález a ověření, že se nezměnily uložené projekty ani exportované pixely.

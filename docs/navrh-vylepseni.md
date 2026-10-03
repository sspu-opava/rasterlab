# Návrh dalšího rozvoje RasterLabu

Datum: 3. 10. 2026. Výchozí verze: 0.6. Tento dokument je návrh, nikoli seznam hotových funkcí nebo závazný harmonogram.

Realizace v 0.7: hledání a oblíbené efekty, duplikace, kopírování stacků, uživatelské a ukázkové presety s přenosným formátem a automatická zotavovací kopie. Podrobnosti v [návodu 0.7](workflow-0.7.md). Realizace v 0.8: osm generátorových vrstev, rekurzivní editorové operace, strom a vnořování skupin, skupinové efekty a projekty v2 s migrací v1; [návod 0.8](composition-0.8.md). Realizace v 0.9: masky z jiné vrstvy s invertováním, silou a změkčením, duplikace vrstev a celých skupin a projekty v3; [návod 0.9](masks-0.9.md). Realizace v 0.10: Displacement Map, Halftone, Dither, Morphology a Palette Remap; [návod 0.10](effects-0.10.md). Vícečetný výběr a rozpuštění skupin zůstávají návaznými úkoly. Seznam posledních projektů, náhledové kartičky efektů a rozšířený dialog odchodu jsou další úpravy ovládání.

## Výchozí stav a směr

RasterLab obsahuje 48 efektů, nedestruktivní vrstvy, vstupní reference, projekty, export, historii a render graph s cache. Další rozvoj má zpřístupnit složitější kompozice, usnadnit opakování experimentů a zlepšit práci s náročnými dokumenty.

Z výchozího kódu 0.6 vyplývaly hlavní mezery: neaktivní Generators a Presets, chybějící editor skupin a renderer generátorů a masek. Verze 0.7 a 0.8 doplnily presety, generátory a první správu skupin. Verze 0.9 doplnila masky z vrstvy a duplikaci skupin. Více vstupů v executorové větvi znamená primary a secondary, náhled používá stejné rozlišení jako export a desktopový projekt tvoří JSON a složka assets. Tyto oblasti poskytují základ pro další iterace.

Priorita P1 znamená doporučený nejbližší rozvoj, P2 návazné rozšíření a P3 dlouhodobou možnost. Náročnost malá/střední/velká je relativní technický odhad podle rozsahu změn, nikoli časový odhad.

## Přehled návrhů

| Oblast | Navrhované zlepšení | Přínos | Priorita | Náročnost |
| --- | --- | --- | --- | --- |
| Knihovna efektů | Hledání, oblíbené efekty, ukázky a stručná nápověda | Rychlejší orientace v nabídce 48 modulů | P1 | Malá–střední |
| Presety | Ukládání parametrů i celých stacků, kopírování mezi vrstvami | Opakování zdařilých postupů | P1 | Střední |
| Projekty | Autosave, obnova po pádu, seznam posledních projektů | Menší riziko ztráty práce | P1 | Střední |
| Generátory | Vrstvy bez bitmapy, využití současných procedurálních algoritmů | Tvorba materiálu přímo v aplikaci | P1 | Střední–velká |
| Skupiny | Strom vrstev, vnořování, efekty nad skupinou | Přehlednější a bohatší kompozice | P1 | Střední–velká |
| Masky | Maska z jiné vrstvy, invert, síla a rozostření | Lokální řízení výsledku | P1 | Velká |
| Náhled a výkon | Měření času uzlů, rozpočet GPU paměti, volitelný menší náhled | Plynulejší práce s iterativními efekty | P1 | Velká |
| Formát projektu | Jeden přenosný soubor .rlab, import stávajících JSON projektů | Snadné předávání a archivace | P2 | Střední |
| Experimenty | Galerie variant seedů, uzamčení parametrů, porovnání A/B | Rychlé hledání zajímavého výsledku | P2 | Střední |
| Více vstupů | Libovolný počet pojmenovaných vstupů, váhy zdrojů | Skutečné mozaiky a bitové kombinace více obrazů | P2 | Velká |
| Export | Série variant, fronta, metadata a lepší průběh operace | Pohodlné vytváření kolekcí | P2 | Střední–velká |
| Pokročilý rozvoj | Animace parametrů, uzlový editor, vyšší přesnost simulací | Nové způsoby tvorby a kontroly | P3 | Velká |

## 1. Knihovna efektů a presety

Nahradit samotný výběrový seznam panelem s hledáním podle názvu, kategorie a popisu. Zachovat rychlé přidání z klávesnice. U každého efektu zobrazit malou ukázku, počet vstupů a informaci o iterativním výpočtu. Oblíbené efekty patří do nastavení uživatele.

Presety mají dvě úrovně: parametry jednoho efektu a celý stack. Každý preset obsahuje verzi svého formátu, ID a verze efektů, parametry a případné role vstupů. Konkrétní UUID zdrojové vrstvy se při použití na jiný dokument nesmí slepě přenést; uživatel přiřadí požadované zdroje. Chybějící definice se zobrazí s diagnostikou. Použití presetu, duplikace efektu a kopírování stacku mají tvořit vždy jeden undo krok.

První sada může obsahovat přibližně deset pojmenovaných postupů, například papírovou koláž, tonerový tisk, buněčnou texturu a rozpad signálu. Použité seedy zůstanou součástí presetu, s možností jejich nového vygenerování při použití.

Hotovo znamená: uložený stack lze přenést na jinou vrstvu, správně přiřadit vstupy, vrátit jediným undo a reprodukovat po save/load. Hledání nevyžaduje ruční seznam definic mimo registry.

## 2. Ochrana rozpracované práce

Zavést automatické zotavovací kopie do odděleného umístění. Ukládat po krátké době nečinnosti a pouze při změně dokumentu; ne při každém pohybu slideru. Zotavovací kopie musí obsahovat dostupné originály assetů a konzistentní manifest. Rozpracovaný, dosud nepojmenovaný dokument má mít stejnou možnost obnovy jako uložený projekt.

Při startu nabídnout obnovu, pokud se zotavovací kopie liší od posledního ručního uložení. Oddělit stav „uloženo uživatelem“ a „existuje zotavovací kopie“, aby autosave nezrušil hvězdičku neuložených změn. Doplnit seznam posledních projektů a dialog Uložit / Zahodit / Zrušit pro odchod z rozpracovaného dokumentu.

Hotovo znamená: přerušení aplikace při autosave nezničí poslední platnou kopii; obnovený projekt reprodukuje výsledek a ruční save/load/export se s autosave nepřekrývají.

## 3. Samostatné generátorové vrstvy

Zpřístupnit záložku Generators. První implementace: Noise/FBM, Checker, Lines, Dots, Voronoi, Interference a Radial Field. Procedurální data a GLSL funkce sdílet se stávajícími efekty; generátor produkuje dokumentovou texturu, na kterou navazuje běžný effect stack.

GeneratedLayer potřebuje vlastní definici generátoru, seed a serializovatelné parametry, nikoli pomocný importovaný obrázek. Změna rozměrů dokumentu přepočítá výstup. V první fázi rozlišit procedurální zdroj a filtr bitmapy v UI, aby bylo jasné, co uživatel přidává.

Hotovo znamená: nový dokument lze vytvořit, procedurálně zaplnit, zpracovat efekty, uložit, otevřít a exportovat bez jediného importu bitmapy. Seedy a parametry reprodukují obraz na stejném backendu.

## 4. Skupiny a masky

Skupiny: stromový seznam vrstev, sbalení, vytvoření skupiny z výběru, přesun dovnitř a ven, duplikace a efekty nad výsledkem skupiny. Před UI rozšířit editorové operace tak, aby pracovaly rekurzivně s vrstvami. Ověřit význam transformací, opacity a blend skupiny a ochranu před přesunem skupiny do vlastního potomka.

Masky: nejprve odkaz na výstup jiné vrstvy. Volba alpha nebo luminance, invert, síla a feather v dokumentových pixelech. Navržené první pořadí je source → effect stack → maska → krytí/blend vrstvy. Maska přidá závislost do grafu a musí podléhat kontrole cyklů. Tuto sémantiku zachytit v projektovém formátu a nápovědě.

Později přidat štětec, gradientové masky a maskování jednotlivých efektů. Tyto možnosti vyžadují samostatné rozhodnutí o ukládání tahů, transformacích a rozsahu historie.

Hotovo znamená: vnořenou kompozici s maskou lze editovat, přesouvat a vracet v historii; projektový roundtrip zachová pixely a změna masky invaliduje pouze závislé uzly.

## 5. Výkon a náhled

Nejprve měřit: čas vyhodnocení efektů, počet targetů a odhad využití GPU paměti. Sestavit zátěžové dokumenty s Pixel Sort, Feedback, Recursive Collage a Reaction Diffusion. Teprve naměřené výsledky určují, které uzly optimalizovat.

Následně nabídnout přesný náhled a rychlý náhled například v polovičním nebo čtvrtinovém rozlišení. Pixelové parametry musí respektovat poměr náhledu k dokumentu. Pixel Sort, Databend a buněčné simulace jsou citlivé na pixelovou mřížku; jejich zmenšený náhled nelze považovat za přesnou zmenšeninu finálního výstupu. Pro ně zachovat přesný režim a zřetelně označit případnou aproximaci.

Přidat omezení cache podle paměťového rozpočtu a obnovu po ztrátě WebGL kontextu. Dlouhé víceprůchodové úlohy později rozdělit tak, aby bylo možné zpracovat požadavek na zrušení nebo novou změnu. Samotný nápis „Zrušit“ nemá smysl, pokud všechny průchody blokují stejný UI cyklus.

Hotovo znamená: na stanovené testovací konfiguraci jsou doložené časy před/po změně; přepnutí kvality nemění projektová data a finální export zůstává nezávislý na viewportu i režimu náhledu.

## 6. Přenosné projekty a export kolekcí

Formát .rlab navrhnout jako archiv manifestu, originálních assetů a volitelného náhledu. Zachovat otevření současných JSON projektů a zavést explicitní migrace nových typů vrstev. Uložení má zapisovat nový soubor a atomicky nahradit původní až po úspěchu. Načítání omezuje velikosti a odmítá cesty mimo archiv; chybný projekt nesmí nahradit živý dokument.

Export rozšířit o pojmenované profily, volbu podkladové barvy JPEG, frontu a dávky seedovaných variant. Každá položka fronty používá neměnný snapshot dokumentu, aby pozdější editace neovlivnila rozpracovaný export. Ke kolekci přidat volitelný JSON s parametry a seedy pro zopakování výsledku. Změnu exportního rozlišení řešit spolu s definicí měřítka pixelových parametrů, nikoli pouhým zvětšením render targetu.

Hotovo znamená: .rlab lze přenést bez doprovodné složky; přerušený save zachová původní soubor; dávka reprodukuje stejné varianty a nezmění otevřený dokument ani jeho historii.

## 7. Galerie experimentů a další vstupy

Galerie variant vytvoří například devět náhledů téhož stacku s různými seedy. Uživatel může uzamknout vybrané parametry, porovnat dvě varianty a jediným krokem přijmout jednu do dokumentu. Varianty se generují postupně s omezenou pamětí a možností přerušení. Porovnání A/B nebo posuvná hranice jsou pouze součástí viewportu a nepatří do exportu.

Více vstupů rozšířit od metadat přes validaci a serializaci až po context a GPU bindingy. Pak může Multi-Source Mosaic používat několik vrstev s vahami a Bit Plane Mixer vybírat zdroj pro jednotlivé bity z více než dvou obrazů. Počet současně vázaných textur musí respektovat schopnosti backendu. Reference budou dostupné i na vrstvy uvnitř skupin.

Hotovo znamená: mozaika alespoň ze tří zdrojů funguje i po save/load, skryté zdroje zůstávají použitelné a cyklické vazby jsou odmítnuty před vyhodnocením.

## 8. Dlouhodobé možnosti

- Animace parametrů: klíčové snímky pro číselné hodnoty, deterministický časový vstup a nejprve export PNG sekvence. Přímý video export řešit až po dokončení tohoto základu.
- Uzlový editor: začít pohledem na existující render graph pro pochopení vazeb; úpravu uzlů přidat po stabilizaci skupin, masek a pojmenovaných vstupů.
- Přesnější simulace: volitelné float targety pro Reaction Diffusion s detekcí schopností GPU a testy; bitové efekty nadále zachovají definované 8bit chování.
- Další efekty: Distance Field a další zpracování masek. Displacement Map, Halftone, Dither, Morphology a Palette Remap byly doplněny v 0.10. Distance Field navazuje na generátory a masky.
- WebGPU nebo externí pluginy: samostatné projekty až podle měření výkonu a konkrétního požadavku. Rozšiřovat současné API tak, aby tyto možnosti zůstaly otevřené.

## Doporučené pořadí realizace

| Navržená etapa | Rozsah | Hlavní závislost |
| --- | --- | --- |
| 0.7 – opakovatelné experimenty | Hledání a oblíbené efekty, duplikace/kopírování stacků, presety, autosave a obnova | Verze presetového formátu a konzistentní recovery snapshot |
| 0.8 – kompozice | Rekurzivní operace vrstev, UI skupin, generátorové vrstvy, první masky | Rozšířený deserializer a grafové závislosti |
| 0.9 – náročnější dokumenty | Profilování, paměťový rozpočet, volba kvality, .rlab | Rozlišení preview/final a definice pixelového měřítka |
| Následující etapa | Galerie variant, dávkový export, více vstupů | Presety, snapshoty, omezení paměti a pojmenované vstupy |

Čísla verzí jsou orientační označení etap. V každé etapě dodat nejprve jeden kompletní průchod od UI přes dokument, historii a render po save/load a export. Stávajících 48 efektů ověřovat regresními GPU testy; nové typy vrstev a migrace dostanou cílené roundtrip testy. Nativní save/open/close a obnovu po pádu ověřit také přímo v desktopové aplikaci.

Doporučeným dalším konkrétním úkolem po 0.9 je měření výkonu náročných kompozic, počtu render targetů a GPU paměti. Následovat může paměťový rozpočet, přenosný archiv .rlab, vícečetný výběr a rozpuštění skupiny se zachováním výsledku.

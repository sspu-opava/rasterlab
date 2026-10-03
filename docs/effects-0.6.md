# Zbývající katalogové efekty v RasterLabu 0.6

Nabídka Effects obsahuje 48 modulů. Všechny položky `katalog.md` nyní mají implementaci; další moduly tvoří základní efekty a samostatné boolean operace. Každý nový efekt podporuje bypass, reset, undo/redo, projekty a PNG/JPEG/WebP export.

| Efekt | Ovládání a výsledek |
| --- | --- |
| Channel Algebra | Tři textové výrazy pro RGB ze dvou vrstev; clamp, wrap nebo normalizace RGB a volba alpha. |
| Recursive Collage | 0–12 skutečných rekurzivních vložení; měřítko, rotace a diagonální posun v pixelech. |
| Echo Frames | 1–32 prostorových kopií originálu, posun X/Y, měřítko a úbytek krytí. |
| Cellular Growth | 0–128 růstových kroků přes osm sousedů, práh substrátu, spread 1–8 px, hustota zárodků, amount a seed. |
| Databend | Délka bloků pixelového proudu, seedovaný posun a opakování částí bloků. |
| Signal Collapse | Intenzita, velikost bloků, práh, výpadky kanálů a seed; posun řádků, kvantizace a bitový ořez. |

## Výrazy Channel Algebra

Vyberte druhou vrstvu ve vstupu efektu. `ar`, `ag`, `ab` jsou normalizované RGB kanály první vrstvy, `br`, `bg`, `bb` druhé. `al` a `bl` představují jejich luminanci. Povolené jsou číselné konstanty, závorky, `+`, `-`, `*`, `/` a funkce `abs`, `min`, `max`, `clamp`, `mix`, `sin`, `cos`, `floor`, `fract`.

Příklady: `ar` ponechá červený kanál první vrstvy; `mix(ar, br, .3)` míchá oba červené kanály; `abs(ag - bg)` vyjadřuje rozdíl zelených kanálů. Každý výraz potvrďte Enter nebo opuštěním pole. Ctrl+S uloží i rozepsanou změnu aktivního pole. Výrazy jsou uložené v projektu jako text a mají limit 256 znaků. Chybná syntaxe označí efekt, náhled použije původní vstup a export oznámí chybu. Oprava nebo undo obnoví efekt.

Clamp omezí hodnoty na 0–1, wrap je zalomí pomocí fract, normalize roztáhne minimum a maximum RGB každého pixelu na 0–1. Konstantní RGB se při normalize pouze omezí na 0–1. Dělení s absolutním jmenovatelem pod 0.000001 vrací nulu. Parser nepoužívá JavaScript eval a nepřijímá libovolný GLSL kód.

## Iterace a neutrální nastavení

Recursive Collage vkládá předchozí výsledek přes originál; nejde pouze o opakování původní bitmapy. Depth 0 zachová vstup. Echo Frames naopak opakuje originál s kumulovaným posunem a měřítkem; Copies 1 zachová vstup.

Cellular Growth vytváří seedované zárodky v procedurálním substrátu a v každém kroku přidá vhodné sousední buňky. Buňky nezanikají a hranice jsou periodické. Spread určuje vzdálenost sousedů v pixelech. Seed density 0 nevytvoří žádné buňky, Amount 0 zachová původní bitmapu včetně průhlednosti. Simulace při změně parametrů začíná znovu, proto nezávisí na historii vykreslení. Je bitmapovým efektem; samostatné generátorové vrstvy ještě nejsou implementované.

Databend interpretuje obraz jako řádkově uspořádaný proud pixelů, opakuje úvodní část každého bloku a přidává seedovaný posun. Stream shift 0 a Repetition 1 zachovají vstup. Jde o vizuální simulaci; soubor assetu se nemění. Signal Collapse má úplný bypass při Intensity 0. Oba efekty mohou přesouvat nebo vytvářet průhledné oblasti.

Test `npm run test:remaining` ověřuje skutečné GPU pixely všech šesti efektů, determinismus, bypass, seed/undo, arithmetic reference, obnovu po chybě výrazu, skutečný růst, opakování proudu, identity včetně alpha a projektový roundtrip.

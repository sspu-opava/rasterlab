# Pět nových efektů v RasterLabu 0.10

Knihovna nyní obsahuje 53 efektů. Nové moduly jsou dostupné v Effects, fungují na bitmapách, generátorech i skupinách a používají běžné undo/redo, presety, masky, projekty a export. Projektový formát zůstává v3; starší aplikace neznámé efekty zobrazí s diagnostikou a neprovede jejich export.

| Efekt | Použití |
| --- | --- |
| Displacement Map | Jiná vrstva posouvá pixely: červená řídí X, zelená Y; alternativně jas řídí obě osy. |
| Halftone | Černobílý tiskový rastr s nastavitelnými body, natočením a kontrastem. |
| Dither | Bayerův rastr 4 × 4 nebo seedovaný šum pro omezení barevných úrovní. |
| Morphology | Dilatace a eroze jasu nebo alfa kanálu se čtvercovým či křížovým okolím. |
| Palette Remap | Tři vlastní barvy podle jasu, gama křivka a volitelné barevné pásy. |

## Displacement Map

Vytvořte například FBM Noise nebo Voronoi a skryjte tuto vrstvu. Vyberte obrázek a přidejte Displacement Map; v **Displacement source** nastavte skrytý generátor. **Horizontal / px** a **Vertical / px** určují maximální posun včetně směru. Padesátiprocentní šedá je neutrální; průhledná část mapy také nezpůsobuje posun. Mapa používá vlastní výstup po efektech a masce, před krytím/blendem a transformacemi předků.

**Transparent** nechá mimo obraz průhlednost, **Clamp** protáhne krajní pixely a **Wrap** obraz opakuje. Nulové obě osy vrátí původní obraz. Efekt potřebuje druhou vrstvu; cyklické reference se odmítnou.

## Halftone

**Dot spacing / px** určuje velikost tiskových buněk 2–64 px. **Screen angle** natáčí rastr, **Print contrast** upravuje velikost bodů a **Amount** míchá výsledek s originálem. Jas se vzorkuje ve středu buňky. Černý vstup zůstane černý a bílý bílý. Okraje bodů jsou změkčené v rozsahu přibližně jednoho dokumentového pixelu. Krytí původního obrazu se zachová.

Příklad: na fotografii přidejte Halftone s rozestupem 6–10 px a následně Palette Remap pro barevný tiskový vzhled.

## Dither

**Levels** vybírá 2–16 úrovní. **Dither cell / px** zvětšuje rastr 1–16 px. **Luminance** tvoří šedotónový výsledek; **RGB** kvantizuje kanály samostatně. Bayerovo uspořádání je pravidelné; **Seeded noise** má reprodukovatelné náhodné prahy řízené Seed. U pravidelného vzoru seed výsledek nemění. Nejde o difuzi chyby Floyd–Steinberg.

Pro pixelový tisk použijte dvě úrovně a buňku 1–3 px, případně dále obarvěte výsledek pomocí Palette Remap.

## Morphology

**Dilate / maximum** vybírá sousední pixel s nejvyšší hodnotou, **Erode / minimum** s nejnižší. V režimu jasu jde o luminanci násobenou alfa; v režimu alfa o krytí. Přenese se celý vybraný premultiplied RGBA pixel, takže se může přenést také barva souseda. Shodné hodnoty ponechají současný pixel.

**Radius / px** je 0–8. Čtvercové okolí zahrnuje i diagonály, křížové pouze vodorovné a svislé sousedy. Mimo obraz jsou nulové hodnoty. Nulový poloměr nebo Amount vrátí originál. Alfa dilatace rozšíří neprůhledné body; eroze je ztenčí. Pro zesílení černých čar na bílém podkladu použijte minimum jasu.

Při maximálním poloměru shader vyhodnocuje až 289 sousedů na pixel; na velkých dokumentech začínejte menším poloměrem.

## Palette Remap

Vyberte barvy **Shadow color**, **Midtone color** a **Highlight color**. Jas po **Tone gamma** se mapuje na lineární přechod stín → střed → světlo. **Quantized bands** omezuje přechod na 2–32 úrovní. Amount nula je identita; alfa se zachová. Vlastní barvy se ukládají do projektu i presetu.

Výchozí paleta kombinuje tmavě modrou, růžovou a světlou žlutou. Pro dvoubarevný tisk lze nastavit střed na jednu z krajních barev. Seřazení efektů mění výsledek: Dither před paletou dává omezené tóny, Dither za paletou kvantizuje již obarvený obraz.

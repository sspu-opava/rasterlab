# Masky a duplikace skupin v RasterLabu 0.9

## Maska z jiné vrstvy

Vyberte cílovou vrstvu nebo skupinu. Ve spodní části vlastností najdete **MASKA Z VRSTVY**. Z nabídky **Zdroj masky** vyberte jinou vrstvu; může být skrytá a může mít vlastní generátor, efekty i masku. Zdroj zůstává samostatně upravitelný. **Bez masky** odkaz odstraní.

Připravený [ukázkový projekt](../examples/masked-generators.json) otevřete přes Ctrl+O. Obsahuje rozostřenou šachovnicovou masku a nezávislou kopii skupiny bez jediného bitmapového assetu. Rozbalte viditelnou skupinu a vyberte Paper pro úpravu změkčení masky.

- **Jas × alfa**: bílá odkrývá, černá skrývá; průhledná část zdroje je prázdná maska. Jas používá váhy 0,2126 R + 0,7152 G + 0,0722 B.
- **Alfa kanál**: neprůhledná část zdroje odkrývá bez ohledu na barvu.
- **Invertovat** obrátí masku, včetně jejích průhledných oblastí.
- **Síla masky** míchá původní obraz s maskovaným. Nula zachová celý obraz, 100 % použije masku naplno.
- **Změkčení / px** rozostří masku před invertováním. Rozsah je 0–64 dokumentových pixelů, nezávisle na zoomu. Používá dva směrové průchody s 17 vzorky Gaussova jádra; jde o konečnou aproximaci rozostření. Mimo dokument je maska nulová.
- **Aktivní** umožní dočasný bypass bez ztráty parametrů.

Pořadí výpočtu je zdroj → transformace vrstvy → efekty → maska → krytí/blend při složení. Výstup skupiny se maskuje po složení dětí a po efektech skupiny. Maska násobí barvu i alfa kanál a zachovává správné průhledné okraje.

Reference používá vlastní výstup zdroje po jeho efektech a masce, před jeho krytím/blendem a před transformacemi nadřazených skupin. Skrytý zdroj funguje dál. Tím lze například skrýt procedurální Checker a použít jej jako masku jiné vrstvy. Výsledek se přepočítá při změně zdroje.

Nabídka nezobrazuje zdroje vytvářející cyklus. Kontrola cyklů zahrnuje masky, efekty i skupiny, včetně dočasně vypnutých vazeb. Při odstranění zdroje se maska odebere; undo obnoví zdroj i masku. Zámek nadřazené skupiny chrání také nastavení masek potomků.

## Duplikace vrstvy nebo skupiny

Nad seznamem Layers použijte **Duplikovat vybranou vrstvu nebo skupinu**. Kopie se vloží nad originál mezi stejné sourozence. Dostane nové UUID vrstvy, potomků a instancí efektů. Vnitřní reference efektů a masek se přepojí na kopírované potomky; odkazy mimo skupinu nadále používají původní vnější zdroje.

Parametry a transformace jsou nezávislé. Rastrové kopie sdílejí původní asset, který zůstává nedotčený. Zámky dětí se zachovají. Celá duplikace tvoří jeden krok undo/redo. Limit 100 vrstev platí i pro všechny potomky kopie; příliš velká kopie se odmítne bez částečného zápisu.

## Projekty a obnova

Masky i duplikované skupiny fungují s undo/redo, automatickou zotavovací kopií a exportem PNG/JPEG/WebP. JPEG používá bílé podložení průhlednosti.

Nové projekty používají formát v3. Aplikace otevírá v1 a v2 a převádí je v paměti na v3. Příští save zapíše v3; pro jeho otevření potřebujete RasterLab 0.9 nebo novější. Preset efektů ukládá nadále pouze stack efektů, nikoli masku nebo generátor vrstvy.

Další části projektu: vícečetný výběr, rozpuštění skupiny se zachováním výsledku, maskování jednotlivých efektů, štětcové masky, měření výkonu, paměťový rozpočet, přenosný archiv .rlab a dávkový export. Nejsou součástí této verze.

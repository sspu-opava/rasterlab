# Generátory a skupiny v RasterLabu 0.8

## Vytvoření obrazu bez bitmapy

Vytvořte dokument přes Ctrl+N. V levém panelu otevřete **Generators** a u vybraného zdroje stiskněte **Přidat vrstvu**. Parametry jsou ve spodní části pravého panelu vlastností; podle výšky okna je potřeba panel posunout. Přes Effects můžete přidat kterýkoli z 48 efektů nebo použít preset. Ctrl+S uloží projekt, Ctrl+E exportuje PNG/JPEG/WebP.

| Generátor | Hlavní ovládání |
| --- | --- |
| Noise | Seed nezávislého pixelového šumu |
| Checker | Velikost buněk a šedé tóny popředí/pozadí |
| Lines | Rozestup v px, šířka, úhel a šedé tóny |
| Dots | Rozestup v px, poloměr a šedé tóny |
| FBM Noise | Seed a parametry vícevrstvého šumu |
| Voronoi | Seed, členění a režim buněk |
| Interference | Počet vln, frekvence, úhel a fáze |
| Radial Field | Střed, frekvence, spirála a útlum |

Procedurální zdroj vždy vyplňuje rozměr dokumentu. Jeho transformace se aplikují před efekty. Generátor se ukládá jako definice a parametry; nepotřebuje žádný pomocný obrázek. Stejné parametry a seed na stejném backendu opakují výsledek. Seedy patří zdroji; preset efektového stacku ukládá pouze efekty.

## Skupiny

Vyberte vrstvu a nad seznamem Layers použijte tlačítko **Seskupit vybranou vrstvu**. Vznikne skupina s jediným vybraným dítětem a neutrální transformací. Další vrstvy do ní přesunete přes **Skupina** ve vlastnostech; volba dokumentu přesune vrstvu zpět na nejvyšší úroveň. Stejným postupem lze vnořit další skupinu.

Šipka před skupinou sbaluje pouze seznam, ne obraz. Šipky pořadí přesouvají vybranou vrstvu mezi sourozenci. Efekty skupiny zpracují složený obsah všech jejích viditelných dětí. Transformace, krytí a blend skupiny ovlivňují celou kompozici; zámek chrání i potomky. Jednotlivé děti mají vlastní efekty a parametry, použitelné presety a historii.

Přesun do skupiny zachovává UUID, efekty a **místní** transformaci. Pokud má nový rodič vlastní posun, rotaci nebo měřítko, výsledná poloha se změní. Pro zachování obrazu seskupujte pod neutrální skupinou. Mezivýsledky jsou ořezané na rozměr dokumentu.

Skryté dítě lze použít jako druhý vstup efektu. Vstup odkazuje na vlastní výstup vrstvy před krytím/blendem a transformacemi předků. Cykly, například efekt dítěte závislý na vlastní skupině, aplikace odmítá. Odstranění zdroje odstraní jeho reference; efekt vyžadující druhý vstup zobrazí diagnostiku, dokud vstup znovu nevyberete. Undo obnoví zdroj i reference.

## Uložení a historie

Vytvoření generátoru, seskupení, přesun mezi skupinami, změny vlastností a odstranění tvoří vratné operace. Ctrl+Z a Ctrl+Shift+Z fungují i u vnořených vrstev. Souvislé změny parametrů se slučují do jednoho kroku. Skupiny i generátory podporuje ruční uložení, automatická zotavovací kopie a export.

Nové projekty mají formát v2. Projekty v1 se otevřou a při příštím uložení převedou na v2. Pro otevření v2 použijte RasterLab 0.8 nebo novější. Desktop stále ukládá JSON a případné originály do vedlejší složky assets; dokument složený pouze z generátorů nepotřebuje originály bitmap.

Limity jsou 100 vrstev včetně skupin, 12 úrovní vnoření a 32 efektů na vrstvu. Zatím se seskupuje jediný výběr; vícečetný výběr, rozpuštění a duplikace celé skupiny i masky jsou další vývoj.

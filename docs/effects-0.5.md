# Dvacet nových efektů v RasterLabu 0.5

V nabídce Effects je celkem 42 modulů. Každý nový efekt podporuje stack, bypass, reset, undo/redo, projekty a export. Efekty s druhým vstupem mohou používat i skrytou vrstvu; její krytí a blend se do sekundárního vstupu nezapočítávají.

| Efekt | Ovládání a výsledek |
| --- | --- |
| Logic Matrix | AND, OR, NAND, NOR, XNOR; RGB, luminance nebo binary threshold. Dvě vrstvy. |
| Difference Fold | Rozdíl vrstev; 1–16 zalomení, gain a offset. Dvě vrstvy. |
| Bit Plane Mixer | Volba první/druhé vrstvy pro každý bit 0–7 a mapování RGB kanálů. |
| Quantized Difference | Prah, 2–32 úrovní a grayscale/heat/RGB paleta. Dvě vrstvy. |
| Cross Strips | Nezávislá permutace řádků a sloupců, až 8 × 8, jitter a seed. |
| Fragment Scatter | 1–16 nepravidelných Voronoi fragmentů, rozptyl, rotace, měřítko a seed. |
| Cut-Up | Promíchání úplné permutace fragmentů, velikost a míra náhodnosti. |
| Multi-Source Mosaic | Dlaždice ze dvou vrstev, váha druhého vstupu, blending a seed. |
| Fold Map | Konečné přehyby; počet, úhel, délka, hloubka, highlight a seed. |
| Paper Warp | Měkké spojité deformace; frekvence, amplituda, nepravidelnost a seed. |
| Torn Paper | Křivolaké trhliny; počet, směr, roughness, průhledná mezera a stín. |
| Print Misregistration | RGB/CMYK separace; čtyři páry posunů, rotace a rozostření. |
| FBM Noise | Až 8 oktáv value noise, persistence, lacunarity, scale, amount a seed. |
| Voronoi Field | Buněčná barva, vzdálenost nebo hranice; 3 metriky, 2–32 center a seed. |
| Flow Field | Gradient nebo curl pole; frekvence, síla deformace a seed. |
| Radial Field | Soustředné kruhy a spirály; střed, frequency, twist, falloff a amount. |
| Block Corruption | Výběr bloků, jejich posun a kvantizace; block size, rate a seed. |
| Pixel Sort | Skutečné řazení pixelů podle luminance, hue nebo saturation. |
| Feedback | 0–64 opakovaných transformací výstupu, měřítko, rotace, posun a decay. |
| Reaction Diffusion | Gray–Scott U/V simulace, feed, kill, 1–128 kroků a seed density. |

Cut-Up vyjadřuje velikost jako zlomek obou rozměrů obrazu. Mřížka se zaokrouhlí na celé dělení 1–8; maximálně má 64 fragmentů. Randomness 0 vrací původní pořadí, 1 úplnou seedovanou permutaci. Žádný fragment se neduplikuje ani neztrácí.

Pixel Sort řadí vodorovně nebo svisle, vzestupně či sestupně, uvnitř intervalů 2–64 pixelů. Pixely s metrikou pod threshold a průhledné pixely jsou bariéry: řazení je nepřesune a nepřekročí je. Počet průchodů odpovídá délce intervalu; nejde o napodobení řazení posunem obrazu.

Reaction Diffusion používá periodické hranice, Eulerův krok 1, diffusion U=0.16 a V=0.08. Stav se ukládá do RG kanálů standardních 8bit GPU targetů; výsledkem je umělecká simulace s kvantizovaným stavem. Amount 0 zachová bitmapu, seed density 0 vytvoří stacionární stav U=1,V=0. Simulace se při každé změně znovu inicializuje; stejný seed a parametry tak dávají shodný náhled a export. Feedback i Pixel Sort používají stejnou deterministickou víceprůchodovou infrastrukturu.

Generativní moduly nyní pracují jako efekty bitmapové vrstvy. Samostatné GeneratedLayer renderery zůstávají pro další fázi. Reálné GPU náklady rostou s rozlišením a počtem průchodů; Fragment Scatter navíc porovnává nepravidelné buňky pro každý fragment.

Z původního katalogu zbývají Channel Algebra, Recursive Collage, Cellular Growth, Databend, Echo Frames a Signal Collapse. Celkových 42 modulů zahrnuje také základní efekty editoru a samostatné AND/OR/NAND varianty.

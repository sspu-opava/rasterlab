Pro RasterLab bych katalog nestavěl jako běžnou sbírku fotografických filtrů. Většina efektů by měla vytvářet nové struktury, kombinovat vrstvy nebo poskytovat řízenou náhodnost. Níže je 40 efektů, které už dávají aplikaci vlastní charakter.

1. **XOR Blend** — bitový XOR dvou obrazů; režimy RGB, luminance, binary. Parametry: threshold, channel mode, opacity.
2. **Logic Matrix** — AND, OR, NAND, NOR, XNOR v jednom efektu. Parametry: operation, threshold, channel selection.
3. **Modulo Mix** — kombinuje dvě vrstvy pomocí modulo aritmetiky a vytváří ostré barevné zlomy. Parametry: divisor, gain, channel mode.
4. **Difference Fold** — absolutní rozdíl obrazů následovaný opakovaným „foldingem“ hodnot do omezeného rozsahu. Parametry: iterations, gain, offset.
5. **Bit Plane Extractor** — zobrazí jednotlivé bitové roviny RGB kanálů. Parametry: bit 0–7, channel, invert.
6. **Bit Plane Mixer** — skládá bitové roviny několika obrazů do nového obrazu. Parametry: source per bit, channel mapping.
7. **Channel Algebra** — dovolí sestavit nový RGB obraz z algebraických kombinací kanálů různých vrstev. Parametry: expressions, normalization.
8. **Quantized Difference** — rozdíl dvou obrazů redukovaný na několik úrovní. Parametry: levels, threshold, palette.

9. **Strips** — rozřeže obraz na vodorovné nebo svislé pásy a přeskupí je. Parametry: count, direction, shuffle, gap, seed.
10. **Cross Strips** — nezávisle rozřeže obraz v osách X a Y a vytvoří fragmentovanou mřížku. Parametry: rows, columns, jitter, seed.
11. **Random Tiles** — rozdělí obraz do buněk a každou náhodně posune, otočí nebo zvětší. Parametry: grid, rotation, scale, displacement.
12. **Voronoi Collage** — obraz rozdělí nepravidelnými Voronoi buňkami. Parametry: cells, edge width, displacement, seed.
13. **Fragment Scatter** — nepravidelné části obrazu „rozmetá“ v prostoru. Parametry: fragment count, radius, rotation, scale.
14. **Recursive Collage** — vkládá zmenšené kopie obrazu do jeho vlastní struktury. Parametry: depth, scale, rotation, spacing.
15. **Cut-Up** — digitální varianta dadaistického cut-upu; fragmenty se promíchají podle náhodného nebo řízeného pořadí. Parametry: fragment size, randomness, seed.
16. **Multi-Source Mosaic** — každá dlaždice může pocházet z jiné vrstvy. Parametry: grid, source weights, randomness, blending.

17. **Crumple** — procedurální simulace zmuchlaného papíru. Parametry: fold count, strength, sharpness, lighting, seed.
18. **Fold Map** — vytváří jednotlivé ostré přehyby přes obraz. Parametry: folds, angle, length, depth, highlight.
19. **Paper Warp** — měkké lokální deformace podobné navlhlému papíru. Parametry: warp scale, amplitude, irregularity.
20. **Torn Paper** — vytváří nepravidelné trhliny a oddělené části obrazu. Parametry: tear count, roughness, gap, shadow.
21. **Ink Bleed** — simuluje rozpíjení inkoustu do vláken papíru. Parametry: radius, diffusion, threshold, texture.
22. **Photocopy** — hrubý kontrast, toner, šum a lokální vynechání. Parametry: contrast, toner density, grain, dropout.
23. **Print Misregistration** — posune jednotlivé tiskové barevné separace. Parametry: CMYK/RGB offsets, rotation, blur.
24. **Surface Relief** — vytvoří z luminance height map a nasvítí ji jako reliéf. Parametry: depth, light angle, softness.

25. **FBM Noise** — víceoktávový procedurální šum. Parametry: scale, octaves, persistence, lacunarity, seed.
26. **Voronoi Field** — generuje buněčné struktury. Parametry: density, distance mode, edge width, seed.
27. **Interference** — překrývání sinusových vln tvoří moiré a interferenční struktury. Parametry: wave count, frequency, angle, phase.
28. **Flow Field** — generuje směrové pole, kterým lze deformovat obraz. Parametry: scale, curl, strength, seed.
29. **Contour Atlas** — převádí jas na vrstevnicové pásy. Parametry: contour count, thickness, smoothing.
30. **Cellular Growth** — organické shluky připomínající biologické tkáně nebo mapy. Parametry: iterations, threshold, spread, seed.
31. **Reaction Diffusion** — Gray–Scott nebo podobný systém vytvářející skvrny, pruhy a buněčné struktury. Parametry: feed, kill, iterations, seed.
32. **Radial Field** — generuje koncentrické, spirálové nebo radiální struktury. Parametry: center, frequency, twist, falloff.

33. **RGB Shift** — nezávislé posuny barevných kanálů. Parametry: X/Y offset pro každý kanál.
34. **Scanline Displace** — jednotlivé řádky nebo skupiny řádků posouvá různými směry. Parametry: amplitude, line height, randomness, seed.
35. **Block Corruption** — simuluje poškození komprimovaného obrazu blokovými artefakty. Parametry: block size, corruption rate, displacement.
36. **Pixel Sort** — řadí pixely podle jasu, odstínu nebo saturace. Parametry: direction, threshold, metric, interval.
37. **Databend** — vizuální simulace poškození datového proudu bez skutečného rozbíjení souboru. Parametry: block length, shift, repetition, seed.
38. **Feedback** — opakovaně vrací výstup do vstupu s transformací. Parametry: iterations, scale, rotation, offset, decay.
39. **Echo Frames** — vytváří prostorové „ozvěny“ jedné vrstvy. Parametry: copies, displacement, scale, opacity decay.
40. **Signal Collapse** — kombinuje kvantizaci, prahování, scanline posun, bitové operace a lokální ztrátu dat do jednoho řízeného destruktivního efektu. Parametry: intensity, block size, threshold, channel loss, seed.

Pro první verzi bych z těchto 40 implementoval jen asi 12–15, ale tak, aby reprezentovaly různé architektonické typy: jeden jednoduchý shader, jeden více-vstupový efekt, jeden generátor, jeden iterativní algoritmus, jeden fragmentační efekt a jeden náročnější procedurální efekt.

Jako první „charakterovou sadu“ RasterLabu bych vybral: **XOR Blend, Bit Plane Extractor, Strips, Voronoi Collage, Fragment Scatter, Crumple, Ink Bleed, Photocopy, Interference, Contour Atlas, Reaction Diffusion, Pixel Sort, Feedback, Databend a Signal Collapse**. Tato patnáctka už by aplikaci jasně odlišila od běžných grafických editorů.
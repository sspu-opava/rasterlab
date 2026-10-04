# Stabilizace 0.11.0

Opravy navazují na [revizi před 1.0](revize-pred-1.0.md). Původní reprodukce jsou nyní přísné regresní kontroly: při nesplněné podmínce vracejí nenulový kód.

## Provedené změny

| Body | Výsledek |
| --- | --- |
| A01, A04 | Uložení a odchod dokončí aktivní pole před snapshotem. Text/číslo/contenteditable mají lokální undo; slider, checkbox a ostatní hotové změny patří historii dokumentu. Neplatná aktivní hodnota uložit nejde. |
| A02 | Import, načítání, nový dokument, obnova, editace a zavření sdílejí blokování operací. Loader má také vlastní zámek pro souběžné přímé volání a vymění dokument až po úspěšném dekódování všech zdrojů. |
| A03, A05 | Kurzor má jediný odvozený stav. Mezerník funguje i po použití nástroje v toolbaru; jeden pointer, capture cleanup, blur a modály. Zoom ukončí probíhající drag. Dítě skryté skupiny nelze posunout. |
| A06, A07 | Ztráta kontextu pozastaví renderer/export. Obnova vyčistí graf, targety a runtime. Krytí/prolnutí/viditelnost invalidují složení; název a zámek pixely nemění. Downstream vazby mají vlastní index. |
| A08 | Loader a editor používají stejné meze scale 0,01–100. Nulové, záporné, nekonečné a příliš velké hodnoty se při load odmítnou. |
| A09 | Knihovna patří dokumentu, new/load ji uvolní. „Vyčistit nepoužívané“ zachová reference živého modelu a obou větví undo/redo. Omezení knihovny zabraňuje neomezenému růstu. |
| A10 | Preflight proti MAX_TEXTURE_SIZE a konzervativnímu rozpočtu GPU 512 MiB. Volný pool maximálně 32 MiB, export uvolní preview cache. Zobrazený odhad paměti a fáze exportu. Zrušení se kontroluje před výpočtem a před zápisem; synchronní výpočet a GPU readback nejsou přerušitelné. |
| A11 | Společný dialog Uložit / Zahodit / Zrušit pro nový, open, recent, obnovu a nativní close. Chyba nebo zrušení save ponechá původní akci nedokončenou. Funguje i pro dirty prázdný dokument. Browser při opuštění stránky používá povinný dialog svého prostředí. |
| A12 | File.size před čtením, kontrola UTF-8 bytes, preflight portable base64 a archivu, limity knihovny a IPC. Rozměry PNG/JPEG/WebP se čtou před dekódováním. |
| A14 | `npm run release:check -- --desktop`, CI na Windows, centrální verze z package.json, changelog, SHA-256 a explicitní soukromá licence UNLICENSED. Veřejnou licenci musí zvolit držitel práv. |
| B01 | Ctrl/Shift výběr více sousedních vrstev a seskupení ve stejném rodiči. Rozpuštění je povoleno pouze u neutrálních skupin, jejichž výsledek se zachová; ostatní operace mají vysvětlení a model se nezmění. |
| B02 | Nástroj V se jmenuje „Přesun vrstvy“. Výběr probíhá v seznamu; tah na plátně posouvá aktivní vrstvu. |
| B03 | Dialog Dokument: název, rozměry, barva a alfa pozadí; jediný undo krok. Resize mění plátno a generátory, nepřepočítává pozice ani pixelové parametry. |
| B04 | `.rlab` je ZIP/STORE s project.json a původními bitmapami; kontrola CRC a cest, bez rozbalování na filesystem. Pět posledních projektů, browserové kopie do 32 MiB. |
| B05 | České hlavní ovládání, pojmenování nástroje přesunu, aria-pressed nástrojů, popsané barvy, viditelný fokus, modály a toolbar přizpůsobené malému oknu. Názvy katalogových efektů a jejich technických parametrů zůstávají podle katalogu. |
| B06, B07 | Vstupy efektů a masek ukazují cesty skupin. Odstranění zdroje oznámí odpojené vazby. Chyby generátoru jsou v inspektoru; osiřelé chyby se čistí i bez vytvořeného runtime. |
| B08 | Shift+kolečko a převládající vodorovný touchpad posouvají pohled, ostatní wheel zoomuje. Fit obnoví pohled. Volba Dosah ponechá alespoň 48 px dokumentu na ploše. |

## Podporované meze

- Dokument/bitmapa 1–8192 px, dále skutečný MAX_TEXTURE_SIZE a odhad GPU 512 MiB. Velký stack může být odmítnut i při menších rozměrech; projekt lze uložit.
- Jedna bitmapa nejvýše 100 MiB; knihovna 100 obrázků, 300 MiB původních souborů a 256 MiB dekódovaných pixelů.
- Browserový projekt/archiv 300 MiB. Desktopový součet JSON a binárního přenosu 32 MiB kvůli nákladům číselných polí IPC; kontrola probíhá před vytvořením payloadu. Stejný limit má desktopový export.
- `.rlab` používá nekomprimovaný ZIP/STORE. Libovolné cizí ZIP/DEFLATE archivy se nepřijímají. Formát modelu zůstává v3; v1/v2 se migrují.
- Operace GPU mají zachovanou přesnost celého dokumentu. Čas synchronního readbacku závisí na backendu; nejde o garantovanou odezvu fyzické GPU.

## Zbývající ověření před 1.0

**A13 a hardwarová část A06/A10/B05 zůstávají otevřené.** Nativní automatizace byla znovu vyzkoušena; `sky.list_windows()` vrací „Computer Use native pipe is unavailable“, os error 2. Není možné poctivě potvrdit instalaci, nativní dialogy, DPI ani fyzickou GPU tímto prostředím. [Nativní protokol](release-native-protocol.md) je připraven pro Windows 11 x64 na čistém účtu/VM a skutečném hardware.

Veřejné vydání dále vyžaduje potvrzení vydavatele a licence držitelem práv. Build 0.11.0 je stabilizační kandidát, nikoli prohlášení, že všechny podmínky vydání 1.0 byly ověřeny.

# Protokol nativního kandidáta

Vyplňuje tester na čistém Windows 11 x64. Cílem není spuštění dev serveru; použijte instalátor 1.0.0 a ověřte jeho SHA-256. Výsledek každého řádku zaznamenejte jako PASS / FAIL, s datem a důkazem. Dokud není protokol vyplněn, příslušné kontroly A13 zůstávají neprovedené. Samotné označení vydání 1.0.0 není výsledkem těchto kontrol.

## Identifikace

- Tester, datum, Windows build, WebView2 verze:
- SHA-256 instalátoru:
- GPU, driver, RAM, fyzický hardware / VM:
- DPI a rozlišení monitoru:

## Kontroly

| Kontrola | Výsledek a důkaz |
| --- | --- |
| Instalace jako běžný uživatel bez Node/Rust/VS; první start | |
| Instalace s chybějícím WebView2 a případné doplnění runtime | |
| Upgrade starší verze při zachování presetů, oblíbených a recovery | |
| Odinstalace; popsané zachování/odstranění uživatelských dat | |
| Open JSON+assets, portable JSON, `.rlab`, migrations v1/v2/v3 | |
| Save/Save As: Unicode a dlouhá cesta, přepis existujícího projektu | |
| Rušení open/save/export: zachovaný model, dirty, soubory a busy stav | |
| Read-only cíl, nedostatek místa a chybějící/poškozený asset | |
| Ctrl+S při rozepsaném názvu, scale, pozici, seedu a parametru | |
| New/Open/Close: Uložit, Zahodit, Zrušit; také prázdný dirty dokument | |
| Close při importu/uložení/exportu, pád aplikace a skutečná obnova | |
| PNG/JPEG/WebP export shodných pixelů před/po pan a zoom | |
| Mezerník po použití toolbaru, H, prostřední tlačítko, blur, capture | |
| Touchpad, Shift+wheel, Fit a Dosah | |
| Minimální okno, DPI 100/125/150/200 %, toolbar i všechny modály | |
| Klávesový průchod a návrat fokusu, Enter na nástrojích | |
| Kontext loss/restore ve WebView2: shodné pixely, model a undo | |
| Intel/AMD integrovaná GPU: cold preview/export náročných stacků | |
| Dedikovaná GPU: stejné testy a čas skutečného readbacku | |
| Překročení rozměrů/MAX_TEXTURE_SIZE/512 MiB: srozumitelná chyba, možnost uložit | |
| 100 import/delete/undo/new cyklů: stabilní paměť a uvolnění URL/textur | |

Pro výkon zaznamenejte Threshold 512²/1024², Morphology radius 8 a Reaction Diffusion 32; přidejte alespoň složitý skupinový stack s maskou. Měřte cold export a odezvu UI, ne pouze čas odeslání GPU příkazů. Při chybě přiložte malý reprodukční projekt.

# Změny

## 1.0.0 — 4. 10. 2026

- První verze 1.0 pro Windows x64: 53 nedestruktivních efektů, osm generátorů, vrstvy, skupiny, masky a presety.
- Zahrnuje stabilizační opravy 0.11, formát projektu v3, migrace v1/v2, přenosné archivy `.rlab`, obnovu práce a undo/redo.
- Distribuce obsahuje instalátor, samostatné EXE, český návod, kontrolní součty a výsledky automatických kontrol.
- Podporované limity a rozsah ověření jsou uvedené v `docs/vydani-1.0.md`; licence projektu zůstává soukromá (`UNLICENSED`).

## 0.11.0 — stabilizace před 1.0

- Dokončení aktivních polí při ukládání, exportu a nahrazení dokumentu; lokální textové undo.
- Blokování souběhu importu, načítání, nového dokumentu a obnovy.
- Opravený pan, kurzor, fokus toolbaru, pointer capture a viditelnost předků.
- Obnova cache po ztrátě WebGL, přesná invalidace složení a kontrola GPU kapacity.
- Změny skrytých vrstev zůstávají invalidované do jejich opětovného zobrazení.
- Zavření počká na načtení zotavovací kopie a zachová dosud neotevřený projekt i kopii při chybě čtení úložiště.
- Čištění knihovny s uchováním zdrojů undo/redo, velikostní limity před čtením a zápisem.
- Dialog Uložit / Zahodit / Zrušit, nastavení dokumentu, vícenásobný výběr a bezpečné rozpouštění skupin.
- Přenosný ZIP/STORE `.rlab`, pět posledních projektů a pojmenování vstupů cestou skupin.
- Průběh exportu, omezení viewportu, české ovládání, přístupnější nástroje a modály.
- Release kontrola, CI, synchronizace verzí a SHA-256 instalátoru.

Nativní UI, instalace na čistém Windows, DPI a fyzické GPU vyžadují samostatný protokol před vydáním 1.0.

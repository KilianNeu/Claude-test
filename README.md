# Werder Bremen · Saison für Saison

Inoffizielle Fan-Statistikseite: die letzten 20 Ligaspielzeiten von Werder Bremen (2006/07 bis 2025/26) interaktiv im Vergleich.

- **Diagramm** mit umschaltbaren Kennzahlen: Tabellenplatz, Punkte, Tore, Gegentore, Tordifferenz, Punkte pro Spiel
- **Hover** über eine Saison zeigt ihre Daten im Detailbereich
- **Klick** markiert eine Saison (A und B) für den direkten Vergleich
- **Saisonverlauf**: laufende Saison Spieltag für Spieltag gegen die letzten 20 Jahre (Punkte, Platz, Tordifferenz), mit Schnitt, Spannweite und Hochrechnung
- Bilanz (Siege/Unentschieden/Niederlagen) und sortierbare Tabelle
- **Saison 2026/27**: Ergebnisse, Bestenlisten, kompletter Kader mit Minuten, Ein-/Auswechslungen, Noten, xG, xA, Pässen, Zweikämpfen, Defensive und Torhüterwerten (gesamt oder pro 90 Minuten), Spieler-Steckbriefe und Bundesliga-Tabelle
- **Spiele**: Spielplan mit Spielberichten (Verlauf, Momentum, Schusskarte, Statistik je Halbzeit, Aufstellung mit Noten), Pech-Barometer nach xG, Halbzeit-Analyse
- **Liga**: Werder in 27 Teamwerten im Ligavergleich, Monte-Carlo-Prognose für den Endplatz
- **Verein**: Altersstruktur, Herkunft, Verträge, Verletzte, Marktwerte, alle Wechsel 2026
- **Finanzen**: Umsatz, Ergebnis, Eigenkapital, Anleihe, Investoren 2018/19 bis 2025/26 mit Quellen
- **Fans**: Nordderby-Countdown, Vorschau aufs nächste Spiel, Momente der Saison
- **Spieler**: Rekordtorschützen, Rekordspieler, Vorlagengeber, Karten
- **Transfers**: teuerste Ein- und Verkäufe, Rückkehrer
- **Titel**: Meisterschaften, Pokalsiege, Torschützenkönige
- Navigationsleiste oben: jeder Bereich ist eine eigene Unterseite (Reiter). Direktlinks wie `#finanzen` oder `#spieler-1024292` öffnen die jeweilige Seite

Reines HTML/CSS/JS ohne Build-Schritt. Lokal einfach `index.html` im Browser öffnen.

## Daten

Alle Saisondaten liegen in [`assets/seasons.js`](assets/seasons.js), die Spieler-, Transfer- und Titellisten mit ihren Quellen in [`assets/rekorde.js`](assets/rekorde.js). Punkte, Tordifferenz und Schnitte werden daraus berechnet.

## GitHub Pages

Settings → Pages → „Deploy from a branch“ → Branch wählen, Ordner `/ (root)`.

Der Spieltagsverlauf steht in [`assets/verlauf.js`](assets/verlauf.js). Die letzte Saison darin gilt als laufende Saison: nach jedem Spieltag die Arrays `pts`, `gf`, `ga` und `rank` um einen Wert verlängern, der Rest der Seite rechnet sich neu.

## Laufende Saison aktualisieren

Die Werte der laufenden Saison kommen von FotMob. Nach einem Spieltag:

```
python3 tools/update_fotmob.py
```

Das Skript schreibt `assets/kader.js` und `assets/spiele.js` neu und verlängert die laufende Saison in `assets/verlauf.js`. Mit `python3 tools/build_single.py dist/werder.html` entsteht die ganze Seite als eine Datei. Die Daten gehören FotMob, die Seite nennt sie als Quelle.

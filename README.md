# Werder Bremen · Saison für Saison

Inoffizielle Fan-Statistikseite: die letzten 20 Ligaspielzeiten von Werder Bremen (2006/07 bis 2025/26) interaktiv im Vergleich.

- **Diagramm** mit umschaltbaren Kennzahlen: Tabellenplatz, Punkte, Tore, Gegentore, Tordifferenz, Punkte pro Spiel
- **Hover** über eine Saison zeigt ihre Daten im Detailbereich
- **Klick** markiert eine Saison (A und B) für den direkten Vergleich
- **Saisonverlauf**: laufende Saison Spieltag für Spieltag gegen die letzten 20 Jahre (Punkte, Platz, Tordifferenz), mit Schnitt, Spannweite und Hochrechnung
- Bilanz (Siege/Unentschieden/Niederlagen) und sortierbare Tabelle
- **Spieler**: Rekordtorschützen, Rekordspieler, Vorlagengeber, Karten
- **Transfers**: teuerste Ein- und Verkäufe, Rückkehrer
- **Titel**: Meisterschaften, Pokalsiege, Torschützenkönige
- Navigationsleiste oben zu allen Bereichen

Reines HTML/CSS/JS ohne Build-Schritt. Lokal einfach `index.html` im Browser öffnen.

## Daten

Alle Saisondaten liegen in [`assets/seasons.js`](assets/seasons.js), die Spieler-, Transfer- und Titellisten mit ihren Quellen in [`assets/rekorde.js`](assets/rekorde.js). Punkte, Tordifferenz und Schnitte werden daraus berechnet.

## GitHub Pages

Settings → Pages → „Deploy from a branch“ → Branch wählen, Ordner `/ (root)`.

Der Spieltagsverlauf steht in [`assets/verlauf.js`](assets/verlauf.js). Die letzte Saison darin gilt als laufende Saison: nach jedem Spieltag die Arrays `pts`, `gf`, `ga` und `rank` um einen Wert verlängern, der Rest der Seite rechnet sich neu.

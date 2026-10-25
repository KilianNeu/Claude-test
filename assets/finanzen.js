// Werder Bremen – Finanzen der SV Werder Bremen GmbH & Co KG aA (Konzern), Geschäftsjahr jeweils 1. Juli bis 30. Juni.
// Beträge in Mio. €. Quellen stehen bei jedem Wert; "calc" markiert eigene Berechnungen aus veröffentlichten Zahlen.
window.FINANZEN = {
  stand: "Oktober 2026",
  years: [
    { fy: "2018/19", revenue: 157.1, result: 3.5, league: "BL", note: "Umsatzrekord, Europapokal knapp verpasst", src: "Mitgliederversammlung 2019 (Deichstube)" },
    { fy: "2019/20", revenue: 120.4, result: -23.8, league: "BL", note: "Rekordverlust: Corona-Saisonende ohne Zuschauer, Relegation", src: "Konzernabschluss 30.06.2020" },
    { fy: "2020/21", revenue: 108.5, revenueCalc: true, result: -7.1, equity: -20.3, league: "BL", note: "Geisterspiele, Abstieg, Corona-Kredit über 20 Mio. €", src: "Konzernabschluss 30.06.2021 (BondGuide, Deichstube)" },
    { fy: "2021/22", revenue: 92.8, result: 6.3, league: "BL2", note: "Zweite Liga, direkter Wiederaufstieg", src: "Werder-Mitteilung 2023, BondGuide" },
    { fy: "2022/23", revenue: 115.3, result: -3.8, equityNegative: true, league: "BL", note: "Eigenkapital weiter negativ", src: "Geschäftsbericht 2022/23 (werder.de)" },
    { fy: "2023/24", revenue: 145.6, result: 2.2, equity: 22.3, transfers: 28.5, league: "BL", note: "Investoren-Einstieg, Eigenkapital erstmals seit 2019 positiv", src: "Konzernabschluss 30.06.2025 (Vorjahresspalte), werder.de" },
    { fy: "2024/25", revenue: 142.7, result: -7.4, equity: 14.9, equityRatio: 15.8, personnel: 74.6, opex: 151.7, transfers: 10.6, transfersCalc: true, league: "BL", note: "Weniger Transfererlöse, höhere Kosten", src: "Konzernabschluss 30.06.2025, Finanzupdate MV 16.11.2025" },
  ],
  halfYear: { label: "1. Halbjahr 2025/26 (Juli–Dezember 2025)", revenue: 72.0, revenuePrev: 69.9, result: -4.8, resultPrev: -5.0, opex: 77.7,
    note: "Mehr Transfererlöse (+5,0 Mio. €), Ziel bleibt ein Überschuss für das ganze Geschäftsjahr. Die DFL hat die Lizenz für 2026/27 erteilt.",
    src: "Zwischenkonzernabschluss 31.12.2025 (EQS-News, April 2026)" },
  revenueChange2425: [
    ["Medienrechte", 7.2], ["Spielbetrieb", 4.7], ["Sponsoring", 2.0], ["Transfers", -17.9],
  ],
  facts: [
    { big: "38 Mio. €", label: "brachte Anfang 2024 ein regionales Bündnis aus Unternehmern und Privatleuten mit Werder-Bezug für 18 % der Anteile, inzwischen 19,39 %. Rund 80 % sollten in die Profimannschaft fließen.", src: "Flashscore, Deichstube" },
    { big: "25 Mio. €", label: "Anleihe 2025/30 mit 5,75 % Zins, Laufzeit bis 31.07.2030. Wegen hoher Nachfrage von 20 auf 25 Mio. € aufgestockt.", src: "anleihen-finder.de, BondGuide" },
    { big: "6,5 %", label: "Zins der alten Anleihe 2021/26. Sie wurde am 30.06.2025 vorzeitig zu 100,5 % zurückgezahlt.", src: "anleihen-finder.de" },
    { big: "74,6 Mio. €", label: "Personalaufwand 2024/25 (+4 %), vor allem höhere Prämien für die Profis und mehr Etat für die Frauen-Bundesliga.", src: "Konzernabschluss 30.06.2025" },
    { big: "15,8 %", label: "Eigenkapitalquote zum 30.06.2025. Rechnerisch ergibt das eine Bilanzsumme von rund 94 Mio. €.", src: "Konzernabschluss 30.06.2025, eigene Rechnung" },
    { big: "20 Mio. €", label: "Corona-Kredit im Geschäftsjahr 2020/21, um die Liquidität zu sichern. Ohne Zuschauer fehlten in dieser Saison rund 27 Mio. €.", src: "Konzernabschluss 30.06.2021, Deichstube" },
  ],
  sources: [
    ["Werder: Finanzupdate Mitgliederversammlung 16.11.2025", "https://www.werder.de/news/weitere-news/2025-2026/finanzupdate-mv-16112025"],
    ["Konzernabschluss zum 30.06.2025 (PDF)", "https://a.storyblok.com/f/314264/x/8253972f55/konzernabschluss_30-6-2025.pdf"],
    ["Werder: Finanzberichte zur Anleihe 2025", "https://www.werder.de/business/anleihe-2025/finanzberichte"],
    ["anleihen-finder.de: Verlust im 1. Halbjahr 2025/26", "https://www.anleihen-finder.de/werder-bremen-mit-deutlichem-verlust-im-ersten-halbjahr-2025-26-00071885.html"],
    ["Deichstube: Millionen-Minus 2024/25", "https://www.deichstube.de/news/werder-bremen-millionen-minus-gruende-reaktionen-bilanz-finanzen-geschaeftsjahr-geld-svw-klaus-filbry-bundesliga-zr-94040059.html"],
    ["Werder: Finanzen 2023/24", "https://www.werder.de/aktuell/news/profis/2024/25/finanzen-mv-18112024/"],
    ["Werder: Geschäftsbericht 2022/23", "https://www.werder.de/news/maenner/2023-2024/pm-finanzen-19112023/"],
    ["BondGuide: Zurück im Plus (2021/22)", "https://www.bondguide.de/topnews/geschaeftszahlen-von-werder-bremen-zurueck-im-plus/"],
    ["Deichstube: Rekord-Minus 2019/20", "https://www.deichstube.de/news/werder-bremen-geld-bilanz-horror-zahlen-rekord-verlust-pleite-frank-baumann-rechtfertigt-schulden-bundesliga-minus-grund-corona-zr-90200007.html"],
    ["Flashscore: Investoren kaufen Anteile für 38 Mio. €", "https://www.flashscore.de/news/fu-ball-bundesliga-investoren-um-baumann-kaufen-werder-anteile-fur-38-millionen-regionales-bundnis/vsBR228j/"],
    ["anleihen-finder.de: Neue 20-Mio.-Anleihe", "https://www.anleihen-finder.de/neuemission-werder-bremen-begibt-20-mio-euro-anleihe-00068298.html"],
  ],
};

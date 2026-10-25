// Werder Bremen – Spieler-, Transfer- und Vereinsrekorde.
// Jede Liste nennt Zählweise und Quelle. Ablösen sind Medienangaben (meist nach Transfermarkt), keine offiziellen Vereinszahlen.
window.REKORDE = {
  stand: "Oktober 2026",

  tore: {
    title: "Rekordtorschützen",
    scope: "Bundesliga-Tore für Werder, alle Zeiten",
    unit: "Tore",
    source: "werder.de Vereinsrekorde, Weser-Kurier",
    rows: [
      { name: "Claudio Pizarro", value: 109, info: "1999–2020, vier Stationen" },
      { name: "Marco Bode", value: 101, info: "1989–2002, bester deutscher Werder-Torschütze" },
      { name: "Rudi Völler", value: 97, info: "1982–1987, Torschützenkönig 1983" },
      { name: "Frank Neubarth", value: 97, info: "1982–1996" },
      { name: "Aílton", value: 88, info: "1998–2004, in 169 Spielen" },
      { name: "Werner Görts", value: 73, info: "1970er" },
      { name: "Arnold „Pico“ Schütz", value: 69, info: "1960er/70er" },
      { name: "Uwe Reinders", value: 67, info: "1977–1985" },
      { name: "Norbert Meier", value: 66, info: "1980er" },
      { name: "Wynton Rufer", value: 59, info: "1989–1994, in 174 Spielen" },
    ],
  },

  einsaetze: {
    title: "Rekordspieler",
    scope: "Bundesliga-Einsätze für Werder, alle Zeiten",
    unit: "Spiele",
    source: "werder.de Vereinsrekorde, weltfussball.de, Weser-Kurier",
    rows: [
      { name: "Dieter Burdenski", value: 444, info: "Torwart" },
      { name: "Horst-Dieter Höttges", value: 420, info: "Rekord-Feldspieler" },
      { name: "Dieter Eilts", value: 390, info: "Europameister 1996" },
      { name: "Marco Bode", value: 379, info: "1989–2002" },
      { name: "Werner Görts", value: 363, info: "" },
      { name: "Karl-Heinz Kamp", value: 361, info: "" },
      { name: "Mirko Votava", value: 357, info: "1985–1996" },
      { name: "Oliver Reck", value: 345, info: "Torwart" },
      { name: "Torsten Frings", value: 326, info: "1996–2002, 2005–2011" },
      { name: "Frank Neubarth", value: 317, info: "1982–1996" },
    ],
  },

  vorlagen: {
    title: "Vorlagengeber",
    scope: "Torvorlagen für Werder, Zählweise von fussballdaten.de (erst seit den 1990ern erfasst)",
    unit: "Vorlagen",
    source: "fussballdaten.de",
    note: "Vorlagen werden erst seit den 1990ern zuverlässig gezählt, die Quellen zählen unterschiedlich. Platz 10 ließ sich nicht sicher belegen.",
    rows: [
      { name: "Johan Micoud", value: 47, info: "2002–2006, 169 Spiele" },
      { name: "Mesut Özil", value: 44, info: "2008–2010, 108 Spiele" },
      { name: "Miroslav Klose", value: 43, info: "2004–2007, 132 Spiele" },
      { name: "Torsten Frings", value: 41, info: "" },
      { name: "Aaron Hunt", value: 38, info: "" },
      { name: "Marvin Ducksch", value: 36, info: "" },
      { name: "Zlatko Junuzović", value: 36, info: "" },
      { name: "Ivan Klasnić", value: 35, info: "" },
      { name: "Diego", value: 34, info: "2006–2009" },
    ],
  },

  karten: {
    title: "Gelbe und Rote Karten",
    scope: "Bundesliga",
    source: "Weser-Kurier",
    facts: [
      { big: "92", label: "Gelbe Karten von Torsten Frings in der Bundesliga, Vereinsrekord (101 in allen Wettbewerben)" },
      { big: "58", label: "Gelbe Karten von Dieter Eilts in der Bundesliga, dazu eine Gelb-Rote und zwei Rote Karten" },
      { big: "3", label: "Gelb-Rote Karten jeweils für Mladen Krstajić, Niklas Moisander und Paul Stalteri" },
    ],
    note: "Für eine vollständige Top 10 bei Gelb und Rot habe ich keine verlässliche Quelle gefunden: die Datenbanken zählen Wettbewerbe unterschiedlich und widersprechen sich. Die Liste folgt, sobald die Zahlen sauber belegt sind.",
  },

  einkaeufe: {
    title: "Teuerste Einkäufe",
    scope: "Ablöse in Mio. €",
    unit: "Mio. €",
    source: "Weser-Kurier und buten un binnen, nach Transfermarkt",
    rows: [
      { name: "Davy Klaassen", value: 13.5, info: "2018 vom FC Everton" },
      { name: "Samuel Mbangula", value: 10, info: "von Juventus Turin", flag: "Angaben uneinheitlich, teils als Leihe geführt" },
      { name: "Marko Marin", value: 8.2, info: "2009 von Borussia Mönchengladbach" },
      { name: "Milot Rashica", value: 8.1, info: "2018 von Vitesse Arnheim" },
      { name: "Carlos Alberto", value: 7.8, info: "2007 von Corinthians São Paulo" },
      { name: "Max Kruse", value: 7.5, info: "2016 vom VfL Wolfsburg" },
      { name: "Wesley", value: 7.5, info: "2010 vom FC Santos" },
      { name: "Leonardo Bittencourt", value: 7, info: "2020 von der TSG Hoffenheim" },
      { name: "Niclas Füllkrug", value: 6.5, info: "2019 von Hannover 96" },
      { name: "Marko Arnautović", value: 6.2, info: "2010 vom FC Twente" },
    ],
  },

  verkaeufe: {
    title: "Teuerste Verkäufe",
    scope: "Ablöse in Mio. €",
    unit: "Mio. €",
    source: "Weser-Kurier und Statista nach Transfermarkt, Transferbilanzen 2023 und 2026",
    rows: [
      { name: "Diego", value: 27, info: "2009 zu Juventus Turin" },
      { name: "Thomas Delaney", value: 20, info: "2018 zu Borussia Dortmund" },
      { name: "Karim Coulibaly", value: 20, info: "2026 zu Racing Straßburg", flag: "neu, Höhe noch nicht von mehreren Quellen bestätigt" },
      { name: "Mesut Özil", value: 18, info: "2010 zu Real Madrid" },
      { name: "Miroslav Klose", value: 15, info: "2007 zum FC Bayern" },
      { name: "Niclas Füllkrug", value: 15, info: "2023 zu Borussia Dortmund", flag: "Angaben zwischen 15 und 17 Mio. €" },
      { name: "Jannik Vestergaard", value: 12.5, info: "2016 zu Borussia Mönchengladbach" },
      { name: "Mio Backhaus", value: 12, info: "2026", flag: "neu, Zielverein in den Quellen nicht eindeutig" },
      { name: "Davy Klaassen", value: 11.7, info: "2020 zu Ajax Amsterdam" },
      { name: "Anthony Ujah", value: 11.5, info: "2016 nach China (Liaoning)" },
    ],
  },

  rueckkehrer: {
    title: "Rückkehrer",
    scope: "Spieler, die nach einem Wechsel zu Werder zurückkamen",
    source: "Weser-Kurier, Wikipedia-Spielerliste, Vereinsmeldungen",
    rows: [
      { name: "Claudio Pizarro", times: 3, back: ["2008 vom FC Chelsea (Leihe)", "2015 vom FC Bayern", "2018 vom 1. FC Köln"], info: "Stationen 1999–2001, 2008–2012, 2015–2017, 2018–2020" },
      { name: "Niclas Füllkrug", times: 2, back: ["2019 von Hannover 96", "2026 von West Ham United (Leihe)"], info: "Aus der eigenen Jugend, jetzt zum dritten Mal in Bremen" },
      { name: "Torsten Frings", times: 1, back: ["2005 vom FC Bayern"], info: "Rund 5 Mio. € Ablöse für die Rückkehr" },
      { name: "Tim Borowski", times: 1, back: ["2009 vom FC Bayern"], info: "Stationen 2000–2008, 2009–2012" },
      { name: "Andreas Herzog", times: 1, back: ["1996 vom FC Bayern"], info: "Nach einer Saison in München" },
      { name: "Martin Harnik", times: 1, back: ["2018 von Hannover 96"], info: "Profidebüt bei Werder, später Stuttgart und Hannover" },
      { name: "Max Kruse", times: 1, back: ["2016 vom VfL Wolfsburg"], info: "Erste Profijahre bei Werder bis 2009" },
      { name: "Felix Wiedwald", times: 1, back: ["2015 von Eintracht Frankfurt"], info: "Torwart aus der eigenen Jugend" },
      { name: "Lennart Thy", times: 1, back: ["2017 vom FC St. Pauli"], info: "Erstes Pflichtspiel 2010 in der Champions League" },
      { name: "Davie Selke", times: 1, back: ["2020 von Hertha BSC (Leihe)"], info: "Aus der eigenen Jugend, 2015 nach Leipzig verkauft" },
    ],
  },

  titel: [
    { label: "Deutscher Meister", years: [1965, 1988, 1993, 2004] },
    { label: "DFB-Pokalsieger", years: [1961, 1991, 1994, 1999, 2004, 2009] },
    { label: "Europapokal der Pokalsieger", years: [1992] },
  ],

  torschuetzenkoenige: [
    { season: "1982/83", name: "Rudi Völler", goals: 23 },
    { season: "2003/04", name: "Aílton", goals: 28 },
    { season: "2005/06", name: "Miroslav Klose", goals: 25 },
    { season: "2022/23", name: "Niclas Füllkrug", goals: 16, note: "geteilt mit Christopher Nkunku" },
  ],
};

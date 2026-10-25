#!/usr/bin/env python3
"""Aktualisiert die Daten der laufenden Saison von FotMob.

Schreibt assets/kader.js (Kader, Spielerwerte, Spiele, Tabelle) und verlängert
in assets/verlauf.js die laufende Saison um neu gespielte Spieltage.

    python3 tools/update_fotmob.py
"""
import datetime
import json
import os
import re
import ssl
import sys
import time
import urllib.request

TEAM_ID = 8697          # SV Werder Bremen bei FotMob
LEAGUE_ID = 54          # Bundesliga
SEASON = "2026/2027"
SEASON_START = "2026-07-01"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

GROUP = {"keepers": "TW", "defenders": "AB", "midfielders": "MF", "attackers": "ST"}
# FotMob-Bezeichnung -> eigener Schlüssel
KEYS = {
    "Goals": "goals", "xG": "xg", "xGOT": "xgot", "Penalty goals": "pen_goals", "xG excl. penalty": "npxg",
    "Shots": "shots", "Shots on target": "sot", "Headed shots": "headers",
    "Assists": "assists", "xA": "xa", "Accurate passes": "acc_pass", "Pass accuracy": "pass_pct",
    "Accurate long balls": "acc_long", "Long ball accuracy": "long_pct", "Line-breaking passes": "lbp",
    "Chances created": "chances", "Big chances created": "big_chances",
    "Successful crosses": "crosses", "Cross accuracy": "cross_pct",
    "Successful dribbles": "dribbles", "Dribbles": "dribbles", "Dribble success": "dribble_pct", "Dribbles success rate": "dribble_pct",
    "Duels won": "duels", "Duels won %": "duels_pct", "Aerials won": "aerials", "Aerials won %": "aerials_pct",
    "Touches": "touches", "Touches in opposition box": "box_touches", "Dispossessed": "dispossessed",
    "Fouls won": "fouls_won", "Penalties awarded": "pen_won",
    "Defensive actions": "def_actions", "Tackles": "tackles", "Interceptions": "interceptions",
    "Blocked scoring attempt": "blocks", "Fouls committed": "fouls", "Recoveries": "recoveries",
    "Possession won final 3rd": "won_final3", "Dribbled past": "dribbled_past", "Clearances": "clearances",
    "Clean sheets": "clean_sheets", "Goals conceded while on pitch": "ga_on", "xG against while on pitch": "xga_on",
    "Penalties conceded": "pen_conceded",
    "Yellow cards": "yellow", "Red cards": "red",
    "Saves": "saves", "Save percentage": "save_pct", "Goals conceded": "conceded", "Goals prevented": "goals_prevented",
    "Penalty saves": "pen_saved", "Penalty saves %": "pen_save_pct", "Error led to goal": "errors_goal",
    "Acted as sweeper": "sweeper", "High claims": "high_claims",
}


def ssl_context():
    cafile = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    return ssl.create_default_context(cafile=cafile) if cafile else ssl.create_default_context()


def get(url, ctx):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return json.load(r)


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def r3(x):
    return None if x is None else round(x, 3)


def player_record(p, squad_info):
    grp, member = squad_info
    ml = p.get("mainLeague") or {}
    seasons = p.get("statSeasons") or []
    first = seasons[0]["tournaments"][0] if seasons and seasons[0].get("tournaments") else {}
    in_league = ml.get("leagueId") == LEAGUE_ID and ml.get("season") == SEASON
    base = {s["localizedTitleId"]: s["value"] for s in ml.get("stats", [])} if in_league else {}

    rec = {
        "id": p["id"], "name": p["name"], "pos": GROUP.get(grp, "?"),
        "num": member.get("shirtNumber"), "age": member.get("age"), "nat": member.get("cname"),
        "injured": bool(member.get("injury")),
        "apps": base.get("matches_uppercase", 0), "starts": base.get("started"),
        "mins": base.get("minutes_played", 0), "rating": num(base.get("rating")),
    }

    stats = {}
    fs = p.get("firstSeasonStats") or {}
    deep = in_league and seasons and seasons[0].get("seasonName") == SEASON and first.get("tournamentId") == LEAGUE_ID
    if deep and fs.get("statsSection"):
        for group in fs["statsSection"]["items"]:
            for it in group.get("items", []):
                key = KEYS.get(it["title"])
                val = num(it.get("statValue"))
                if key is None:
                    print("  unbekannter Wert:", it["title"], file=sys.stderr)
                    continue
                if val is None:
                    continue
                stats[key] = {"v": val, "p90": r3(it.get("per90")), "pct": r3(it.get("percentileRank"))}
    rec["s"] = stats

    sub_in = sub_out = motm = 0
    games = []
    for m in (p.get("initialMatchesPage") or {}).get("matches", []):
        if m.get("leagueId") != LEAGUE_ID or m["matchDate"]["utcTime"] < SEASON_START or not m.get("playedInMatch"):
            continue
        started = m.get("lineupPositionId") is not None
        mins = m.get("minutesPlayed") or 0
        if not started:
            sub_in += 1
        elif mins < 90 and not m.get("redCards"):
            sub_out += 1
        if m.get("playerOfTheMatch"):
            motm += 1
        rating = num((m.get("ratingProps") or {}).get("rating"))
        games.append({"date": m["matchDate"]["utcTime"][:10], "opp": m["opponentTeamName"], "home": m["isHomeTeam"],
                      "min": mins, "r": rating, "g": m.get("goals", 0), "a": m.get("assists", 0), "start": started})
    games.sort(key=lambda g: g["date"])
    if rec["starts"] is None:
        rec["starts"] = rec["apps"] - sub_in if rec["apps"] else 0
    rec.update(sub_in=sub_in, sub_out=sub_out, motm=motm, games=games)
    if rec["apps"] and len(games) != rec["apps"]:
        print(f"  Achtung {rec['name']}: {rec['apps']} Einsätze, aber {len(games)} Spiele in der Liste", file=sys.stderr)
    return rec


def update_verlauf(fixtures, werder_row):
    """Verlängert die laufende Saison in verlauf.js um neue Spieltage."""
    path = os.path.join(ROOT, "assets", "verlauf.js")
    text = open(path, encoding="utf-8").read()
    key = SEASON[:5] + SEASON[7:]  # "2026/27"
    m = re.search(r'"%s": \{ league: (\d),\n    pts: \[(.*?)\],\n    gf: \[(.*?)\],\n    ga: \[(.*?)\],\n    rank: \[(.*?)\],\n  \},' % re.escape(key), text)
    if not m:
        print("  verlauf.js: laufende Saison nicht gefunden, nichts geändert", file=sys.stderr)
        return
    ranks = [int(x) for x in m.group(5).split(",") if x.strip()]
    pts, gf, ga = [], [], []
    p = f = a = 0
    for fx in fixtures:
        if not fx["done"]:
            break
        home = fx["homeId"] == TEAM_ID
        mine, theirs = (fx["hs"], fx["as"]) if home else (fx["as"], fx["hs"])
        f += mine; a += theirs
        p += 3 if mine > theirs else 1 if mine == theirs else 0
        pts.append(p); gf.append(f); ga.append(a)
    if len(pts) < len(ranks):
        print("  verlauf.js: weniger Spiele als gespeichert, nichts geändert", file=sys.stderr)
        return
    # Zwischenstände früherer Spieltage kennt FotMob hier nicht, nur den aktuellen Platz
    while len(ranks) < len(pts):
        ranks.append(werder_row["idx"])
    block = '"%s": { league: %s,\n    pts: [%s],\n    gf: [%s],\n    ga: [%s],\n    rank: [%s],\n  },' % (
        key, m.group(1), ", ".join(map(str, pts)), ", ".join(map(str, gf)), ", ".join(map(str, ga)), ", ".join(map(str, ranks)))
    open(path, "w", encoding="utf-8").write(text[:m.start()] + block + text[m.end():])
    print(f"  verlauf.js: {len(pts)} Spieltage")


def main():
    ctx = ssl_context()
    team = get(f"https://www.fotmob.com/api/data/teams?id={TEAM_ID}&ccode3=DEU", ctx)
    squad = {}
    for g in team["squad"]["squad"]:
        if g["title"] == "coach":
            continue
        for mem in g["members"]:
            squad[mem["id"]] = (g["title"], mem)

    players = []
    for pid in squad:
        p = get(f"https://www.fotmob.com/api/data/playerData?id={pid}", ctx)
        players.append(player_record(p, squad[pid]))
        time.sleep(0.8)

    fixtures = []
    for m in team["fixtures"]["allFixtures"]["fixtures"]:
        if (m.get("tournament") or {}).get("leagueId") != LEAGUE_ID:
            continue
        st = m["status"]
        done = bool(st.get("finished"))
        fixtures.append({"date": st["utcTime"][:10], "home": m["home"]["name"], "away": m["away"]["name"],
                         "homeId": m["home"]["id"], "awayId": m["away"]["id"],
                         "hs": m["home"].get("score") if done else None, "as": m["away"].get("score") if done else None,
                         "done": done})

    tbl = team["table"][0]["data"]["table"]
    table = [{"pos": r["idx"], "name": r["shortName"], "id": r["id"], "played": r["played"], "w": r["wins"], "d": r["draws"],
              "l": r["losses"], "goals": r["scoresStr"], "diff": r["goalConDiff"], "pts": r["pts"]} for r in tbl["all"]]
    xg = {r["id"]: {"xg": r3(r["xg"]), "xga": r3(r["xgConceded"]), "xpts": r3(r["xPoints"]), "xpos": r["xPosition"]} for r in tbl.get("xg", [])}
    for row in table:
        row.update(xg.get(row["id"], {}))
    werder_row = next(r for r in tbl["all"] if r["id"] == TEAM_ID)
    coach = next((g["members"][0]["name"] for g in team["squad"]["squad"] if g["title"] == "coach"), None)

    data = {
        "source": "FotMob", "fetched": datetime.date.today().isoformat(), "season": SEASON[:5] + SEASON[7:],
        "teamId": TEAM_ID, "coach": coach, "players": players, "fixtures": fixtures, "table": table,
    }
    out = os.path.join(ROOT, "assets", "kader.js")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("// Werder Bremen – laufende Saison: Kader, Spielerwerte, Spiele und Tabelle.\n")
        fh.write("// Automatisch erzeugt von tools/update_fotmob.py aus FotMob-Daten. Nicht von Hand bearbeiten.\n")
        fh.write("window.KADER = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"  kader.js: {len(players)} Spieler, {sum(1 for p in players if p['apps'])} mit Einsatz")
    update_verlauf(fixtures, werder_row)


if __name__ == "__main__":
    main()

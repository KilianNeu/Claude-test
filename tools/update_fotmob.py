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
HSV_ID = 9790           # Hamburger SV, für das Nordderby
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
        "injured": bool(member.get("injury")), "injuryReturn": (member.get("injury") or {}).get("expectedReturn"),
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

    # Extras für den Steckbrief: Schüsse, Heatmap, Marktwert, Vertrag, Größe, Fuß
    info = {i.get("translationKey"): (i.get("value") or {}) for i in p.get("playerInformation") or []}
    rec["height"] = info.get("height_sentencecase", {}).get("numberValue")
    rec["foot"] = {"right": "rechts", "left": "links", "both": "beidfüßig"}.get(info.get("preferred_foot", {}).get("key"))
    rec["contract"] = ((p.get("contractEnd") or {}).get("utcTime") or "")[:10] or None
    rec["onLoan"] = bool((p.get("primaryTeam") or {}).get("onLoan"))
    rec["shots"] = []
    rec["heat"] = []
    if deep:
        rec["shots"] = [{"x": round(s["x"], 1), "y": round(s["y"], 1), "xg": r3(s.get("expectedGoals")), "min": s.get("min"),
                         "res": s.get("eventType"), "type": s.get("shotType"), "sit": s.get("situation")}
                        for s in fs.get("shotmap") or []]
        rec["heat"] = [[round(c["x"]), round(c["y"])] for c in ((fs.get("heatmap") or {}).get("coordinates") or [])][:500]
    rec["mv"] = [[v["date"][:10], v["value"]] for v in (p.get("marketValues") or {}).get("values", []) if v.get("value")]
    return rec


def match_record(mid, ctx):
    """Bericht zu einem Bundesliga-Spiel: Ereignisse, Momentum, Schüsse, Statistik, Aufstellungen."""
    d = get(f"https://www.fotmob.com/api/data/matchDetails?matchId={mid}", ctx)
    c = d["content"]
    head = d["header"]["teams"]
    home_id, away_id = head[0]["id"], head[1]["id"]
    mf = c.get("matchFacts") or {}
    box = mf.get("infoBox") or {}
    events = []
    for e in (mf.get("events") or {}).get("events", []):
        t = e.get("type")
        base = {"min": e.get("time"), "plus": e.get("overloadTime"), "home": e.get("isHome")}
        if t == "Goal":
            events.append(dict(base, t="goal", name=e.get("nameStr"), pid=e.get("playerId"), assist=e.get("assistInput"),
                               own=bool(e.get("ownGoal")), how=e.get("goalDescription"), score=e.get("newScore")))
        elif t == "Card":
            events.append(dict(base, t="card", name=e.get("nameStr"), pid=e.get("playerId"), card=e.get("card")))
        elif t == "Substitution" and e.get("swap"):
            events.append(dict(base, t="sub", inn=e["swap"][0].get("name"), out=e["swap"][1].get("name"), injury=bool(e.get("injuredPlayerOut"))))

    stats = {}
    for period, block in ((c.get("stats") or {}).get("Periods") or {}).items():
        rows = []
        for grp in block.get("stats", []):
            for s in grp.get("stats", []):
                vals = s.get("stats") or [None, None]
                if vals[0] is None and vals[1] is None:
                    continue
                rows.append([grp.get("title"), s.get("title"), vals[0], vals[1]])
        stats[period] = rows

    shots = [{"team": "h" if s["teamId"] == home_id else "a", "x": round(s["x"], 1), "y": round(s["y"], 1),
              "xg": r3(s.get("expectedGoals")), "min": s.get("min"), "res": s.get("eventType"), "name": s.get("playerName"),
              "pid": s.get("playerId"), "sit": s.get("situation"), "type": s.get("shotType"), "own": bool(s.get("isOwnGoal"))}
             for s in (c.get("shotmap") or {}).get("shots", [])]

    def side(t):
        if not t:
            return None
        def pl(p, starter):
            perf = p.get("performance") or {}
            lay = p.get("verticalLayout") or {}
            subs = perf.get("substitutionEvents") or []
            return {"id": p["id"], "name": p["name"], "num": p.get("shirtNumber"), "r": perf.get("rating"),
                    "x": lay.get("x"), "y": lay.get("y"), "cap": bool(p.get("isCaptain")),
                    "ev": [e.get("type") for e in perf.get("events") or []],
                    "subIn": next((e["time"] for e in subs if e.get("type") == "subIn"), None),
                    "subOut": next((e["time"] for e in subs if e.get("type") == "subOut"), None)}
        return {"name": t.get("name"), "formation": t.get("formation"), "rating": t.get("rating"),
                "age": t.get("averageStarterAge"), "value": t.get("totalStarterMarketValue"),
                "coach": (t.get("coach") or {}).get("name"),
                "starters": [pl(p, True) for p in t.get("starters") or []],
                "subs": [pl(p, False) for p in t.get("subs") or [] if (p.get("performance") or {}).get("substitutionEvents")]}

    lu = c.get("lineup") or {}
    # Werte der Werder-Spieler in diesem Spiel
    pstats = {}
    for pid, ps in (c.get("playerStats") or {}).items():
        if ps.get("teamId") != TEAM_ID:
            continue
        flat = {}
        for grp in ps.get("stats", []):
            for title, s in (grp.get("stats") or {}).items():
                st = s.get("stat") or {}
                if "value" in st:
                    flat[title] = st["value"] if "total" not in st else [st["value"], st["total"]]
        pstats[pid] = flat

    mom = [[m["minute"], m["value"]] for m in ((c.get("momentum") or {}).get("main") or {}).get("data", [])]
    w = c.get("weather") or {}
    ref = box.get("Referee") or {}
    stadium = box.get("Stadium") or {}
    potm = mf.get("playerOfTheMatch") or {}
    return {
        "id": mid, "round": d["general"].get("matchRound"), "date": d["header"]["status"]["utcTime"][:16],
        "home": head[0]["name"], "away": head[1]["name"], "homeId": home_id, "awayId": away_id,
        "hs": head[0].get("score"), "as": head[1].get("score"),
        "stadium": stadium.get("name"), "city": stadium.get("city"), "capacity": stadium.get("capacity"),
        "attendance": box.get("Attendance"), "referee": ref.get("text"),
        "weather": {"temp": w.get("temperature"), "desc": w.get("localizedKey"), "wind": w.get("windSpeed"), "rain": w.get("precipitation")} if w else None,
        "potm": {"id": potm.get("id"), "name": (potm.get("name") or {}).get("fullName"), "team": potm.get("teamId"),
                 "r": (potm.get("rating") or {}).get("num")} if potm else None,
        "events": events, "momentum": mom, "shots": shots, "stats": stats,
        "zones": c.get("attackingZones"),
        "lineup": {"home": side(lu.get("homeTeam")), "away": side(lu.get("awayTeam"))},
        "pstats": pstats,
    }


def h2h_record(mid, ctx):
    """Direkter Vergleich aus der Sicht von Werder, aus der Vorschau eines kommenden Spiels."""
    d = get(f"https://www.fotmob.com/api/data/matchDetails?matchId={mid}", ctx)
    h = (d.get("content") or {}).get("h2h") or {}
    games = []
    for m in h.get("matches", []):
        st = m.get("status") or {}
        if not st.get("finished") or not st.get("scoreStr"):
            continue
        try:
            hs, as_ = [int(x) for x in st["scoreStr"].replace(" ", "").split("-")]
        except ValueError:
            continue
        werder_home = str(m["home"]["id"]) == str(TEAM_ID)
        games.append({"date": m["time"]["utcTime"][:10], "league": (m.get("league") or {}).get("name"),
                      "home": m["home"]["name"], "away": m["away"]["name"], "hs": hs, "as": as_,
                      "w": hs if werder_home else as_, "o": as_ if werder_home else hs})
    head = d["header"]["teams"]
    opp = head[1]["name"] if head[0]["id"] == TEAM_ID else head[0]["name"]
    return {"matchId": mid, "opponent": opp, "date": d["header"]["status"]["utcTime"][:16], "home": head[0]["id"] == TEAM_ID,
            "stadium": ((d["content"].get("matchFacts") or {}).get("infoBox") or {}).get("Stadium", {}).get("name"),
            "games": games}


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
        fixtures.append({"id": m.get("id"), "date": st["utcTime"][:10], "home": m["home"]["name"], "away": m["away"]["name"],
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

    # Spielberichte aller gespielten Bundesliga-Spiele
    matches = []
    for fx in fixtures:
        if fx["done"] and fx.get("id"):
            matches.append(match_record(fx["id"], ctx))
            time.sleep(0.8)

    # Vorschau: nächstes Spiel und Nordderby gegen den HSV
    upcoming = [fx for fx in fixtures if not fx["done"] and fx.get("id")]
    previews = {}
    if upcoming:
        previews["next"] = h2h_record(upcoming[0]["id"], ctx)
    derby = next((fx for fx in upcoming if HSV_ID in (fx["homeId"], fx["awayId"])), None)
    if derby:
        previews["derby"] = previews["next"] if upcoming[0] is derby else h2h_record(derby["id"], ctx)

    # Ganze Liga: Spielplan für die Prognose
    league = get(f"https://www.fotmob.com/api/data/leagues?id={LEAGUE_ID}&ccode3=DEU", ctx)
    teams = {}
    lfix = []
    for m in league["fixtures"]["allMatches"]:
        h, a = m["home"], m["away"]
        teams[h["id"]] = h.get("shortName") or h["name"]
        teams[a["id"]] = a.get("shortName") or a["name"]
        st = m["status"]
        score = None
        if st.get("finished") and st.get("scoreStr"):
            score = [int(x) for x in st["scoreStr"].replace(" ", "").split("-")]
        lfix.append([int(m.get("round") or 0), int(h["id"]), int(a["id"]), score])

    # Werder im Ligavergleich: Wert und Rang je Teamstatistik
    team_stats = []
    for s in team["stats"].get("teams", []):
        part = s.get("participant") or {}
        stat = part.get("stat") or {}
        team_stats.append({"key": stat.get("name") or s.get("name"), "title": s.get("header"), "value": part.get("value"),
                           "rank": part.get("rank"), "top": [[t.get("name"), t.get("value")] for t in s.get("topThree") or []]})

    transfers = []
    for t in team["transfers"].get("allTransfers") or []:
        incoming = t.get("toClubId") == TEAM_ID
        fee = t.get("fee") or {}
        transfers.append({"name": t.get("name"), "pid": t.get("playerId"), "pos": (t.get("position") or {}).get("label"),
                          "date": (t.get("transferDate") or "")[:10], "in": incoming,
                          "club": t.get("fromClub") if incoming else t.get("toClub"),
                          "fee": fee.get("value"), "feeText": fee.get("feeText"), "est": t.get("amountEuroEstimated"),
                          "loan": bool(t.get("onLoan")), "ext": bool(t.get("contractExtension"))})

    venue = (team.get("overview") or {}).get("venue") or {}
    pairs = dict((venue.get("statPairs") or []))
    spiele = {"fetched": data["fetched"], "venue": {"name": (venue.get("widget") or {}).get("name"), "capacity": pairs.get("Capacity"), "opened": pairs.get("Opened")}, "matches": matches, "previews": previews, "teams": teams, "leagueFixtures": lfix,
              "teamStats": team_stats, "transfers": transfers}
    out = os.path.join(ROOT, "assets", "spiele.js")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("// Werder Bremen – laufende Saison: Spielberichte, Vorschau, Liga-Spielplan, Teamwerte und Transfers.\n")
        fh.write("// Automatisch erzeugt von tools/update_fotmob.py aus FotMob-Daten. Nicht von Hand bearbeiten.\n")
        fh.write("window.SPIELE = " + json.dumps(spiele, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"  spiele.js: {len(matches)} Spielberichte, {len(transfers)} Transfers, {len(lfix)} Ligaspiele")


if __name__ == "__main__":
    main()

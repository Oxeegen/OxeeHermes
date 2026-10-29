"""Seed an isolated Oxee Hermes home with staged demo sessions and scheduled jobs (no model calls).

    python oxeegen/scripts/functional/seed-demo-home.py <home> [--lang en|fr]

Run ``HERMES_HOME=<home> .hermes/bin/hermes pm repair`` first (the home needs its own Python
environment), then this with a Python that can import the checkout (``source ./activate``).
The API key is fake: the home exercises the UI and configuration, never a model.
"""
import argparse
import json
import os
import sqlite3
import sys
import time
import uuid
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("home")
parser.add_argument("--lang", choices=("en", "fr"), default="en")
args = parser.parse_args()

home = Path(args.home).resolve()
home.mkdir(parents=True, exist_ok=True)
os.environ["HERMES_HOME"] = str(home)
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

(home / "config.yaml").write_text(
    f"model:\n  provider: oxeegen\n  default: Oxee-max\ndisplay:\n  language: {args.lang}\n", encoding="utf-8"
)
(home / ".env").write_text("OXEEGEN_REGION=eu\nOXEEGEN_EU_API_KEY=demo-key-not-real\n", encoding="utf-8")

# The fake user folder the app is launched in (its HOME and working directory).
user = home / "user" / "Oxeegen"
for folder in ("Documents/Reports", "Documents/Invoices", "Downloads", "Pictures", "Desktop"):
    (user / folder).mkdir(parents=True, exist_ok=True)

from hermes_state import SessionDB

db = SessionDB(db_path=home / "state.db")
now = time.time()


def call(name, arguments):
    return {"id": f"call_{uuid.uuid4().hex[:12]}", "type": "function",
            "function": {"name": name, "arguments": json.dumps(arguments, ensure_ascii=False)}}


def session(title, age_min, turns):
    sid = f"demo-{uuid.uuid4().hex[:10]}"
    db.create_session(sid, "desktop", model="Oxee-max")
    db.set_session_title(sid, title)
    t = now - age_min * 60
    for turn in turns:
        t += 7
        role = turn[0]
        if role == "user":
            db.append_message(sid, "user", turn[1], timestamp=t)
        elif role == "tools":
            calls = [call(n, a) for n, a, _ in turn[1]]
            db.append_message(sid, "assistant", turn[2] if len(turn) > 2 else "", tool_calls=calls,
                              finish_reason="tool_calls", timestamp=t)
            for c, (_, _, result) in zip(calls, turn[1]):
                t += 3
                db.append_message(sid, "tool", result, tool_name=c["function"]["name"],
                                  tool_call_id=c["id"], timestamp=t)
        else:
            db.append_message(sid, "assistant", turn[1], finish_reason="stop", timestamp=t)


EN = {
    "sessions": [
        ("Competitive watch", 60 * 26, [
            ("user", "Give me a roundup of what our three main competitors announced this month."),
            ("tools", [("web_search", {"query": "SMB software product announcements October 2026"}, "8 results"),
                       ("web_extract", {"urls": ["https://example.com/press-1", "https://example.com/blog-2"]}, "2 pages extracted")]),
            ("assistant", "Here is what matters this month:\n\n- **Vendor A** launches an entry-level plan at $19/month.\n"
                          "- **Vendor B** announces a Teams integration.\n- **Vendor C** opens an office in Austin.\n\n"
                          "I can track these topics every week if you like."),
        ]),
        ("Overdue invoice reminders", 60 * 5, [
            ("user", "Draft a polite reminder email for the invoices in Invoices/ that are more than 30 days overdue."),
            ("tools", [("search_files", {"path": "~/Documents/Invoices", "pattern": "*.pdf"}, "14 files"),
                       ("execute_code", {"code": "# due dates > 30 days"}, "3 overdue invoices")]),
            ("assistant", "I found **3 invoices** more than 30 days overdue ($5,240 in total). The reminder draft is ready, "
                          "with the breakdown per customer. Do you want me to match the tone of your usual emails?"),
        ]),
        ("Team schedule", 60 * 2, [
            ("user", "Every Monday at 8 am, send me a summary of last week's sales."),
            ("tools", [("cronjob_manage", {"action": "create", "schedule": "0 8 * * 1", "name": "Weekly sales summary"},
                        "Job created: every Monday at 08:00")]),
            ("assistant", "Scheduled: **every Monday at 8 am** you will get last week's sales summary, with the gaps against target."),
        ]),
        ("Q3 report summary", 12, [
            ("user", "Read the Q3 report in Documents/Reports and give me a 5-point summary, with a table of sales by region."),
            ("tools", [("read_file", {"path": "~/Documents/Reports/q3-2026-report.pdf"}, "42 pages read"),
                       ("execute_code", {"code": "# sales by region, Q2 vs Q3"}, "table computed"),
                       ("write_file", {"path": "~/Documents/Reports/q3-summary.md"}, "file written")],
             "Reading the report and computing the change per region."),
            ("assistant",
             "Here is the summary of the **Q3 2026 report**:\n\n"
             "1. Revenue up **12%** year over year.\n"
             "2. The West drives growth, thanks to two new customers.\n"
             "3. Margin steady at 38% despite higher logistics costs.\n"
             "4. Average payment time down from 41 to 34 days.\n"
             "5. Risk: one customer now accounts for 18% of revenue.\n\n"
             "| Region | Q2 | Q3 | Change |\n|---|---:|---:|---:|\n"
             "| Northeast | $1.42M | $1.51M | +6% |\n"
             "| West | $0.88M | $1.07M | +22% |\n"
             "| South | $0.95M | $1.01M | +6% |\n"
             "| Midwest | $0.61M | $0.63M | +3% |\n\n"
             "I saved the summary as **q3-summary.md**, next to the report."),
        ]),
    ],
    "jobs": [
        ("Last week's sales summary, gaps against target.", "0 8 * * 1", "Weekly sales summary"),
        ("Watch: announcements from our three main competitors.", "0 9 * * 5", "Competitive watch"),
        ("Remind customers about invoices more than 30 days overdue.", "0 10 1 * *", "Invoice reminders"),
    ],
}

FR = {
    "sessions": [
        ("Veille concurrentielle", 60 * 26, [
            ("user", "Fais-moi une veille sur les annonces de nos trois principaux concurrents ce mois-ci."),
            ("tools", [("web_search", {"query": "annonces produits octobre 2026 logiciels PME"}, "8 résultats"),
                       ("web_extract", {"urls": ["https://exemple.com/communique-1", "https://exemple.com/blog-2"]}, "2 pages extraites")]),
            ("assistant", "Voici l'essentiel du mois :\n\n- **Acteur A** lance une offre d'entrée de gamme à 19 €/mois.\n"
                          "- **Acteur B** annonce une intégration Teams.\n- **Acteur C** ouvre un bureau à Lyon.\n\n"
                          "Je peux suivre ces sujets chaque semaine si vous voulez."),
        ]),
        ("Relance des factures impayées", 60 * 5, [
            ("user", "Prépare un mail de relance courtois pour les factures de plus de 30 jours dans Factures/."),
            ("tools", [("search_files", {"path": "~/Documents/Factures", "pattern": "*.pdf"}, "14 fichiers"),
                       ("execute_code", {"code": "# échéances > 30 jours"}, "3 factures en retard")]),
            ("assistant", "J'ai trouvé **3 factures** de plus de 30 jours (4 860 € au total). Le brouillon de relance est prêt, "
                          "avec le détail par client. Voulez-vous que je l'adapte au ton de vos échanges habituels ?"),
        ]),
        ("Planning de l'équipe", 60 * 2, [
            ("user", "Chaque lundi à 8 h, envoie-moi la synthèse des ventes de la semaine passée."),
            ("tools", [("cronjob_manage", {"action": "create", "schedule": "0 8 * * 1", "name": "Synthèse ventes hebdo"},
                        "Tâche créée : chaque lundi à 08:00")]),
            ("assistant", "C'est programmé : **chaque lundi à 8 h**, vous recevrez la synthèse des ventes de la semaine "
                          "précédente, avec les écarts par rapport à l'objectif."),
        ]),
        ("Synthèse du rapport T3", 12, [
            ("user", "Lis le rapport T3 dans Documents/Rapports et fais-moi une synthèse en 5 points, avec un tableau des ventes par région."),
            ("tools", [("read_file", {"path": "~/Documents/Rapports/rapport-T3-2026.pdf"}, "42 pages lues"),
                       ("execute_code", {"code": "# ventes par région, T2 vs T3"}, "tableau calculé"),
                       ("write_file", {"path": "~/Documents/Rapports/synthese-T3.md"}, "fichier écrit")],
             "Je lis le rapport et je calcule les écarts par région."),
            ("assistant",
             "Voici la synthèse du **rapport T3 2026** :\n\n"
             "1. Chiffre d'affaires en hausse de **12 %** sur un an.\n"
             "2. L'Ouest porte la croissance, porté par deux nouveaux clients.\n"
             "3. Marge stable à 38 % malgré la hausse des coûts logistiques.\n"
             "4. Le délai moyen de paiement passe de 41 à 34 jours.\n"
             "5. Risque : un client représente désormais 18 % du CA.\n\n"
             "| Région | T2 | T3 | Évolution |\n|---|---:|---:|---:|\n"
             "| Île-de-France | 1,42 M€ | 1,51 M€ | +6 % |\n"
             "| Ouest | 0,88 M€ | 1,07 M€ | +22 % |\n"
             "| Sud-Est | 0,95 M€ | 1,01 M€ | +6 % |\n"
             "| Nord-Est | 0,61 M€ | 0,63 M€ | +3 % |\n\n"
             "J'ai enregistré la synthèse dans **synthese-T3.md**, à côté du rapport."),
        ]),
    ],
    "jobs": [
        ("Synthèse des ventes de la semaine passée, écarts à l'objectif.", "0 8 * * 1", "Synthèse ventes hebdo"),
        ("Veille : annonces des trois principaux concurrents.", "0 9 * * 5", "Veille concurrentielle"),
        ("Relancer les factures de plus de 30 jours.", "0 10 1 * *", "Relance factures"),
    ],
}

demo = EN if args.lang == "en" else FR
for title, age, turns in demo["sessions"]:
    session(title, age, turns)

db.close()
# Sessions run in the fake user folder, not in whatever directory seeded them.
with sqlite3.connect(home / "state.db") as conn:
    conn.execute("UPDATE sessions SET cwd = ?", (str(user),))

from cron.jobs import create_job

for prompt, schedule, name in demo["jobs"]:
    create_job(prompt, schedule, name=name)
print("seeded", home)

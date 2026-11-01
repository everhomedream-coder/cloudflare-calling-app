"""
Cloudflare D1 SQL Seed Generator for Canal+ Rwanda
==================================================
Generates SQL seed scripts from the cleaned dataset for Cloudflare D1:
1. seed_tier1.sql: Top 4,633 High Priority Win-Back Leads (Quick Start)
2. seed_all.sql: Complete 45,699 subscriber dataset
"""

import os
import re
import sys
import io
import pandas as pd

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CACHE_PATH = "../draft_2_cleaned_cache.pkl"
ALT_CACHE_PATH = "draft_2_cleaned_cache.pkl"
EXCEL_PATH = "../draft 2-2026-10-30-19-24-28.xlsx"

OUTPUT_TIER1_SQL = "seed_tier1.sql"
OUTPUT_ALL_SQL = "seed_all.sql"


def clean_phone(raw_phone):
    if pd.isna(raw_phone):
        return ""
    digits = re.sub(r"\D", "", str(raw_phone))
    if digits.startswith("250") and len(digits) >= 12:
        digits = digits[3:]
    elif digits.startswith("0") and len(digits) >= 10:
        digits = digits[1:]
    return digits if len(digits) == 9 else ""


def format_display_phone(phone_9):
    if len(phone_9) == 9:
        return f"0{phone_9[:3]} {phone_9[3:6]} {phone_9[6:]}"
    return phone_9


def escape_sql(val):
    if val is None or pd.isna(val):
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"


def generate_d1_sql():
    print("[1/3] Reading source dataset...")
    if os.path.exists(CACHE_PATH):
        df = pd.read_pickle(CACHE_PATH)
    elif os.path.exists(ALT_CACHE_PATH):
        df = pd.read_pickle(ALT_CACHE_PATH)
    else:
        df = pd.read_excel(EXCEL_PATH, skiprows=11)
        df = df.loc[:, ~df.columns.str.startswith("Unnamed:")]

    df = df[df["Status"].isin(["Cancelled", "Suspended"])].copy()

    # Clean phone numbers
    df["phone_9"] = df["Account: Phone"].apply(clean_phone)
    df = df[df["phone_9"] != ""].copy()

    # Renewals and lapsed days
    df["renewal_count"] = pd.to_numeric(df["Renewal Sequence Number"], errors="coerce").fillna(0).astype(int)
    raw_days = pd.to_numeric(df["Days Left Until Renewal"], errors="coerce")
    df["days_since_lapse"] = raw_days.abs().clip(30, 3650).fillna(365).astype(int)

    # Reconnection score
    df["reconnection_score"] = (
        (df["renewal_count"].clip(0, 30) / 30.0) * 0.5 +
        (1 - df["days_since_lapse"] / 3650.0) * 0.3 +
        (df["Status"] == "Suspended").astype(float) * 0.2
    ).round(3)

    # Win-Back Tier
    def assign_tier(row):
        score = row["reconnection_score"]
        renewals = row["renewal_count"]
        days = row["days_since_lapse"]
        status = row["Status"]
        if status == "Suspended" and (score >= 0.65 or renewals >= 10) and days <= 180:
            return "Tier 1: High Priority (Call First)"
        elif status == "Suspended" and score >= 0.40:
            return "Tier 2: Moderate Priority"
        elif score >= 0.30 and renewals >= 5:
            return "Tier 3: Loyal Churned"
        else:
            return "Tier 4: Dormant"

    df["tier"] = df.apply(assign_tier, axis=1)

    # Region / City
    bld_series = df["Account: Building ID"].fillna("").astype(str)
    city_map = {"KIG": "Kigali", "RUB": "Rubavu", "MSZ": "Musanze"}
    df["city"] = bld_series.apply(
        lambda x: city_map.get(x.split("_")[0], "Rwanda") if "_" in x else "Rwanda"
    )

    df["formatted_phone"] = "+250" + df["phone_9"]
    df["display_phone"] = df["phone_9"].apply(format_display_phone)

    # Sort highest score first
    df = df.sort_values("reconnection_score", ascending=False).reset_index(drop=True)

    print(f"[2/3] Writing Tier 1 SQL ({len(df[df['tier'].str.contains('Tier 1')]):,} leads) to {OUTPUT_TIER1_SQL}...")

    def write_sql_file(sub_df, filepath):
        with open(filepath, "w", encoding="utf-8") as f:
            chunk_size = 200
            for i in range(0, len(sub_df), chunk_size):
                chunk = sub_df.iloc[i : i + chunk_size]
                f.write("INSERT INTO contacts (sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score, crm_status, account_owner, display_status) VALUES\n")
                values_list = []
                for _, r in chunk.iterrows():
                    values_list.append(
                        f"({escape_sql(r.get('Subscription: Subscription Name'))}, "
                        f"{escape_sql(r.get('Account: Account Name', 'Subscriber'))}, "
                        f"{escape_sql(r['phone_9'])}, "
                        f"{escape_sql(r['formatted_phone'])}, "
                        f"{escape_sql(r['display_phone'])}, "
                        f"{escape_sql(r.get('Offer', 'Start'))}, "
                        f"{int(r['renewal_count'])}, "
                        f"{int(r['days_since_lapse'])}, "
                        f"{escape_sql(r['city'])}, "
                        f"{escape_sql(r['tier'])}, "
                        f"{float(r['reconnection_score'])}, "
                        f"{escape_sql(r.get('Status', 'Suspended'))}, "
                        f"{escape_sql(r.get('Account: Account Owner', 'Canal_Agent'))}, "
                        f"'unseen')"
                    )
                f.write(",\n".join(values_list) + ";\n")

    tier1_df = df[df["tier"].str.contains("Tier 1")].copy()
    write_sql_file(tier1_df, OUTPUT_TIER1_SQL)
    print(f"      ✓ Successfully created {OUTPUT_TIER1_SQL} ({len(tier1_df):,} leads)")

    print(f"[3/3] Writing All Contacts SQL ({len(df):,} leads) to {OUTPUT_ALL_SQL}...")
    write_sql_file(df, OUTPUT_ALL_SQL)
    print(f"      ✓ Successfully created {OUTPUT_ALL_SQL} ({len(df):,} leads)")


if __name__ == "__main__":
    generate_d1_sql()

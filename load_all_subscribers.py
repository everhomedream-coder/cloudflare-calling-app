import os
import re
import sys
import io
import time
import subprocess
import pandas as pd

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

EXCEL_PATH = r"C:\Users\user\Downloads\canal\draft 2-2026-10-30-19-24-28.xlsx"
CHUNKS_DIR = r"c:\Users\user\Downloads\canal\cloudflare-calling-app\sql_chunks"

def clean_phone(raw_phone):
    if pd.isna(raw_phone):
        return ""
    digits = re.sub(r"\D", "", str(raw_phone))
    if digits.startswith("250") and len(digits) >= 12:
        digits = digits[3:]
    elif digits.startswith("0") and len(digits) >= 10:
        digits = digits[1:]
    return digits

def format_display_phone(p):
    if len(p) == 9:
        return f"0{p[:3]} {p[3:6]} {p[6:]}"
    elif len(p) > 0:
        return f"0{p}" if not p.startswith("0") else p
    return "--"

def escape_sql(val):
    if val is None or pd.isna(val):
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

def main():
    print("[1/5] Loading Excel data from:", EXCEL_PATH)
    t0 = time.time()
    df = pd.read_excel(EXCEL_PATH, skiprows=11)
    df = df.loc[:, ~df.columns.str.startswith("Unnamed:")]
    
    # Filter matching statuses
    df = df[df["Status"].isin(["Cancelled", "Suspended"])].copy()
    total_records = len(df)
    print(f"      Loaded {total_records:,} subscribers in {time.time() - t0:.1f}s")

    # Clean & format fields
    print("[2/5] Formatting and scoring subscribers...")
    df["phone_raw"] = df["Account: Phone"].apply(clean_phone)
    
    df["formatted_phone"] = df["phone_raw"].apply(lambda p: f"+250{p}" if len(p) == 9 else (f"+{p}" if p else "NULL"))
    df["display_phone"] = df["phone_raw"].apply(format_display_phone)

    df["renewal_count"] = pd.to_numeric(df["Renewal Sequence Number"], errors="coerce").fillna(0).astype(int)
    raw_days = pd.to_numeric(df["Days Left Until Renewal"], errors="coerce")
    df["days_since_lapse"] = raw_days.abs().clip(30, 3650).fillna(365).astype(int)

    # Win-back score
    df["reconnection_score"] = (
        (df["renewal_count"].clip(0, 30) / 30.0) * 0.5 +
        (1 - df["days_since_lapse"] / 3650.0) * 0.3 +
        (df["Status"] == "Suspended").astype(float) * 0.2
    ).round(3)

    # Tiers
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

    # City mapping
    bld_series = df["Account: Building ID"].fillna("").astype(str)
    city_map = {"KIG": "Kigali", "RUB": "Rubavu", "MSZ": "Musanze", "HUE": "Huye", "RWA": "Rwanda"}
    df["city"] = bld_series.apply(
        lambda x: city_map.get(x.split("_")[0], "Kigali" if "kigali" in x.lower() else "Rubavu" if "rubavu" in x.lower() else "Rwanda")
    )

    # Sort highest priority score first
    df = df.sort_values("reconnection_score", ascending=False).reset_index(drop=True)

    # Generate chunked SQL files
    os.makedirs(CHUNKS_DIR, exist_ok=True)
    chunk_size = 2000
    sub_chunk_size = 200
    num_chunks = (total_records + chunk_size - 1) // chunk_size

    print(f"[3/5] Generating {num_chunks} SQL chunk files ({chunk_size} rows each)...")
    chunk_files = []
    
    for c_idx in range(num_chunks):
        c_start = c_idx * chunk_size
        c_end = min(c_start + chunk_size, total_records)
        chunk_df = df.iloc[c_start:c_end]
        
        chunk_path = os.path.join(CHUNKS_DIR, f"chunk_{c_idx+1:02d}.sql")
        chunk_files.append(chunk_path)

        with open(chunk_path, "w", encoding="utf-8") as f:
            for s_idx in range(0, len(chunk_df), sub_chunk_size):
                sub_df = chunk_df.iloc[s_idx : s_idx + sub_chunk_size]
                f.write("INSERT INTO contacts (sub_id, name, phone, formatted_phone, display_phone, offer, renewal_count, days_lapsed, city, tier, reconnection_score, crm_status, account_owner, display_status) VALUES\n")
                rows_sql = []
                for _, r in sub_df.iterrows():
                    fmt_phone_val = f"'{r['formatted_phone']}'" if r['formatted_phone'] != "NULL" else "NULL"
                    rows_sql.append(
                        f"({escape_sql(r.get('Subscription: Subscription Name'))}, "
                        f"{escape_sql(r.get('Account: Account Name', 'Subscriber'))}, "
                        f"{escape_sql(r['phone_raw'])}, "
                        f"{fmt_phone_val}, "
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
                f.write(",\n".join(rows_sql) + ";\n")

    print(f"      ✓ Successfully created {len(chunk_files)} chunk files in {CHUNKS_DIR}")

    # Step 4: Clear existing contacts table
    print("[4/5] Clearing existing contacts table on remote Cloudflare D1...")
    res = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "canal-calling-db", "--remote", "--command=DELETE FROM contacts; DELETE FROM sqlite_sequence WHERE name='contacts';"],
        cwd=r"c:\Users\user\Downloads\canal\cloudflare-calling-app",
        capture_output=True,
        text=True,
        shell=True
    )
    if res.returncode != 0:
        print("Error clearing contacts:", res.stderr)
        return
    print("      ✓ Remote contacts table cleared.")

    # Step 5: Upload each chunk to Cloudflare D1
    print(f"[5/5] Executing {len(chunk_files)} SQL chunks into Cloudflare D1...")
    start_upload = time.time()
    
    for idx, c_file in enumerate(chunk_files, 1):
        c_name = os.path.basename(c_file)
        c_size_kb = os.path.getsize(c_file) / 1024
        print(f"      [{idx:02d}/{len(chunk_files)}] Uploading {c_name} ({c_size_kb:.0f} KB)...", end="", flush=True)
        
        t_chunk = time.time()
        c_res = subprocess.run(
            ["npx", "wrangler", "d1", "execute", "canal-calling-db", "--remote", f"--file={c_file}"],
            cwd=r"c:\Users\user\Downloads\canal\cloudflare-calling-app",
            capture_output=True,
            text=True,
            shell=True
        )
        
        if c_res.returncode == 0:
            print(f" Done ({time.time() - t_chunk:.1f}s)")
        else:
            print(f" FAILED!\nError: {c_res.stderr}")
            break

    total_time = time.time() - start_upload
    print(f"\n🎉 All chunks processed in {total_time:.1f}s!")

if __name__ == "__main__":
    main()


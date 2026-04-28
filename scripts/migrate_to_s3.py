#!/usr/bin/env python3
"""
migrate_to_s3.py — copy MERFISH-eyes data from local Mongo+disk to S3.

Run on the Lightsail box (where Mongo and /data/ob-moe-dulac live).

What it does, for each dataset (ob, moe):
  - Per-column .gz files: copies the file pointed to by MongoDB's
    `split_filename` field to s3://<bucket>/v1/<dataset>/cols/<column>.gz
  - Inline 'genes' record   -> v1/<dataset>/genes.json    (string array)
  - Inline 'clusters_pal'   -> v1/<dataset>/palette.json  (name -> #hex map)

Also copies bucket-root reorder.json -> v1/moe/reorder.json.

Usage:
  python3 migrate_to_s3.py --dry-run
  python3 migrate_to_s3.py
  python3 migrate_to_s3.py --dataset ob
  python3 migrate_to_s3.py --skip-reorder
"""

import argparse
import json
import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from pymongo import MongoClient

MONGO_URL = os.environ.get(
    "MONGODB_URL", "mongodb://rootuser:rootpass@localhost:27017/admin"
)
DATA_ROOT = os.environ.get("DATA_ROOT", "/data/ob-moe-dulac")
BUCKET = os.environ.get("S3_BUCKET", "ob-moe-reorder")
S3_PREFIX = "v1"
DB_NAME = "genedb-or"
USERNAME = "dulac"

INLINE_COLS = {"clusters_pal", "genes"}
DEFAULT_WORKERS = 4


def parse_genes_inline(raw: str):
    parts = [s.strip() for s in raw.split(",") if s.strip()]
    if parts and parts[0] in ("genes", "Genes"):
        parts = parts[1:]
    return parts


def parse_palette_inline(raw: str):
    out = {}
    for item in raw.split(","):
        item = item.strip()
        if not item or ":" not in item:
            continue
        key, _, val = item.partition(":")
        key = key.replace("'", "").replace('"', "").strip()
        val = val.replace("'", "").replace('"', "").strip()
        if key in ("clusters_pal", ""):
            continue
        if val.startswith("#") and len(val) >= 7:
            out[key] = val[:7]
    return out


def upload_file(s3, local_path, key, content_type, content_encoding=None):
    extra = {"ContentType": content_type}
    if content_encoding:
        extra["ContentEncoding"] = content_encoding
    s3.upload_file(str(local_path), BUCKET, key, ExtraArgs=extra)


def upload_bytes(s3, body, key, content_type):
    s3.put_object(Bucket=BUCKET, Key=key, Body=body, ContentType=content_type)


def migrate_dataset(s3, db, dataset, dry_run=False, workers=DEFAULT_WORKERS):
    print(f"\n=== {dataset} ===")
    coll = db[dataset]
    records = list(coll.find({"username": USERNAME}))
    print(f"  mongo records: {len(records)}")

    files_dir = Path(DATA_ROOT) / f"{dataset}_matrix.csv.files"
    if not files_dir.exists():
        print(f"  ERROR: missing data dir {files_dir}")
        return

    col_files = {}
    inline = {}
    for r in records:
        gene = r.get("gene", "")
        if not gene:
            continue
        if gene in INLINE_COLS:
            inline[gene] = r.get("gene_values", "")
        else:
            col_files[gene] = r.get("split_filename")

    jobs = []
    missing = []
    for col, split in col_files.items():
        if not split:
            continue
        local = files_dir / split
        if not local.exists():
            local_gz = files_dir / f"{split}.gz"
            if local_gz.exists():
                local = local_gz
            else:
                missing.append((col, split))
                continue
        key = f"{S3_PREFIX}/{dataset}/cols/{col}.gz"
        jobs.append((local, key))

    if missing:
        print(f"  WARN: {len(missing)} columns reference missing files; sample: {missing[:3]}")

    print(f"  per-column files to upload: {len(jobs)}")
    if dry_run:
        print(f"  dry-run sample keys: {[k for _, k in jobs[:3]]}")
    else:
        done = 0
        failed = 0
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {
                ex.submit(upload_file, s3, lp, k, "application/gzip", "gzip"): k
                for lp, k in jobs
            }
            for f in as_completed(futures):
                exc = f.exception()
                if exc:
                    failed += 1
                    print(f"    FAIL {futures[f]}: {exc}")
                else:
                    done += 1
                    if done % 500 == 0:
                        print(f"    {done}/{len(jobs)}")
        print(f"  per-column done: {done} ok, {failed} failed")

    if "genes" in inline:
        genes = parse_genes_inline(inline["genes"])
        print(f"  genes.json: {len(genes)} entries (sample: {genes[:3]})")
        if not dry_run:
            upload_bytes(
                s3,
                json.dumps(genes).encode("utf-8"),
                f"{S3_PREFIX}/{dataset}/genes.json",
                "application/json",
            )
    else:
        print("  WARN: no inline 'genes' record found in MongoDB")

    if "clusters_pal" in inline:
        palette = parse_palette_inline(inline["clusters_pal"])
        print(f"  palette.json: {len(palette)} entries")
        if not dry_run:
            upload_bytes(
                s3,
                json.dumps(palette, indent=2).encode("utf-8"),
                f"{S3_PREFIX}/{dataset}/palette.json",
                "application/json",
            )
    else:
        print("  WARN: no inline 'clusters_pal' record found in MongoDB")


def copy_reorder(s3, dry_run=False):
    src = "reorder.json"
    dst = f"{S3_PREFIX}/moe/reorder.json"
    print(f"\nCopy s3://{BUCKET}/{src} -> s3://{BUCKET}/{dst}")
    if dry_run:
        return
    s3.copy_object(
        Bucket=BUCKET,
        CopySource={"Bucket": BUCKET, "Key": src},
        Key=dst,
        ContentType="application/json",
        MetadataDirective="REPLACE",
    )
    print("  done")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dataset", choices=["ob", "moe", "all"], default="all")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--skip-reorder", action="store_true")
    p.add_argument("--workers", type=int, default=DEFAULT_WORKERS,
                   help=f"parallel S3 upload workers (default {DEFAULT_WORKERS})")
    args = p.parse_args()

    print(f"bucket={BUCKET}  prefix={S3_PREFIX}  data_root={DATA_ROOT}")
    print(f"mongo={MONGO_URL.split('@')[-1]}  db={DB_NAME}  user={USERNAME}")

    s3 = boto3.client("s3")
    mongo = MongoClient(MONGO_URL)
    db = mongo[DB_NAME]

    datasets = ["ob", "moe"] if args.dataset == "all" else [args.dataset]
    for d in datasets:
        migrate_dataset(s3, db, d, dry_run=args.dry_run, workers=args.workers)

    if not args.skip_reorder:
        copy_reorder(s3, dry_run=args.dry_run)

    print("\nDone.")


if __name__ == "__main__":
    main()

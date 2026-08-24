"""Collect reviewable Finance raw daily closes from public providers.

Tencent provides the candidate raw daily close. Tonghuashun verifies daily
observation coverage only: its default daily-line response is forward-adjusted
around corporate actions, so comparing its close to a raw close would be false
precision. The result is intentionally a CSV/report pair for the existing SQL
generator; it never connects to D1.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TICKER = re.compile(r"^\d{6}$")
THS_CALLBACK = re.compile(r"^[^(]+\((.*)\)\s*;?\s*$", re.DOTALL)
SOURCE = "tencent-finance+ths-verified"
USER_AGENT = "Mozilla/5.0 (compatible; catstarry-finance-operator/1.0)"


@dataclass(frozen=True)
class RawClose:
    ticker: str
    price_date: str
    close: float


def parse_day(value: str) -> str:
    candidate = value.strip()
    if not DAY.fullmatch(candidate):
        raise ValueError(f"invalid date: {value!r}")
    date.fromisoformat(candidate)
    return candidate


def market_prefix(ticker: str) -> str:
    if not TICKER.fullmatch(ticker):
        raise ValueError(f"ticker must be six digits: {ticker!r}")
    if ticker.startswith(("5", "6", "9")):
        return "sh"
    return "sz"


def fetch_text(url: str, *, referer: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Referer": referer})
    try:
        with urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8")
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f"request failed for {url}: {error}") from error


def parse_tencent_daily(ticker: str, body: str) -> list[RawClose]:
    try:
        payload = json.loads(body)
        rows = payload["data"][f"{market_prefix(ticker)}{ticker}"]["day"]
    except (KeyError, TypeError, json.JSONDecodeError) as error:
        raise ValueError(f"Tencent response has no daily rows for {ticker}") from error
    values = []
    for raw in rows:
        if not isinstance(raw, list) or len(raw) < 3:
            continue
        try:
            values.append(RawClose(ticker, parse_day(str(raw[0])), float(raw[2])))
        except (TypeError, ValueError) as error:
            raise ValueError(f"invalid Tencent daily row for {ticker}: {raw!r}") from error
    return values


def parse_ths_daily(ticker: str, body: str) -> list[RawClose]:
    match = THS_CALLBACK.match(body.strip())
    if not match:
        raise ValueError(f"Tonghuashun response is not JSONP for {ticker}")
    try:
        packed = json.loads(match.group(1)).get("data", "")
    except json.JSONDecodeError as error:
        raise ValueError(f"Tonghuashun response is invalid JSONP for {ticker}") from error
    if not isinstance(packed, str):
        raise ValueError(f"Tonghuashun response has no daily data for {ticker}")
    values = []
    for line in packed.split(";"):
        cells = line.split(",")
        if len(cells) < 5 or not cells[0]:
            continue
        try:
            day = cells[0]
            normalized_day = f"{day[:4]}-{day[4:6]}-{day[6:8]}" if re.fullmatch(r"\d{8}", day) else day
            values.append(RawClose(ticker, parse_day(normalized_day), float(cells[4])))
        except (TypeError, ValueError) as error:
            raise ValueError(f"invalid Tonghuashun daily row for {ticker}: {line!r}") from error
    return values


def coverage_checked_rows(ticker: str, tencent: list[RawClose], ths: list[RawClose], start_date: str, end_date: str) -> tuple[list[RawClose], list[str]]:
    left = {row.price_date: row.close for row in tencent if start_date <= row.price_date <= end_date}
    right = {row.price_date: row.close for row in ths if start_date <= row.price_date <= end_date}
    if not left:
        raise ValueError(f"Tencent has no daily rows in requested range for {ticker}")
    missing = sorted(set(left) - set(right))
    if missing:
        raise ValueError(f"Tonghuashun is missing {ticker} dates: {', '.join(missing)}")
    differences = [
        day for day, close in left.items()
        if not math.isfinite(close) or close <= 0 or not math.isfinite(right[day]) or right[day] <= 0 or abs(close - right[day]) > 0.0001
    ]
    return [RawClose(ticker, day, left[day]) for day in sorted(left)], sorted(differences)


def tencent_url(ticker: str, start_date: str, end_date: str) -> str:
    symbol = f"{market_prefix(ticker)}{ticker}"
    return f"https://web.ifzq.gtimg.cn/appstock/app/kline/kline?param={symbol},day,{start_date},{end_date},500,"


def ths_url(ticker: str) -> str:
    return f"https://d.10jqka.com.cn/v6/line/hs_{ticker}/01/last.js"


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect cross-checked Finance raw daily closes")
    parser.add_argument("csv_output", type=Path)
    parser.add_argument("report_output", type=Path)
    parser.add_argument("--tickers", required=True, help="Comma-separated six-digit securities")
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date", required=True)
    args = parser.parse_args()

    start_date = parse_day(args.start_date)
    end_date = parse_day(args.end_date)
    if start_date > end_date:
        raise SystemExit("start-date must be on or before end-date")
    if args.csv_output.exists() or args.report_output.exists():
        raise SystemExit("output already exists; choose new paths")
    tickers = []
    for value in args.tickers.split(","):
        ticker = value.strip()
        if not ticker:
            continue
        if ticker in tickers:
            raise SystemExit(f"duplicate ticker: {ticker}")
        try:
            market_prefix(ticker)
        except ValueError as error:
            raise SystemExit(str(error)) from error
        tickers.append(ticker)
    if not tickers:
        raise SystemExit("at least one ticker is required")

    rows = []
    coverage = {}
    try:
        for ticker in tickers:
            tencent = parse_tencent_daily(ticker, fetch_text(tencent_url(ticker, start_date, end_date), referer="https://gu.qq.com/"))
            ths = parse_ths_daily(ticker, fetch_text(ths_url(ticker), referer="https://stock.10jqka.com.cn/"))
            verified, differences = coverage_checked_rows(ticker, tencent, ths, start_date, end_date)
            rows.extend(verified)
            coverage[ticker] = {
                "rows": len(verified), "start_date": verified[0].price_date, "end_date": verified[-1].price_date,
                "close_difference_dates": differences,
                "close_difference_note": "Tonghuashun default daily close can be forward-adjusted around corporate actions; differences are review evidence, not an import rejection.",
            }
    except (RuntimeError, ValueError) as error:
        raise SystemExit(str(error)) from error

    observed_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    with args.csv_output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["ticker", "price_date", "close", "source", "adjustment", "price_status", "observed_at"])
        writer.writeheader()
        for row in sorted(rows, key=lambda item: (item.price_date, item.ticker)):
            writer.writerow({"ticker": row.ticker, "price_date": row.price_date, "close": format(row.close, ".10g"), "source": SOURCE, "adjustment": "raw", "price_status": "observed", "observed_at": observed_at})
    report = {
        "source_model": "Tencent candidate raw daily close with Tonghuashun daily coverage verification",
        "sources": {"candidate": "Tencent Finance", "coverage_verification": "Tonghuashun"},
        "source_label": SOURCE,
        "adjustment": "raw",
        "requested_range": {"start_date": start_date, "end_date": end_date},
        "close_comparison": "not an acceptance criterion because Tonghuashun default daily data is forward-adjusted around corporate actions",
        "observed_at": observed_at,
        "rows": len(rows),
        "tickers": coverage,
        "output": str(args.csv_output),
    }
    args.report_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()

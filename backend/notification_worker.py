"""PRAVAAH notification worker command entry point."""

import argparse
import logging
import time

from app.db.session import SessionLocal
from app.services.notification_worker import run_notification_cycle


def main() -> None:
    parser = argparse.ArgumentParser(description="PRAVAAH notification outbox worker")
    parser.add_argument("--once", action="store_true", help="Process one cycle and exit")
    parser.add_argument("--interval-seconds", type=int, default=30)
    args = parser.parse_args()
    if args.interval_seconds < 5:
        parser.error("--interval-seconds must be at least 5")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    while True:
        try:
            with SessionLocal() as db:
                result = run_notification_cycle(db)
            logging.getLogger(__name__).info("Notification cycle completed: %s", result)
        except Exception:
            logging.getLogger(__name__).exception("Notification worker cycle failed")
        if args.once:
            return
        time.sleep(args.interval_seconds)


if __name__ == "__main__":
    main()

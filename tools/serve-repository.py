#!/usr/bin/env python3
"""Serve the repository root over HTTP on the local network."""

from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent


def parse_args():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="TCP port to listen on (default: 8000)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    handler = partial(SimpleHTTPRequestHandler, directory=REPOSITORY_ROOT)
    server = ThreadingHTTPServer(("0.0.0.0", args.port), handler)

    print(f"Serving {REPOSITORY_ROOT} on http://0.0.0.0:{args.port}")
    print("Press Ctrl+C to stop the server.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Stage, commit, and publish automation changes with bounded retry handling."""
import argparse
import subprocess
import sys
import time


def git(*args):
    return subprocess.run(
        ["git", *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def fail(message):
    print(message, file=sys.stderr)
    return 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--branch", required=True)
    parser.add_argument("--message", required=True)
    parser.add_argument("--paths", nargs="+", required=True)
    args = parser.parse_args()

    staged = git("add", "-A", "--", *args.paths)
    if staged.returncode:
        print(staged.stderr.strip(), file=sys.stderr)
        return staged.returncode

    diff = git("diff", "--cached", "--quiet")
    if diff.returncode == 0:
        print("No changes.")
        return 0
    if diff.returncode != 1:
        print(diff.stderr.strip(), file=sys.stderr)
        return diff.returncode

    committed = git("commit", "-m", args.message)
    if committed.returncode:
        print(committed.stderr.strip(), file=sys.stderr)
        return committed.returncode
    print(committed.stdout.strip())

    for attempt in range(1, 4):
        pulled = git("pull", "--rebase", "origin", args.branch)
        if pulled.returncode:
            git("rebase", "--abort")
            print(
                f"Pull/rebase attempt {attempt} failed: "
                f"{pulled.stderr.strip() or pulled.stdout.strip()}",
                file=sys.stderr,
            )
        else:
            pushed = git("push", "origin", f"HEAD:{args.branch}")
            if pushed.returncode == 0:
                print(pushed.stdout.strip())
                return 0
            print(
                f"Push attempt {attempt} failed: "
                f"{pushed.stderr.strip() or pushed.stdout.strip()}",
                file=sys.stderr,
            )
        if attempt < 3:
            time.sleep(5)

    return fail("Could not publish automation changes after 3 attempts.")


if __name__ == "__main__":
    sys.exit(main())

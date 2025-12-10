#!/usr/bin/env python
import os
import sys
from pathlib import Path


def main():
    # Ensure the `src` directory is on the path so Django can find the project package.
    project_root = Path(__file__).resolve().parent
    sys.path.append(str(project_root / "src"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

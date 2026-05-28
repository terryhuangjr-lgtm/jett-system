#!/usr/bin/env python3
"""Krea 2 image generation script for Level Up Digital marketing.

Usage:
  python3 krea-generate.py --prompt "Your description" --aspect 16:9 --creativity medium

Options:
  --prompt TEXT       Required. What to generate.
  --aspect RATIO      1:1, 16:9, 9:16, 4:3, 3:2, 2.35:1, 4:5, 2:3 (default: 1:1)
  --creativity LEVEL  raw, low, medium, high (default: medium)
  --model VARIANT     medium or large (default: medium)
  --style-ref URL     Image URL for style reference (repeatable, max 10)
  --output FILE       Save image to this file (default: print URL)
  --wait              Poll until job completes (default: true)
"""

import os, sys, json, time, argparse, urllib.request, urllib.error

API_BASE = "https://api.krea.ai"
TOKEN = None

def get_token():
    global TOKEN
    if TOKEN:
        return TOKEN
    # Try env first, then .env file
    TOKEN = os.environ.get("KREA_API_KEY")
    if not TOKEN:
        env_paths = [
            os.path.expanduser("~/.hermes/profiles/coder/.env"),
            os.path.expanduser("~/.env"),
        ]
        for path in env_paths:
            if os.path.exists(path):
                with open(path) as f:
                    for line in f:
                        if line.startswith("KREA_API_KEY="):
                            TOKEN = line.strip().split("=", 1)[1]
                            break
        if not TOKEN:
            print("ERROR: KREA_API_KEY not found in env or .env files", file=sys.stderr)
            sys.exit(1)
    return TOKEN

def api_call(method, path, data=None):
    url = f"{API_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {get_token()}",
        "Content-Type": "application/json",
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"ERROR {e.code}: {err_body}", file=sys.stderr)
        sys.exit(1)

def poll_job(job_id, max_wait=120, interval=3):
    """Poll job until complete or failed."""
    waited = 0
    while waited < max_wait:
        result = api_call("GET", f"/jobs/{job_id}")
        status = result.get("status")
        if status == "completed":
            urls = result.get("result", {}).get("urls", [])
            return urls
        elif status in ("failed", "cancelled"):
            print(f"ERROR: Job {status}: {json.dumps(result, indent=2)}", file=sys.stderr)
            sys.exit(1)
        time.sleep(interval)
        waited += interval
    print(f"ERROR: Timed out after {max_wait}s", file=sys.stderr)
    sys.exit(1)

def download_image(url, output_path):
    """Download image from URL to local file."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        with open(output_path, "wb") as f:
            f.write(resp.read())
    return output_path

def main():
    parser = argparse.ArgumentParser(description="Generate images with Krea 2")
    parser.add_argument("--prompt", required=True, help="Image description")
    parser.add_argument("--aspect", default="1:1", choices=["1:1","16:9","9:16","4:3","3:2","2.35:1","4:5","2:3"])
    parser.add_argument("--creativity", default="medium", choices=["raw","low","medium","high"])
    parser.add_argument("--model", default="medium", choices=["medium","large"])
    parser.add_argument("--style-ref", action="append", help="Style reference image URL (repeatable)")
    parser.add_argument("--output", help="Save image to file path")
    parser.add_argument("--no-wait", action="store_true", help="Don't poll, just print job ID")

    args = parser.parse_args()

    # Build request body
    model_path = f"/generate/image/krea/krea-2/{args.model}"

    body = {
        "prompt": args.prompt,
        "aspect_ratio": args.aspect,
        "resolution": "1K",
        "creativity": args.creativity,
    }

    if args.style_ref:
        body["image_style_references"] = [
            {"url": url, "strength": 0.5} for url in args.style_ref
        ]

    # Submit job
    result = api_call("POST", model_path, body)
    job_id = result["job_id"]
    print(f"Job submitted: {job_id}")
    print(f"Status: {result['status']}")

    if args.no_wait:
        return

    # Poll for result
    print("Waiting for generation...")
    urls = poll_job(job_id)
    image_url = urls[0]
    print(f"Image URL: {image_url}")

    # Download if output path specified
    if args.output:
        local_path = download_image(image_url, args.output)
        print(f"Saved to: {local_path}")
        # Print MEDIA path for Hermes delivery
        print(f"MEDIA:{local_path}")
    else:
        print(f"\nResult URL: {image_url}")

if __name__ == "__main__":
    main()

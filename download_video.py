"""
YouTube Audio Downloader
Requires: pip install yt-dlp
Optionally: ffmpeg installed on your system (for best audio conversion)
"""

import yt_dlp
import os

# ── Configure your URLs here ──────────────────────────────────────────────────
VIDEO_URLS = [
    "https://www.youtube.com/watch?v=xMaE6toi4mk",
    "https://www.youtube.com/watch?v=2WN0T-Ee3q4",
    "https://www.youtube.com/watch?v=OMOGaugKpzs",
    "https://www.youtube.com/watch?v=E0ozmU9cJDg",
    "https://www.youtube.com/watch?v=F1mqrCTFoz4",
    "https://www.youtube.com/watch?v=wp43OdtAAkM",
    "https://www.youtube.com/watch?v=6yP1tcy9a10",
    "https://www.youtube.com/watch?v=pIgZ7gMze7A",
    "https://www.youtube.com/watch?v=N-aK6JnyFmk",
    "https://www.youtube.com/watch?v=KapHTsjh_Nw",
    "https://www.youtube.com/watch?v=s86K-p089R8",
    "https://www.youtube.com/watch?v=_r0n9Dv6XnY",
    "https://www.youtube.com/watch?v=PGNiXGX2nLU",
    
    # Add more URLs here...
]

# ── Output settings ───────────────────────────────────────────────────────────
OUTPUT_DIR = "downloads"          # Folder where audio files will be saved
AUDIO_FORMAT = "mp3"              # Options: mp3, m4a, wav, opus, flac
AUDIO_QUALITY = "192"             # kbps — e.g. "128", "192", "320"

# ─────────────────────────────────────────────────────────────────────────────

def download_audio(urls: list[str]):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    ydl_opts = {
        # Save as audio only
        "format": "bestaudio/best",
        # Output filename template: <output_dir>/<video_title>.<ext>
        "outtmpl": os.path.join(OUTPUT_DIR, "%(title)s.%(ext)s"),
        # Convert to the chosen format using ffmpeg
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": AUDIO_FORMAT,
                "preferredquality": AUDIO_QUALITY,
            }
        ],
        # Show a clean progress bar
        "quiet": False,
        "no_warnings": False,
        # Skip already-downloaded files
        "nooverwrites": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        print(f"\n{'='*55}")
        print(f"  Downloading {len(urls)} video(s) → {OUTPUT_DIR}/")
        print(f"  Format : {AUDIO_FORMAT.upper()}  |  Quality : {AUDIO_QUALITY} kbps")
        print(f"{'='*55}\n")

        results = {"success": [], "failed": []}

        for i, url in enumerate(urls, 1):
            print(f"[{i}/{len(urls)}] {url}")
            try:
                ydl.download([url])
                results["success"].append(url)
            except yt_dlp.utils.DownloadError as e:
                print(f"  ✗ Failed: {e}\n")
                results["failed"].append((url, str(e)))

        # Summary
        print(f"\n{'='*55}")
        print(f"  ✔ Success : {len(results['success'])}")
        print(f"  ✗ Failed  : {len(results['failed'])}")
        if results["failed"]:
            print("\n  Failed URLs:")
            for url, reason in results["failed"]:
                print(f"    • {url}\n      {reason}")
        print(f"{'='*55}\n")


if __name__ == "__main__":
    download_audio(VIDEO_URLS)
import sys, re, subprocess, time, json, os
from datetime import datetime
from pathlib import Path

from yt_dlp import YoutubeDL

last_perc = ""

def progress_hook(d):

    # del d["formats"]
    # print(json.dumps(d, indent=2))

    global last_perc

    # with open("hookdata.json", "w") as f:
    #     f.write(json.dumps(d, indent=2))
    # exit()
    
    if d["status"] == "downloading":

        is_audio = d["filename"][-3:] == "m4a"

        if "total_bytes" in d:
            total = d["total_bytes"]
        else:
            total = d["total_bytes_estimate"]

        percentage = str( int( round( float(d["downloaded_bytes"]) / float(total) * 100, 1) ) )
        percentage = "0" * (3 - len(percentage)) + percentage

        if percentage == last_perc or percentage < last_perc:
            return
        
        last_perc = percentage
        if percentage == 100: last_perc = 0

        msg = "audio " if is_audio else "video "

        print(msg + percentage, flush=True, end="")

    # if d["status"] == "finished":
    #     print("finished", flush=True, end="")


ydl_opts = {
    "ignoreerrors": True,
    "format": "bestvideo+bestaudio",
    "restrictfilenames": True,
    "outtmpl": "videos/%(title)s.%(ext)s",
    "quiet": True,
    "no_warnings": True,
    "verbose": False,
    "progress_hooks": [progress_hook],
    "noprogress": True,
    "postprocessor_args": {
        "ffmpeg": ["-v", "error"]
    }
    # "requested_formats": "mp4"
}
dl_opts = {
    "outtmpl": "videos/%(title)s.%(ext)s",
    "quiet": True,
    "no_warnings": True,
    "progress_hooks": [progress_hook]
}


# Convert .mkv to .mp4 with ffmpeg
def convertMKV(fn):

    filebase = ".".join(fn.split(".")[:-1])

    if Path(filebase + ".mkv").is_file():
        subprocess.Popen(f"ffmpeg -hide_banner -loglevel warning -i {filebase + '.mkv'} -map 0 -c copy -c:a aac {filebase + '.mp4'} && del {filebase + '.mkv'}".split(" "), shell=True)
        # print("file " + os.getcwd() + filebase + ".mp4", flush=True, end="")
        print(f"file {os.getcwd()}\{filebase}.mp4", flush=True, end="")
    else:
        # print("file " + os.getcwd() + fn, flush=True, end="")
        print(f"file {os.getcwd()}\{fn}", flush=True, end="")



t = datetime.now()
url = sys.argv[1]


# test if link is youtube link
if sum(1 for _ in re.compile(r"youtu\.?be").finditer(url)) > 0:
    dl = YoutubeDL(ydl_opts) # youtube downloader
else:
    dl = YoutubeDL(dl_opts) # generic downloader


# extract data (title)
data = dl.sanitize_info(dl.extract_info(url, download=False))
#print(f"{int(data['duration'] / 60)}min {data['duration'] % 60}s")
title = data.get('title')
site = data.get('extractor')

# with open("log", "a") as f:
#     f.write(f"[{data.get('extractor')}] {title} URL: {url}\n")

info = {
    "duration": data.get("duration"),
    "title": data.get("title"),
    "origin": data.get("extractor_key"),
    "thumbnail": data.get("thumbnails")[-1]["url"],
    "uploader": data.get("uploader"),
    "view_count": data.get("view_count"),
    "like_count": data.get("like_count"),
    "description": data.get("description")
}

print(f"info {json.dumps(info)}", flush=True, end="")
time.sleep(0.5)
# with open("data.json", "w") as f:
#     f.write(json.dumps(data, indent=2))


# download, convert if output is .mkv file
dl.download([url])
filen = dl.prepare_filename(data)
convertMKV(filen)


# diff = (datetime.now() - t)
# secs = diff.seconds + int(diff.microseconds * 0.00001) * 0.01

# print info
#print(f"\033[32m[{secs}s]\033[0m {title}")
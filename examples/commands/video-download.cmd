GOTO https://example-video-site.com

WAIT video
WAIT .download-button

CLICK .download-button
WAITLOAD

FETCH https://cdn.example.com/video.mp4
DOWNLOAD https://cdn.example.com/video.mp4 ./downloads/video.mp4

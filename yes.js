// This code assumes you have an HTML file with an input element with id="file-input" and a video element with id="video-output"

// Get the file input and video output elements
const fileInput = document.getElementById("file-input");
const videoOutput = document.getElementById("video-output");

// Create a function to convert a video file to webm format using ffmpeg.wasm
async function convertToWebm(file) {
  // Load ffmpeg.wasm
  const ffmpeg = FFmpeg.createFFmpeg({ log: true });
  await ffmpeg.load();

  // Write the file to the memory
  ffmpeg.FS("writeFile", "input.mp4", await fetchFile(file));

  // Run the conversion command with the webm settings
  await ffmpeg.run(
    "-i",
    "input.mp4",
    "-c:v",
    "libvpx",
    "-crf",
    "10",
    "-b:v",
    "1M",
    "-c:a",
    "libvorbis",
    "output.webm"
  );

  // Read the output file from the memory
  const data = ffmpeg.FS("readFile", "output.webm");

  // Create a URL for the output file
  const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/webm" }));

  // Return the URL
  return url;
}

// Create a function to apply the crush and stretch effect to the video based on the audio volume
function applyEffect(video) {
  // Get the audio context and create an analyser node
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();

  // Create a media source and connect it to the video element
  const mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);

  // Create a source buffer and append the webm data to it
  mediaSource.addEventListener("sourceopen", () => {
    const sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp8"');
    sourceBuffer.appendBuffer(webmData);
  });

  // Create a media element source and connect it to the analyser node
  const mediaElementSource = audioContext.createMediaElementSource(video);
  mediaElementSource.connect(analyser);

  // Get the canvas element and its context
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // Set the canvas size to match the video size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw the video frame on the canvas with the effect applied
  function draw() {
    // Get the frequency data from the analyser node
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    // Calculate the average volume
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      sum += frequencyData[i];
    }
    const averageVolume = sum / frequencyData.length;

    // Map the average volume to a scale factor between 0.5 and 1.5
    const scaleFactor = averageVolume / 128 + 0.5;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the video frame on the canvas with the scale factor applied
    ctx.drawImage(
      video,
      (canvas.width - canvas.width * scaleFactor) / 2,
      (canvas.height - canvas.height * scaleFactor) / 2,
      canvas.width * scaleFactor,
      canvas.height * scaleFactor
    );

    // Request the next animation frame
    requestAnimationFrame(draw);
  }

  // Start drawing when the video is ready
  video.addEventListener("canplay", () => {
    draw();
  });
}

// Add an event listener for when a file is selected
fileInput.addEventListener("change", async () => {
  // Get the selected file
  const file = fileInput.files[0];

  // Convert the file to webm format and store the data in a global variable
  webmData = await convertToWebm(file);

  // Apply the effect to the video output element
  applyEffect(videoOutput);
});

const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const audioPlayer = document.getElementById('audioPlayer');
const downloadButton = document.getElementById('downloadButton');

let mediaRecorder;
let recordedChunks = [];

recordButton.addEventListener('click', () => {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      recordButton.disabled = true;
      stopButton.disabled = false;

      mediaRecorder.addEventListener('dataavailable', event => {
        recordedChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
  const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
  const audioURL = URL.createObjectURL(audioBlob);
  audioPlayer.src = audioURL;

  const audioContext = new AudioContext();
  fetch(audioURL)
    .then(response => response.arrayBuffer())
    .then(data => audioContext.decodeAudioData(data))
    .then(audioBuffer => {
      const wavBlob = convertToWav(audioBuffer);
      const wavURL = URL.createObjectURL(wavBlob);
      downloadButton.href = wavURL;
      downloadButton.download = `audio-${new Date().toISOString()}.wav`;
    });

  recordedChunks = [];
  downloadButton.disabled = false;
});
    })
    .catch(error => {
      console.error('Error accessing audio:', error);
    });
});



downloadButton.addEventListener('click', () => {
  // The download link is already set in the 'stop' event listener, so we don't need to do anything here.
});



stopButton.addEventListener('click', () => {
  mediaRecorder.stop();
  recordButton.disabled = false;
  stopButton.disabled = true;
});

downloadButton.addEventListener('click', () => {
  const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
  const audioURL = URL.createObjectURL(audioBlob);
  const link = document.createElement('a');
  link.href = audioURL;
  link.download = `audio-${new Date().toISOString()}.webm`;
  link.click();
});

function convertToWav(audioBuffer) {
  const numOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length * numOfChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, numOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  const data = new Float32Array(audioBuffer.getChannelData(0));
  for (let i = 0; i < data.length; i++) {
    const multiplier = Math.min(1, Math.max(-1, data[i]));
    view.setInt16(44 + i * 2, multiplier < 0 ? multiplier * 0x8000 : multiplier * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}




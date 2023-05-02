const recordButton = document.getElementById('recordButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const audioPlayer = document.getElementById('audioPlayer');
const downloadButton = document.getElementById('downloadButton');
const patientNameInput = document.getElementById('patientName');
const status = document.getElementById('status');

let mediaRecorder;
let recordedBlobs = [];
let stream;
let wakeLock = null;

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_TIME${hours}-${minutes}-${seconds}`;
}

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    mediaRecorder.addEventListener('dataavailable', event => {
      recordedBlobs.push(event.data);
    });
    mediaRecorder.addEventListener('stop', async () => {
      const audioBlob = new Blob(recordedBlobs, { type: 'audio/webm' });
      const audioURL = URL.createObjectURL(audioBlob);
      audioPlayer.src = audioURL;

      const patientName = patientNameInput.value.trim() || 'Unnamed';
      const timestamp = formatTimestamp(new Date());
      const filename = `${patientName}_${timestamp}.wav`;

      const audioContext = new AudioContext();
      const response = await fetch(audioURL);
      const data = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(data);
      const wavBlob = convertToWav(audioBuffer);
      const wavURL = URL.createObjectURL(wavBlob);
      downloadButton.href = wavURL;
      downloadButton.download = filename;

      downloadButton.style.display = 'inline';

      recordedBlobs = [];

      status.textContent = 'Stopped';
      status.style.color = 'gray';
      status.classList.remove('blinking');
    });

    status.textContent = 'Recording';
    status.style.color = 'red';
    status.classList.add('blinking');
  } catch (error) {
    console.error('Error starting recording:', error);
    status.textContent = 'Error';
    status.style.color = 'red';
  }
}


recordButton.addEventListener('click', () => {
  startRecording();
  recordButton.disabled = true;
  stopButton.disabled = false;
  pauseButton.disabled = false;
  pauseButton.textContent = 'Pause';
  status.textContent = 'Recording';
  status.style.color = 'red';
  status.classList.add('blinking');
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (error) {
    console.error('Error requesting wake lock:', error);
  }
});

stopButton.addEventListener('click', () => {
  mediaRecorder.stop();
  stream.getTracks().forEach(track => track.stop());
  recordButton.disabled = false;
  stopButton.disabled = true;
  pauseButton.disabled = true;
  status.textContent = 'Stopped';
  status.style.color = 'gray';
  status.classList.remove('blinking');
    if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
});



pauseButton.addEventListener('click', () => {
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    pauseButton.textContent = 'Resume';
    status.textContent = 'Paused';
    status.style.color = 'gray';
    status.classList.remove('blinking');
  } else if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    pauseButton.textContent = 'Pause';
    status.textContent = 'Recording';
    status.style.color = 'red';
    status.classList.add('blinking');
  }
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

  const channelData = new Float32Array(audioBuffer.length * numOfChannels);
  for (let channel = 0; channel < numOfChannels; channel++) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      channelData[i * numOfChannels + channel] = data[i];
    }
  }

  for (let i = 0; i < channelData.length; i++) {
    const multiplier = Math.min(1, Math.max(-1, channelData[i]));
    view.setInt16(44 + i * 2, multiplier < 0 ? multiplier * 0x8000 : multiplier * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

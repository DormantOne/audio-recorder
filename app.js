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
        recordedChunks = [];
        downloadButton.disabled = false;
      });
    })
    .catch(error => {
      console.error('Error accessing audio:', error);
    });
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

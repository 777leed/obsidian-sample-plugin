import { App, Modal, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

interface MyPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default'
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'open-recording-modal',
      name: 'Open Recording Modal',
      callback: () => {
        new RecordingModal(this.app).open();
      }
    });

    this.addSettingTab(new SampleSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class RecordingModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;

    const textDiv = contentEl.createDiv();
    textDiv.addClass('recording-text');
    textDiv.setText('Press Record to start');
    textDiv.style.textAlign = 'center';
    textDiv.style.marginBottom = '20px';

    const recordButton = contentEl.createEl('button', { text: 'Record' });
    recordButton.addClass('record-button');
    recordButton.style.display = 'block';
    recordButton.style.margin = '0 auto';

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let isRecording = false;

    recordButton.onClickEvent(() => {
      if (isRecording) {
        mediaRecorder?.stop();
        isRecording = false;
        textDiv.setText('Recording stopped.');
        recordButton.setText('Record');
      } else {
        isRecording = true;
        textDiv.setText('Recording...');
        recordButton.setText('Stop');

        audioChunks = [];
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
              }
            };
            mediaRecorder.onstop = async () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
              this.saveAudioToFile(audioBlob); // Save audio to file
            };
            mediaRecorder.start();
          })
          .catch((error) => {
            console.error('Error accessing microphone:', error);
          });
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  async saveAudioToFile(audioBlob: Blob) {
    const desktopDirectory = 'C:\\Users\\hp\\Desktop';  // Change this to your desired directory
    const audioFilePath = path.join(desktopDirectory, 'recorded-audio.wav');

    try {
      const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
      fs.writeFileSync(audioFilePath, audioBuffer);
      this.contentEl.createEl('p').setText('Recording saved to desktop.');
    } catch (error) {
      console.error('Error saving audio:', error);
      this.contentEl.createEl('p').setText('Error saving recording.');
    }
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Setting #1')
      .setDesc("It's a secret")
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));
  }
}

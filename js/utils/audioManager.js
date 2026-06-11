// js/utils/audioManager.js
import { store, updateStore } from '../store.js';

let audioUnlocked = false;

const getAudioElements = () => ({
  bgm: document.getElementById('bgm-audio'),
  correct: document.getElementById('effect-correct'),
  skip: document.getElementById('effect-skip')
});

/**
 * 首次触摸解锁音频上下文
 * 必须绑定在 document 的 click/touchstart 事件上
 */
export function unlockAudioOnFirstTouch() {
  if (audioUnlocked) return;
  
  const { bgm, correct, skip } = getAudioElements();
  // 播放并立即暂停，以骗过浏览器的安全策略
  [bgm, correct, skip].forEach(audio => {
    if (audio) {
      audio.volume = 0; // 静音播放
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          audio.pause();
          audio.volume = 1; // 恢复音量
        }).catch(() => {});
      }
    }
  });
  
  audioUnlocked = true;
}

export function toggleMute() {
  const newMutedState = !store.app.isMuted;
  updateStore('app', { isMuted: newMutedState });
  
  const { bgm, correct, skip } = getAudioElements();
  [bgm, correct, skip].forEach(audio => {
    if (audio) audio.muted = newMutedState;
  });

  return newMutedState;
}

export function playBGM() {
  const { bgm } = getAudioElements();
  if (!bgm || store.app.isMuted) return;
  bgm.currentTime = 0;
  bgm.play().catch(e => console.warn('BGM 播放被阻止:', e));
}

export function stopBGM() {
  const { bgm } = getAudioElements();
  if (!bgm) return;
  bgm.pause();
}

/**
 * 播放指定音效，供其他成员在手势或按钮事件中调用
 * @param {'correct' | 'skip'} type 
 */
export function playEffect(type) {
  const elements = getAudioElements();
  const audio = elements[type];
  if (!audio || store.app.isMuted) return;
  
  audio.currentTime = 0; // 允许连续快速播放
  audio.play().catch(e => console.warn(`音效 ${type} 播放被阻止:`, e));
}
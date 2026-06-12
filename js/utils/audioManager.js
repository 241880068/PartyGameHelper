// js/utils/audioManager.js
import { store, updateStore } from '../store.js';

let audioUnlocked = false;

// 当前正在播放的 BGM 类型（'werewolf' | 'undercover' | 'charades' | null）
let currentBGMType = null;

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
  
  const { correct, skip } = getAudioElements();
  // 背景音乐由当前点击事件直接播放，这里只预解锁短音效。
  [correct, skip].forEach(audio => {
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
  console.log('[Audio] 音频上下文已解锁');
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

/**
 * 播放指定游戏的背景音乐
 * @param {'werewolf' | 'undercover' | 'charades'} gameType - 游戏类型
 */
export function playBGM(gameType) {
  const { bgm } = getAudioElements();
  if (!bgm) {
    console.warn('[Audio] bgm-audio 元素不存在');
    return;
  }

  // 同一首音乐如果曾被浏览器暂停，则在新的用户操作中重试播放。
  if (currentBGMType === gameType) {
    if (!store.app.isMuted && bgm.paused) {
      bgm.play().catch(e => console.warn('[Audio] BGM 重试播放被阻止:', e.message));
    }
    return;
  }

  // 根据游戏类型选择音乐文件
  const musicMap = {
    werewolf: './music/发牌.mp3',
    undercover: './music/发牌.mp3',
    charades: './music/你划我猜.mp3',
  };
  const src = musicMap[gameType];
  if (!src) return;

  console.log(`[Audio] 切换 BGM 到: ${src}`);

  // 方法：直接设置 audio.src 属性（比操作 source 元素更可靠）
  bgm.src = src;
  bgm.loop = true;
  bgm.currentTime = 0;

  // 如果已静音，不播放
  if (store.app.isMuted) {
    currentBGMType = gameType;
    return;
  }

  // 尝试播放
  const playPromise = bgm.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log(`[Audio] BGM 播放成功: ${src}`);
      })
      .catch(e => {
        console.warn(`[Audio] BGM 播放被阻止:`, e.message);
        // 播放失败时，记录类型但不标记为已播放，下次用户交互时可重试
      });
  }

  currentBGMType = gameType;
}

export function stopBGM() {
  const { bgm } = getAudioElements();
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
  currentBGMType = null;
  console.log('[Audio] BGM 已停止');
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

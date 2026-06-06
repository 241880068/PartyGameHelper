// store.js
const state = {
  // ==========================================
  // 1. 全局应用状态 (Global App State)
  // ==========================================
  app: {
    activePage: 'home',        // 当前所在页面: 'home' | 'werewolf' | 'undercover' | 'charades'
    isGestureEnabled: true,    // 设备陀螺仪是否可用（用于决定是否降级显示虚拟按钮）
    deviceOrientation: null,   // 当前手机姿态 (备用，也可直接在gesture.js中处理)
  },

  // ==========================================
  // 2. 狼人杀状态 (Werewolf State)
  // ==========================================
  werewolf: {
    status: 'idle',            // 游戏状态: 'idle'(未开始) | 'dealing'(发牌中) | 'finished'(发牌结束)
    totalPlayers: 0,           // 玩家总人数
    rolesConfig: {},           // 角色配置，如 { '狼人': 2, '平民': 3, '预言家': 1 }
    assignedRoles: [],         // C同学生成的洗牌后数组: ['平民', '狼人', '预言家', '平民', '平民', '狼人']
    currentPlayerIndex: 0,     // 当前手机传递到第几个人手中 (0-based)
  },

  // ==========================================
  // 3. 谁是卧底状态 (Undercover State)
  // ==========================================
  undercover: {
    status: 'idle',            // 游戏状态: 'idle' | 'dealing' | 'finished'
    totalPlayers: 0,           // 玩家总人数
    words: {                   // 本局抽中的词汇 [cite: 2]
      civilian: '',            // 平民词
      undercover: ''           // 卧底词
    }, 
    assignedWords: [],         // 洗牌后的发牌数组: ['苹果', '苹果', '梨', '苹果']
    currentPlayerIndex: 0,     // 当前发牌到第几个人
  },

  // ==========================================
  // 4. 你划我猜状态 (Charades State)
  // ==========================================
  charades: {
    status: 'idle',            // 游戏状态: 'idle' | 'playing' | 'ended'
    wordList: [],              // 本局题库: ['洗衣机', '大象', '周杰伦'] [cite: 2]
    currentIndex: 0,           // 当前正在猜第几个词
    score: 0,                  // 当前得分 
    correctWords: [],          // 猜对的词汇（用于游戏结束后展示）
    passedWords: [],           // 跳过的词汇
  }
};
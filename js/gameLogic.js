// 期望 C 同学实现的接口
export function startNewGame(gameType) { /* 初始化游戏数据、洗牌、重置分数 */ }
export function handleCharadesAnswer(isCorrect) { /* 根据对错更新 store.charades 的分数和索引 */ }
export function drawNextRole() { /* 狼人杀/谁是卧底 抽取下一张牌 */ }
// js/main.js

// 1. 引入由 A同学(你) 维护的全局状态管理器
import { store, subscribe } from './store.js';

// 2. 引入 B同学 的手势模块 和 C同学 的游戏逻辑模块
// 💡 提示：在团队联调前，确保这两个文件在对应路径下存在（即使里面是空函数也不会报错）
import { initGestureRecognition } from './gesture.js';
import { startNewGame, handleCharadesAnswer } from './gameLogic.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 核心模块一：单页面路由引擎 (Routing Engine)
    // ==========================================
    const navButtons = document.querySelectorAll('button[data-target]');
    const pages = document.querySelectorAll('.page');

    /**
     * 页面切换主函数
     * @param {string} targetPageId - 目标页面的 DOM ID (例如: 'werewolf-page')
     */
    function navigateTo(targetPageId) {
        // 第一步：隐藏所有页面
        pages.forEach(page => page.classList.remove('active'));

        // 第二步：显示目标页面
        const targetPage = document.getElementById(targetPageId);
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            console.error(`[路由错误] 找不到 ID 为 ${targetPageId} 的页面`);
            return;
        }

        // 第三步：同步更新全局状态 Store
        const routeName = targetPageId.replace('-page', ''); 
        store.app.activePage = routeName;
        console.log(`[路由更新] 当前所在页面: ${store.app.activePage}`);

        // 第四步：如果进入的是游戏页面，自动触发游戏初始化
        if (routeName !== 'home') {
            handleGamePageInit(routeName);
        }
    }

    // 为所有带有 data-target 属性的按钮（主菜单按钮、返回按钮）绑定点击事件
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const targetPageId = event.currentTarget.getAttribute('data-target');
            navigateTo(targetPageId);
        });
    });


    // ==========================================
    // 核心模块二：游戏初始化分发 (Game Initializer)
    // ==========================================
    /**
     * 当路由切入具体游戏时，负责通知 C同学 初始化数据
     * @param {string} gameType - 游戏类型 ('werewolf' | 'undercover' | 'charades')
     */
    function handleGamePageInit(gameType) {
        console.log(`[游戏逻辑分发] 正在初始化游戏: ${gameType}`);
        if (typeof startNewGame === 'function') {
            startNewGame(gameType); // 调用C同学的接口
        } else {
            console.warn('⚠️ C同学的 startNewGame 逻辑暂未加载，当前使用跳过数据初始化。');
        }
    }


    // ==========================================
    // 核心模块三：动态数据渲染器 (Reactive UI Renderer)
    // ==========================================
    // 提前获取未来需要动态更新的 DOM 元素（这些元素将由 D同学 在 HTML 中具体实现）
    const charadesScoreDisplay = document.querySelector('#charades-page .score');
    const charadesWordDisplay = document.querySelector('#charades-page .current-word');
    
    const werewolfStatusDisplay = document.querySelector('#werewolf-page .game-content');
    const undercoverStatusDisplay = document.querySelector('#undercover-page .game-content');

    // 使用我们设计好的 subscribe 机制，只要 Store 里的数据变了，这里就会自动执行更新 UI
    subscribe((property, value) => {
        console.log(`[状态响应] 检测到 Store 属性【${property}】发生改变`);

        // 3.1 处理「你划我猜」数据变化
        if (property === 'charades') {
            if (charadesScoreDisplay) {
                charadesScoreDisplay.textContent = `当前得分: ${value.score}`;
            }
            if (charadesWordDisplay) {
                const currentWord = value.wordList[value.currentIndex] || '游戏结束';
                charadesWordDisplay.textContent = currentWord;
            }
        }

        // 3.2 处理「狼人杀」分发牌进度展示
        if (property === 'werewolf') {
            if (werewolfStatusDisplay) {
                if (value.status === 'dealing') {
                    werewolfStatusDisplay.textContent = `请将手机传递给第 ${value.currentPlayerIndex + 1} 位玩家，向上翻转手机查看身份`;
                } else if (value.status === 'finished') {
                    werewolfStatusDisplay.textContent = '🎉 所有身份发放完毕，请开始口述发言！';
                }
            }
        }

        // 3.3 处理「谁是卧底」分发词语进度展示
        if (property === 'undercover') {
            if (undercoverStatusDisplay) {
                if (value.status === 'dealing') {
                    undercoverStatusDisplay.textContent = `请将手机传递给第 ${value.currentPlayerIndex + 1} 位玩家，向上翻转手机查看词语`;
                } else if (value.status === 'finished') {
                    undercoverStatusDisplay.textContent = '🎉 所有词语分发完毕，开始找出卧底！';
                }
            }
        }
    });


    // ==========================================
    // 核心模块四：手势输入与业务逻辑集成 (Integration Hub)
    // ==========================================
    // 在这里将 B同学 的物理手势与 C同学 的核心玩法规则完美粘合
    if (typeof initGestureRecognition === 'function') {
        initGestureRecognition({
            // 物理手势 A：手机向上翻（>45°）-> 代表 “正确 / 同意 / 下一个 / 查看”
            onSwipeUp: () => {
                console.log('【物理手势触发】手机上翻 ↑');
                const currentPage = store.app.activePage;

                // 区分场景处理：
                // 1. 如果你在玩「你划我猜」
                if (currentPage === 'charades' && store.charades.status === 'playing') {
                    if (typeof handleCharadesAnswer === 'function') {
                        handleCharadesAnswer(true); // 答对：通知C同学加分并切词
                    }
                } 
                // 2. 如果你在玩「狼人杀」传阅身份阶段
                else if (currentPage === 'werewolf' && store.werewolf.status === 'dealing') {
                    console.log(`[通知UI] 翻转卡片，展示第 ${store.werewolf.currentPlayerIndex + 1} 个人的身份`);
                    // 这里可以调用 D同学 的卡片翻转动效类名，例如 card.classList.add('flipped');
                }
            },

            // 物理手势 B：手机向下翻（>45°）-> 代表 “跳过 / 不同意 / 重新发牌 / 隐藏”
            onSwipeDown: () => {
                console.log('【物理手势触发】手机下翻 ↓');
                const currentPage = store.app.activePage;

                // 区分场景处理：
                if (currentPage === 'charades' && store.charades.status === 'playing') {
                    if (typeof handleCharadesAnswer === 'function') {
                        handleCharadesAnswer(false); // 跳过：通知C同学切词但不加分
                    }
                }
                else if (currentPage === 'werewolf' && store.werewolf.status === 'dealing') {
                    console.log(`[通知UI] 卡片盖回，隐藏身份，准备传递给下一个人`);
                }
            }
        });
        console.log("✅ 【集成功夫】手势识别与多游戏业务逻辑成功挂载！");
    } else {
        console.warn("⚠️ B同学的手势模块暂未导出，当前处于键盘模拟/虚拟按钮调试模式。");
    }

    console.log("🚀 聚会发牌助手主框架（A部分）全部加载完毕，等待联调！");
});
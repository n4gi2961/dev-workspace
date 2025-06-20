import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DNBTrial,
  DNBGameState,
  SessionStats,
  GridPosition,
  ResponseType,
  DNBSessionData,
  DNB_GAME_STATES
} from '../types/dnb';
import { DNB_CONFIG } from '../constants/dnb';

interface UseDNBGameProps {
  nLevel: number;
  onSessionComplete: (sessionData: DNBSessionData) => void;
}

interface UseDNBGameReturn {
  gameState: DNBGameState;
  currentTrial: DNBTrial | null;
  currentTrialIndex: number;
  showStimulus: boolean;
  sessionStats: SessionStats;
  feedback: 'correct' | 'incorrect' | null;
  countdown: number;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  stopGame: () => void;
  handleResponse: (responseType: ResponseType) => void;
  canRespond: boolean;
}

export const useDNBGame = ({
  nLevel,
  onSessionComplete
}: UseDNBGameProps): UseDNBGameReturn => {
  // ゲーム状態
  const [gameState, setGameState] = useState<DNBGameState>(DNB_GAME_STATES.MENU);
  const [trials, setTrials] = useState<DNBTrial[]>([]);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [showStimulus, setShowStimulus] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [countdown, setCountdown] = useState(0);

  // セッション統計
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    correctPositions: 0,
    correctNumbers: 0,
    correctBoth: 0,
    correctNeither: 0,
    falsePositives: 0,
    misses: 0,
    totalResponseTime: 0,
    responseCount: 0
  });

  // タイマー参照
  const stimulusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 現在の試行
  const currentTrial = trials[currentTrialIndex] || null;
  const canRespond = currentTrialIndex >= nLevel && gameState === DNB_GAME_STATES.INTERVAL;

  // 試行生成関数
  // 異なる位置を生成するヘルパー関数
  const generateDifferentPosition = useCallback((excludePosition: GridPosition): GridPosition => {
    let newPosition: GridPosition;
    do {
      newPosition = {
        row: Math.floor(Math.random() * DNB_CONFIG.GRID_SIZE),
        col: Math.floor(Math.random() * DNB_CONFIG.GRID_SIZE)
      };
    } while (newPosition.row === excludePosition.row && newPosition.col === excludePosition.col);
    return newPosition;
  }, []);

  // 異なる数字を生成するヘルパー関数
  const generateDifferentNumber = useCallback((excludeNumber: number): number => {
    let newNumber: number;
    do {
      newNumber = Math.floor(Math.random() * 9) + 1;
    } while (newNumber === excludeNumber);
    return newNumber;
  }, []);

  // 試行データ生成（新しいロジック）
  const generateTrials = useCallback((level: number): DNBTrial[] => {
    const totalTrials = DNB_CONFIG.BASE_TRIALS + level;
    const generatedTrials: DNBTrial[] = [];

    for (let i = 0; i < totalTrials; i++) {
      if (i < level) {
        // 最初のN個はランダム生成（参照する過去がない）
        const position: GridPosition = {
          row: Math.floor(Math.random() * DNB_CONFIG.GRID_SIZE),
          col: Math.floor(Math.random() * DNB_CONFIG.GRID_SIZE)
        };
        const number = Math.floor(Math.random() * 9) + 1;

        const trial: DNBTrial = {
          position,
          number,
          index: i,
          positionMatch: false,
          numberMatch: false,
          userResponse: {
            position: null,
            number: null,
            both: null,
            neither: null,
            responseTime: null
          },
          timestamp: Date.now()
        };
        generatedTrials.push(trial);
      } else {
        // N個目以降：先に正答パターンを決定
        const nBackTrial = generatedTrials[i - level];
        
        // 正答パターンをランダム決定（新しい確率分布）
        const rand = Math.random();
        let answerType: 'both' | 'position' | 'number' | 'neither';
        
        if (rand < DNB_CONFIG.BOTH_MATCH_PROBABILITY) {
          answerType = 'both';      // 10%
        } else if (rand < DNB_CONFIG.BOTH_MATCH_PROBABILITY + DNB_CONFIG.POSITION_MATCH_PROBABILITY) {
          answerType = 'position';  // 30%
        } else if (rand < DNB_CONFIG.BOTH_MATCH_PROBABILITY + DNB_CONFIG.POSITION_MATCH_PROBABILITY + DNB_CONFIG.NUMBER_MATCH_PROBABILITY) {
          answerType = 'number';    // 30%
        } else {
          answerType = 'neither';   // 30%
        }
        
        // 決定した正答パターンに基づいて値を生成
        let position: GridPosition;
        let number: number;
        
        switch (answerType) {
          case 'both':
            position = { ...nBackTrial.position };
            number = nBackTrial.number;
            break;
          case 'position':
            position = { ...nBackTrial.position };
            number = generateDifferentNumber(nBackTrial.number);
            break;
          case 'number':
            position = generateDifferentPosition(nBackTrial.position);
            number = nBackTrial.number;
            break;
          case 'neither':
            position = generateDifferentPosition(nBackTrial.position);
            number = generateDifferentNumber(nBackTrial.number);
            break;
        }
        
        const trial: DNBTrial = {
          position,
          number,
          index: i,
          positionMatch: answerType === 'both' || answerType === 'position',
          numberMatch: answerType === 'both' || answerType === 'number',
          userResponse: {
            position: null,
            number: null,
            both: null,
            neither: null,
            responseTime: null
          },
          timestamp: Date.now()
        };
        generatedTrials.push(trial);
      }
    }

    return generatedTrials;
  }, [generateDifferentPosition, generateDifferentNumber]);

  // セッション完了
  const completeSession = useCallback(() => {
    setGameState(DNB_GAME_STATES.COMPLETED);

    // 統計計算：trialsから直接計算（sessionStatsの状態に依存しない）
    const validTrials = trials.slice(nLevel);
    
    // 応答があった試行のみをフィルター
    const respondedTrials = validTrials.filter(t => 
      t.userResponse.position || t.userResponse.number || t.userResponse.both || t.userResponse.neither
    );

    // 各カテゴリの試行数をカウント
    const bothMatches = validTrials.filter(t => t.positionMatch && t.numberMatch).length;
    const positionOnlyMatches = validTrials.filter(t => t.positionMatch && !t.numberMatch).length;
    const numberOnlyMatches = validTrials.filter(t => !t.positionMatch && t.numberMatch).length;
    const neitherMatches = validTrials.filter(t => !t.positionMatch && !t.numberMatch).length;
    
    // 実際の応答から正解数を直接計算
    let correctPositions = 0;
    let correctNumbers = 0;
    let correctBoth = 0;
    let correctNeither = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    respondedTrials.forEach(trial => {
      if (trial.userResponse.responseTime) {
        totalResponseTime += trial.userResponse.responseTime;
        responseCount++;

        // 正解判定
        if (trial.userResponse.position && trial.positionMatch && !trial.numberMatch) {
          correctPositions++;
        } else if (trial.userResponse.number && trial.numberMatch && !trial.positionMatch) {
          correctNumbers++;
        } else if (trial.userResponse.both && trial.positionMatch && trial.numberMatch) {
          correctBoth++;
        } else if (trial.userResponse.neither && !trial.positionMatch && !trial.numberMatch) {
          correctNeither++;
        }
      }
    });

    // 統計計算
    const totalCorrectResponses = correctPositions + correctNumbers + correctBoth + correctNeither;
    const falsePositives = responseCount - totalCorrectResponses;
    
    const overallAccuracy = responseCount > 0 ? totalCorrectResponses / responseCount : 0;
    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    
    // 位置・数字正答率（簡素化のため削除し、代わりに平均反応速度を重視）
    const positionAccuracy = 0; // 表示しないため0固定
    const numberAccuracy = 0;   // 表示しないため0固定

    // 見逃し数
    const expectedResponses = bothMatches + positionOnlyMatches + numberOnlyMatches + neitherMatches;
    const missedResponses = Math.max(0, expectedResponses - responseCount);

    // 集中力スコア
    const focusContribution = Math.round(
      overallAccuracy * DNB_CONFIG.BASE_SCORE_MULTIPLIER * nLevel
    );

    console.log('Session completion stats (from trials):', { 
      validTrials: validTrials.length,
      respondedTrials: respondedTrials.length,
      responseCount,
      correctPositions,
      correctNumbers,
      correctBoth,
      correctNeither,
      totalCorrectResponses,
      falsePositives,
      overallAccuracy,
      avgResponseTime,
      // デバッグ情報
      sampleTrials: respondedTrials.slice(0, 3).map(t => ({
        positionMatch: t.positionMatch,
        numberMatch: t.numberMatch,
        userResponse: t.userResponse,
        responseTime: t.userResponse.responseTime
      }))
    });

    const sessionData: DNBSessionData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      nLevel,
      finalLevel: nLevel,
      totalTrials: validTrials.length,
      accuracy: overallAccuracy,
      positionAccuracy,
      numberAccuracy,
      avgResponseTime,
      correctResponses: totalCorrectResponses,
      falsePositives,
      misses: missedResponses,
      focusContribution
    };

    onSessionComplete(sessionData);
  }, [trials, nLevel, onSessionComplete]);

  // セッション開始
  const startGame = useCallback(() => {
    const newTrials = generateTrials(nLevel);
    setTrials(newTrials);
    setCurrentTrialIndex(0);
    setSessionStats({
      correctPositions: 0,
      correctNumbers: 0,
      correctBoth: 0,
      correctNeither: 0,
      falsePositives: 0,
      misses: 0,
      totalResponseTime: 0,
      responseCount: 0
    });
    setGameState(DNB_GAME_STATES.COUNTDOWN);
    setCountdown(3);

    // 3秒カウントダウン
    let countdownValue = 3;
    countdownTimerRef.current = setInterval(() => {
      countdownValue--;
      setCountdown(countdownValue);
      
      if (countdownValue <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
        setGameState(DNB_GAME_STATES.PLAYING);
        presentTrial(0, newTrials);
      }
    }, 1000);
  }, [nLevel, generateTrials, completeSession]);

  // 試行の提示
  const presentTrial = useCallback((index: number, trialList: DNBTrial[]) => {
    if (index >= trialList.length) {
      completeSession();
      return;
    }

    setCurrentTrialIndex(index);
    setShowStimulus(true);
    setGameState(DNB_GAME_STATES.STIMULUS_SHOW);
    setFeedback(null);

    // 刺激のタイムスタンプを更新
    trialList[index].timestamp = Date.now();

    // 刺激表示時間後にインターバルへ
    stimulusTimerRef.current = setTimeout(() => {
      setShowStimulus(false);
      setGameState(DNB_GAME_STATES.INTERVAL);

      // インターバル後に次の試行へ
      intervalTimerRef.current = setTimeout(() => {
        presentTrial(index + 1, trialList);
      }, DNB_CONFIG.INTERVAL_DURATION);
    }, DNB_CONFIG.STIMULUS_DURATION);
  }, [completeSession]);

  // ユーザー応答処理
  const handleResponse = useCallback((responseType: ResponseType) => {
    if (!canRespond || !currentTrial) return;

    const responseTime = Date.now() - currentTrial.timestamp;
    
    // 応答を記録
    currentTrial.userResponse[responseType] = true;
    currentTrial.userResponse.responseTime = responseTime;

    // 正誤判定
    let isCorrect = false;
    
    if (responseType === 'position') {
      isCorrect = currentTrial.positionMatch && !currentTrial.numberMatch;
    } else if (responseType === 'number') {
      isCorrect = currentTrial.numberMatch && !currentTrial.positionMatch;
    } else if (responseType === 'both') {
      // 「すべて同じ」が正解の場合：位置も数字も一致
      isCorrect = currentTrial.positionMatch && currentTrial.numberMatch;
    } else if (responseType === 'neither') {
      // 「すべて異なる」が正解の場合：位置も数字も一致しない
      isCorrect = !currentTrial.positionMatch && !currentTrial.numberMatch;
    }

    // 統計更新
    setSessionStats(prev => ({
      ...prev,
      totalResponseTime: prev.totalResponseTime + responseTime,
      responseCount: prev.responseCount + 1,
      ...(isCorrect ? {
        correctPositions: responseType === 'position' ? prev.correctPositions + 1 : prev.correctPositions,
        correctNumbers: responseType === 'number' ? prev.correctNumbers + 1 : prev.correctNumbers,
        correctBoth: responseType === 'both' ? prev.correctBoth + 1 : prev.correctBoth,
        correctNeither: responseType === 'neither' ? prev.correctNeither + 1 : prev.correctNeither,
      } : {
        falsePositives: prev.falsePositives + 1
      })
    }));

    // フィードバック表示
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, DNB_CONFIG.FEEDBACK_DURATION);
  }, [canRespond, currentTrial]);

  // セッション一時停止
  const pauseGame = useCallback(() => {
    if (gameState !== DNB_GAME_STATES.PLAYING && 
        gameState !== DNB_GAME_STATES.STIMULUS_SHOW && 
        gameState !== DNB_GAME_STATES.INTERVAL) return;

    setGameState(DNB_GAME_STATES.PAUSED);
    
    // すべてのタイマーをクリア
    if (stimulusTimerRef.current) clearTimeout(stimulusTimerRef.current);
    if (intervalTimerRef.current) clearTimeout(intervalTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, [gameState]);

  // セッション再開
  const resumeGame = useCallback(() => {
    if (gameState !== DNB_GAME_STATES.PAUSED) return;
    
    setGameState(DNB_GAME_STATES.INTERVAL);
    // 現在の試行から再開
    presentTrial(currentTrialIndex, trials);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentTrialIndex, trials]);

  // セッション停止
  const stopGame = useCallback(() => {
    setGameState(DNB_GAME_STATES.MENU);
    setTrials([]);
    setCurrentTrialIndex(0);
    setShowStimulus(false);
    setFeedback(null);
    
    // すべてのタイマーをクリア
    if (stimulusTimerRef.current) clearTimeout(stimulusTimerRef.current);
    if (intervalTimerRef.current) clearTimeout(intervalTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (stimulusTimerRef.current) clearTimeout(stimulusTimerRef.current);
      if (intervalTimerRef.current) clearTimeout(intervalTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  return {
    gameState,
    currentTrial,
    currentTrialIndex,
    showStimulus,
    sessionStats,
    feedback,
    countdown,
    startGame,
    pauseGame,
    resumeGame,
    stopGame,
    handleResponse,
    canRespond
  };
};
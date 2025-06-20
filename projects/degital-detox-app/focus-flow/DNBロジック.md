Dual N-Back (DNB) ゲームの実装ロジック
1. データ構造とゲーム状態管理
javascript// ゲーム設定の定数
const GAME_CONFIG = {
  GRID_SIZE: 3,
  STIMULUS_DURATION: 500, // 0.5秒
  INTERVAL_DURATION: 2500, // 2.5秒
  MIN_N_LEVEL: 1,
  MAX_N_LEVEL: 5,
  BASE_TRIALS: 20, // 20 + N試行
  
  // 適応的難易度調整の閾値
  LEVEL_UP_THRESHOLD: 0.8, // 80%正答率
  LEVEL_UP_BLOCKS: 3, // 3ブロック連続
  LEVEL_DOWN_THRESHOLD: 0.5, // 50%正答率
  LEVEL_DOWN_BLOCKS: 2, // 2ブロック連続
};

// ゲーム状態の定義
const GAME_STATES = {
  MENU: 'menu',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  STIMULUS_SHOW: 'stimulus_show',
  INTERVAL: 'interval',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

// 試行データの構造
class Trial {
  constructor(position, number, index) {
    this.position = position; // {row: 0-2, col: 0-2}
    this.number = number; // 1-9
    this.index = index; // 試行番号
    this.positionMatch = false; // N回前と位置が一致
    this.numberMatch = false; // N回前と数字が一致
    this.userResponse = {
      position: null,
      number: null,
      responseTime: null
    };
    this.timestamp = Date.now();
  }
}
2. メインゲームコンポーネント
javascriptimport React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DualNBackGame = () => {
  // ゲーム状態
  const [gameState, setGameState] = useState(GAME_STATES.MENU);
  const [nLevel, setNLevel] = useState(1);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [trials, setTrials] = useState([]);
  const [showStimulus, setShowStimulus] = useState(false);
  
  // パフォーマンス追跡
  const [blockPerformance, setBlockPerformance] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    correctPositions: 0,
    correctNumbers: 0,
    falsePositives: 0,
    misses: 0,
    totalResponseTime: 0,
    responseCount: 0
  });
  
  // アニメーション値
  const gridOpacity = useRef(new Animated.Value(0)).current;
  const numberScale = useRef(new Animated.Value(0)).current;
  
  // タイマー参照
  const stimulusTimer = useRef(null);
  const intervalTimer = useRef(null);
  
  // 試行の生成
  const generateTrials = useCallback((level) => {
    const totalTrials = GAME_CONFIG.BASE_TRIALS + level;
    const generatedTrials = [];
    
    for (let i = 0; i < totalTrials; i++) {
      // ランダムな位置と数字を生成
      const position = {
        row: Math.floor(Math.random() * GAME_CONFIG.GRID_SIZE),
        col: Math.floor(Math.random() * GAME_CONFIG.GRID_SIZE)
      };
      const number = Math.floor(Math.random() * 9) + 1;
      
      const trial = new Trial(position, number, i);
      
      // N-back判定（i >= level の場合のみ）
      if (i >= level) {
        const nBackTrial = generatedTrials[i - level];
        
        // 30%の確率でマッチを生成（位置または数字）
        if (Math.random() < 0.3) {
          if (Math.random() < 0.5) {
            // 位置マッチ
            trial.position = { ...nBackTrial.position };
            trial.positionMatch = true;
          } else {
            // 数字マッチ
            trial.number = nBackTrial.number;
            trial.numberMatch = true;
          }
        }
        
        // 10%の確率で両方マッチ
        if (Math.random() < 0.1) {
          trial.position = { ...nBackTrial.position };
          trial.number = nBackTrial.number;
          trial.positionMatch = true;
          trial.numberMatch = true;
        }
      }
      
      generatedTrials.push(trial);
    }
    
    return generatedTrials;
  }, []);
  
  // ゲーム開始
  const startGame = useCallback(() => {
    const newTrials = generateTrials(nLevel);
    setTrials(newTrials);
    setCurrentTrialIndex(0);
    setSessionStats({
      correctPositions: 0,
      correctNumbers: 0,
      falsePositives: 0,
      misses: 0,
      totalResponseTime: 0,
      responseCount: 0
    });
    setGameState(GAME_STATES.COUNTDOWN);
    
    // 3秒カウントダウン後にゲーム開始
    setTimeout(() => {
      setGameState(GAME_STATES.PLAYING);
      presentTrial(0, newTrials);
    }, 3000);
  }, [nLevel, generateTrials]);
  
  // 試行の提示
  const presentTrial = useCallback((index, trialList) => {
    if (index >= trialList.length) {
      completeSession();
      return;
    }
    
    setCurrentTrialIndex(index);
    setShowStimulus(true);
    setGameState(GAME_STATES.STIMULUS_SHOW);
    
    // アニメーション開始
    Animated.parallel([
      Animated.timing(gridOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.spring(numberScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
    
    // 刺激表示時間後にインターバルへ
    stimulusTimer.current = setTimeout(() => {
      setShowStimulus(false);
      setGameState(GAME_STATES.INTERVAL);
      
      // アニメーション終了
      Animated.parallel([
        Animated.timing(gridOpacity, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(numberScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
      
      // インターバル後に次の試行へ
      intervalTimer.current = setTimeout(() => {
        presentTrial(index + 1, trialList);
      }, GAME_CONFIG.INTERVAL_DURATION);
    }, GAME_CONFIG.STIMULUS_DURATION);
  }, [gridOpacity, numberScale]);
  
  // ユーザーの応答処理
  const handleUserResponse = useCallback((responseType) => {
    const currentTrial = trials[currentTrialIndex];
    if (!currentTrial || currentTrialIndex < nLevel) return;
    
    const responseTime = Date.now() - currentTrial.timestamp;
    const nBackTrial = trials[currentTrialIndex - nLevel];
    
    // 応答を記録
    currentTrial.userResponse[responseType] = true;
    currentTrial.userResponse.responseTime = responseTime;
    
    // 正誤判定
    let isCorrect = false;
    if (responseType === 'position') {
      isCorrect = currentTrial.positionMatch;
      if (isCorrect) {
        setSessionStats(prev => ({
          ...prev,
          correctPositions: prev.correctPositions + 1,
          totalResponseTime: prev.totalResponseTime + responseTime,
          responseCount: prev.responseCount + 1
        }));
      } else {
        setSessionStats(prev => ({
          ...prev,
          falsePositives: prev.falsePositives + 1
        }));
      }
    } else if (responseType === 'number') {
      isCorrect = currentTrial.numberMatch;
      if (isCorrect) {
        setSessionStats(prev => ({
          ...prev,
          correctNumbers: prev.correctNumbers + 1,
          totalResponseTime: prev.totalResponseTime + responseTime,
          responseCount: prev.responseCount + 1
        }));
      } else {
        setSessionStats(prev => ({
          ...prev,
          falsePositives: prev.falsePositives + 1
        }));
      }
    }
    
    // 即座のフィードバック
    provideFeedback(isCorrect);
  }, [trials, currentTrialIndex, nLevel]);
  
  // フィードバック提供
  const provideFeedback = (isCorrect) => {
    // 視覚的フィードバック（フラッシュ効果）
    const feedbackColor = isCorrect ? '#4CAF50' : '#F44336';
    // ここで画面の境界線を一瞬光らせるなどの効果を実装
    
    // 触覚フィードバック（バイブレーション）
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const pattern = isCorrect ? [0, 50] : [0, 50, 50, 50];
      Vibration.vibrate(pattern);
    }
  };
3. 適応的難易度調整システム
javascript// 難易度調整ロジック
const adaptiveDifficultyAdjustment = useCallback(() => {
  const totalPossibleMatches = trials.slice(nLevel).reduce((sum, trial) => {
    return sum + (trial.positionMatch ? 1 : 0) + (trial.numberMatch ? 1 : 0);
  }, 0);
  
  const totalCorrect = sessionStats.correctPositions + sessionStats.correctNumbers;
  const accuracy = totalPossibleMatches > 0 ? totalCorrect / totalPossibleMatches : 0;
  
  // ブロックパフォーマンスを記録
  const newBlockPerformance = [...blockPerformance, accuracy];
  setBlockPerformance(newBlockPerformance);
  
  // レベルアップ判定
  if (newBlockPerformance.length >= GAME_CONFIG.LEVEL_UP_BLOCKS) {
    const recentBlocks = newBlockPerformance.slice(-GAME_CONFIG.LEVEL_UP_BLOCKS);
    const allAboveThreshold = recentBlocks.every(acc => acc >= GAME_CONFIG.LEVEL_UP_THRESHOLD);
    
    if (allAboveThreshold && nLevel < GAME_CONFIG.MAX_N_LEVEL) {
      setNLevel(prev => prev + 1);
      setBlockPerformance([]); // リセット
      showLevelUpNotification();
    }
  }
  
  // レベルダウン判定
  if (newBlockPerformance.length >= GAME_CONFIG.LEVEL_DOWN_BLOCKS) {
    const recentBlocks = newBlockPerformance.slice(-GAME_CONFIG.LEVEL_DOWN_BLOCKS);
    const allBelowThreshold = recentBlocks.every(acc => acc < GAME_CONFIG.LEVEL_DOWN_THRESHOLD);
    
    if (allBelowThreshold && nLevel > GAME_CONFIG.MIN_N_LEVEL) {
      setNLevel(prev => prev - 1);
      setBlockPerformance([]); // リセット
      showLevelDownNotification();
    }
  }
}, [trials, sessionStats, blockPerformance, nLevel]);

// 個人の進捗に基づく開始レベル設定
const determineStartingLevel = async () => {
  try {
    const history = await AsyncStorage.getItem('@dnb_history');
    if (history) {
      const parsedHistory = JSON.parse(history);
      const recentSessions = parsedHistory.slice(-10); // 直近10セッション
      
      if (recentSessions.length >= 5) {
        // 平均パフォーマンスに基づいて開始レベルを決定
        const avgLevel = recentSessions.reduce((sum, session) => sum + session.finalLevel, 0) / recentSessions.length;
        const avgAccuracy = recentSessions.reduce((sum, session) => sum + session.accuracy, 0) / recentSessions.length;
        
        if (avgAccuracy >= 0.7) {
          return Math.min(Math.floor(avgLevel), GAME_CONFIG.MAX_N_LEVEL);
        } else {
          return Math.max(Math.floor(avgLevel - 0.5), GAME_CONFIG.MIN_N_LEVEL);
        }
      }
    }
  } catch (error) {
    console.error('Error loading history:', error);
  }
  
  return GAME_CONFIG.MIN_N_LEVEL; // デフォルト
};
4. グリッド表示とUI実装
javascript// 3×3グリッドコンポーネント
const GameGrid = ({ currentTrial, showStimulus }) => {
  const renderGridCell = (row, col) => {
    const isActive = showStimulus && 
                    currentTrial?.position.row === row && 
                    currentTrial?.position.col === col;
    
    return (
      <Animated.View
        key={`${row}-${col}`}
        style={[
          styles.gridCell,
          isActive && styles.activeGridCell,
          {
            opacity: gridOpacity
          }
        ]}
      >
        {isActive && (
          <Animated.Text
            style={[
              styles.numberText,
              {
                transform: [{ scale: numberScale }]
              }
            ]}
          >
            {currentTrial.number}
          </Animated.Text>
        )}
      </Animated.View>
    );
  };
  
  return (
    <View style={styles.gridContainer}>
      {[0, 1, 2].map(row => (
        <View key={row} style={styles.gridRow}>
          {[0, 1, 2].map(col => renderGridCell(row, col))}
        </View>
      ))}
    </View>
  );
};

// レスポンスボタン
const ResponseButtons = ({ onResponse, disabled, currentTrialIndex, nLevel }) => {
  const canRespond = currentTrialIndex >= nLevel && !disabled;
  
  return (
    <View style={styles.responseContainer}>
      <TouchableOpacity
        style={[styles.responseButton, !canRespond && styles.disabledButton]}
        onPress={() => canRespond && onResponse('position')}
        disabled={!canRespond}
      >
        <Text style={styles.buttonText}>位置が同じ</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.responseButton, !canRespond && styles.disabledButton]}
        onPress={() => canRespond && onResponse('number')}
        disabled={!canRespond}
      >
        <Text style={styles.buttonText}>数字が同じ</Text>
      </TouchableOpacity>
    </View>
  );
};
5. セッション完了と統計表示
javascript// セッション完了処理
const completeSession = async () => {
  setGameState(GAME_STATES.COMPLETED);
  
  // 統計計算
  const totalTrials = trials.length - nLevel;
  const possiblePositionMatches = trials.slice(nLevel).filter(t => t.positionMatch).length;
  const possibleNumberMatches = trials.slice(nLevel).filter(t => t.numberMatch).length;
  
  const positionAccuracy = possiblePositionMatches > 0 
    ? sessionStats.correctPositions / possiblePositionMatches 
    : 0;
  const numberAccuracy = possibleNumberMatches > 0 
    ? sessionStats.correctNumbers / possibleNumberMatches 
    : 0;
  const overallAccuracy = (positionAccuracy + numberAccuracy) / 2;
  
  const avgResponseTime = sessionStats.responseCount > 0 
    ? sessionStats.totalResponseTime / sessionStats.responseCount 
    : 0;
  
  const sessionData = {
    date: new Date().toISOString(),
    nLevel: nLevel,
    finalLevel: nLevel, // 適応調整後の最終レベル
    trials: totalTrials,
    accuracy: overallAccuracy,
    positionAccuracy: positionAccuracy,
    numberAccuracy: numberAccuracy,
    avgResponseTime: avgResponseTime,
    correctResponses: sessionStats.correctPositions + sessionStats.correctNumbers,
    falsePositives: sessionStats.falsePositives,
    misses: possiblePositionMatches + possibleNumberMatches - 
            sessionStats.correctPositions - sessionStats.correctNumbers
  };
  
  // データ保存
  await saveSessionData(sessionData);
  
  // 集中力スコアへの貢献計算
  const focusContribution = calculateFocusContribution(sessionData);
  await updateFocusScore(focusContribution);
  
  // 適応的難易度調整
  adaptiveDifficultyAdjustment();
};

// 統計画面コンポーネント
const SessionStats = ({ sessionData, onClose, onRetry }) => {
  const getPerformanceMessage = (accuracy) => {
    if (accuracy >= 0.8) return "素晴らしいパフォーマンスです！";
    if (accuracy >= 0.6) return "良い調子です。継続しましょう！";
    if (accuracy >= 0.4) return "練習を重ねれば必ず向上します。";
    return "集中してもう一度挑戦してみましょう。";
  };
  
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>セッション完了</Text>
      
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>N-Backレベル:</Text>
        <Text style={styles.statValue}>{sessionData.nLevel}</Text>
      </View>
      
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>総合正答率:</Text>
        <Text style={styles.statValue}>{(sessionData.accuracy * 100).toFixed(1)}%</Text>
      </View>
      
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>平均反応時間:</Text>
        <Text style={styles.statValue}>{sessionData.avgResponseTime.toFixed(0)}ms</Text>
      </View>
      
      <View style={styles.accuracyBreakdown}>
        <ProgressBar 
          label="位置の正答率"
          progress={sessionData.positionAccuracy}
          color="#2A9D8F"
        />
        <ProgressBar 
          label="数字の正答率"
          progress={sessionData.numberAccuracy}
          color="#E76F51"
        />
      </View>
      
      <Text style={styles.performanceMessage}>
        {getPerformanceMessage(sessionData.accuracy)}
      </Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.buttonText}>もう一度</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.buttonText}>終了</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
6. 長期的な進捗追跡
javascript// 週次レポート生成
const generateWeeklyReport = async () => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const history = await loadSessionHistory();
  const weekSessions = history.filter(session => 
    new Date(session.date) > oneWeekAgo
  );
  
  if (weekSessions.length === 0) return null;
  
  const report = {
    totalSessions: weekSessions.length,
    avgAccuracy: weekSessions.reduce((sum, s) => sum + s.accuracy, 0) / weekSessions.length,
    avgLevel: weekSessions.reduce((sum, s) => sum + s.nLevel, 0) / weekSessions.length,
    maxLevel: Math.max(...weekSessions.map(s => s.nLevel)),
    totalTrainingTime: weekSessions.length * 5, // 約5分/セッション
    improvementRate: calculateImprovementRate(weekSessions),
    strengths: analyzeStrengths(weekSessions),
    weaknesses: analyzeWeaknesses(weekSessions),
    recommendation: generateRecommendation(weekSessions)
  };
  
  return report;
};

// 認知機能改善度の計算
const calculateCognitiveImprovement = (sessionHistory) => {
  if (sessionHistory.length < 10) return null;
  
  const firstSessions = sessionHistory.slice(0, 5);
  const recentSessions = sessionHistory.slice(-5);
  
  const initialPerformance = {
    accuracy: firstSessions.reduce((sum, s) => sum + s.accuracy, 0) / 5,
    level: firstSessions.reduce((sum, s) => sum + s.nLevel, 0) / 5,
    responseTime: firstSessions.reduce((sum, s) => sum + s.avgResponseTime, 0) / 5
  };
  
  const currentPerformance = {
    accuracy: recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / 5,
    level: recentSessions.reduce((sum, s) => sum + s.nLevel, 0) / 5,
    responseTime: recentSessions.reduce((sum, s) => sum + s.avgResponseTime, 0) / 5
  };
  
  return {
    accuracyImprovement: ((currentPerformance.accuracy - initialPerformance.accuracy) / initialPerformance.accuracy) * 100,
    levelProgression: currentPerformance.level - initialPerformance.level,
    responseTimeReduction: ((initialPerformance.responseTime - currentPerformance.responseTime) / initialPerformance.responseTime) * 100,
    overallCognitiveGain: calculateOverallGain(initialPerformance, currentPerformance)
  };
};
7. スタイル定義
javascriptconst styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1FAEE',
    padding: 20
  },
  gridContainer: {
    aspectRatio: 1,
    maxWidth: 300,
    alignSelf: 'center',
    marginVertical: 40
  },
  gridRow: {
    flexDirection: 'row',
    flex: 1
  },
  gridCell: {
    flex: 1,
    margin: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#264653',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeGridCell: {
    backgroundColor: '#2A9D8F',
    elevation: 8,
    shadowOpacity: 0.3
  },
  numberText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  responseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40
  },
  responseButton: {
    backgroundColor: '#264653',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    minWidth: 140
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    elevation: 0
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    elevation: 5,
    shadowColor: '#264653',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10
  },
  levelIndicator: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#E76F51',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
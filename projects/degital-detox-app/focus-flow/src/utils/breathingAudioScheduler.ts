import { BreathingPattern } from '../constants/breathing';

export interface AudioScheduleItem {
  elapsedTime: number;
  type: 'tick' | 'transition';
  phaseType: 'inhale' | 'hold' | 'exhale';
  phaseIndex: number;
}

export class BreathingAudioScheduler {
  private pattern: BreathingPattern;
  private sessionDuration: number;
  private schedule: AudioScheduleItem[] = [];

  constructor(pattern: BreathingPattern, sessionDuration: number) {
    this.pattern = pattern;
    this.sessionDuration = sessionDuration;
    this.generateSchedule();
  }

  private generateSchedule(): void {
    this.schedule = [];
    let currentTime = 0;
    let phaseIndex = 0;

    // セッション開始時の最初のフェーズ変更音
    this.schedule.push({
      elapsedTime: 0,
      type: 'transition',
      phaseType: this.pattern.phases[0].type,
      phaseIndex: 0
    });

    while (currentTime < this.sessionDuration) {
      const currentPhase = this.pattern.phases[phaseIndex];
      const phaseDurationInSeconds = Math.floor(currentPhase.duration / 1000);
      const phaseEndTime = currentTime + phaseDurationInSeconds;

      // 現在のフェーズ内の1秒ごとのカウント音をスケジュール
      for (let second = 1; second <= phaseDurationInSeconds; second++) {
        const tickTime = currentTime + second;
        
        // セッション終了時間を超える場合はスケジュールしない
        if (tickTime >= this.sessionDuration) break;

        // フェーズ終了の瞬間（次のフェーズ変更音の時間）でない場合のみカウント音を追加
        const nextPhaseIndex = (phaseIndex + 1) % this.pattern.phases.length;
        const isPhaseEndMoment = (second === phaseDurationInSeconds);
        
        if (!isPhaseEndMoment) {
          this.schedule.push({
            elapsedTime: tickTime,
            type: 'tick',
            phaseType: currentPhase.type,
            phaseIndex
          });
        }
      }

      // フェーズ終了時刻に次のフェーズの変更音をスケジュール
      if (phaseEndTime < this.sessionDuration) {
        const nextPhaseIdx = (phaseIndex + 1) % this.pattern.phases.length;
        const nextPhase = this.pattern.phases[nextPhaseIdx];
        
        this.schedule.push({
          elapsedTime: phaseEndTime,
          type: 'transition',
          phaseType: nextPhase.type,
          phaseIndex: nextPhaseIdx
        });
      }

      currentTime = phaseEndTime;
      phaseIndex = (phaseIndex + 1) % this.pattern.phases.length;
    }

    // スケジュールを時間順にソート
    this.schedule.sort((a, b) => a.elapsedTime - b.elapsedTime);
  }

  public getScheduleForTime(elapsedTime: number): AudioScheduleItem | null {
    return this.schedule.find(item => item.elapsedTime === elapsedTime) || null;
  }

  public getAllSchedule(): AudioScheduleItem[] {
    return [...this.schedule];
  }

  public getCurrentPhaseType(elapsedTime: number): 'inhale' | 'hold' | 'exhale' {
    // 現在時間より前の最新のtransitionイベントを探す
    const lastTransition = this.schedule
      .filter(item => item.type === 'transition' && item.elapsedTime <= elapsedTime)
      .pop();
    
    return lastTransition ? lastTransition.phaseType : this.pattern.phases[0].type;
  }

  public updatePattern(pattern: BreathingPattern, sessionDuration: number): void {
    this.pattern = pattern;
    this.sessionDuration = sessionDuration;
    this.generateSchedule();
  }
}
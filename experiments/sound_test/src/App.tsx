import { useState, useEffect, useRef, useCallback } from 'react';
import { Beaker } from 'lucide-react';
import { AudioEngine, SoundGenerator } from './core/AudioEngine';
import { WhiteNoiseGenerator } from './generators/WhiteNoise';
import { PinkNoiseGenerator } from './generators/PinkNoise';
import { BrownNoiseGenerator } from './generators/BrownNoise';
import { RainSoundGenerator } from './generators/RainSound';
import { SuburbsSoundGenerator } from './generators/SuburbsSound';
import { RainSound003Generator } from './generators/RainSound003';
import { RainNormalSoundGenerator } from './generators/RainNormalSound';
import { WindSoundGenerator } from './generators/WindSound';
import { BinauralBeatGenerator, BinauralPreset } from './generators/BinauralBeat';
import { SoundCard } from './components/SoundCard';
import { MasterControl } from './components/MasterControl';

type GeneratorKey = 'white' | 'pink' | 'brown' | 'rain' | 'suburbs' | 'rain003' | 'rain_normal' | 'wind' | 'binaural';

interface GeneratorState {
  playing: boolean;
  volume: number;
}

const SOUND_CONFIG: Record<GeneratorKey, { title: string; description: string; color: string }> = {
  white: { title: 'White Noise', description: 'Full spectrum, sharp sound', color: 'bg-slate-700' },
  pink: { title: 'Pink Noise', description: '1/f noise, natural & soft', color: 'bg-pink-900/50' },
  brown: { title: 'Brown Noise', description: 'Deep, rumbling bass', color: 'bg-amber-900/50' },
  rain: { title: 'Rain (High)', description: 'Raindrop texture, bright', color: 'bg-blue-900/50' },
  suburbs: { title: 'Suburbs', description: 'Pink noise base, deep & warm', color: 'bg-indigo-900/50' },
  rain003: { title: 'Rain (Heavy)', description: 'Downpour, steady "ザー" sound', color: 'bg-sky-900/50' },
  rain_normal: { title: 'Rain (Normal)', description: 'Bandpass white noise', color: 'bg-cyan-900/50' },
  wind: { title: 'Wind', description: 'Brown noise, 12s cycle', color: 'bg-teal-900/50' },
  binaural: { title: 'Binaural Beats', description: 'Headphones required', color: 'bg-purple-900/50' },
};

export default function App() {
  const engineRef = useRef<AudioEngine | null>(null);
  const generatorsRef = useRef<Record<GeneratorKey, SoundGenerator> | null>(null);

  const [initialized, setInitialized] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [states, setStates] = useState<Record<GeneratorKey, GeneratorState>>({
    white: { playing: false, volume: 0.5 },
    pink: { playing: false, volume: 0.5 },
    brown: { playing: false, volume: 0.5 },
    rain: { playing: false, volume: 0.5 },
    suburbs: { playing: false, volume: 0.5 },
    rain003: { playing: false, volume: 0.5 },
    rain_normal: { playing: false, volume: 0.5 },
    wind: { playing: false, volume: 0.5 },
    binaural: { playing: false, volume: 0.5 },
  });
  const [binauralPreset, setBinauralPreset] = useState<BinauralPreset>('relax');

  const initAudio = useCallback(async () => {
    if (initialized) return;
    const engine = AudioEngine.getInstance();
    await engine.resume();
    const ctx = engine.getContext();
    const master = engine.getMasterGain();

    generatorsRef.current = {
      white: new WhiteNoiseGenerator(ctx, master),
      pink: new PinkNoiseGenerator(ctx, master),
      brown: new BrownNoiseGenerator(ctx, master),
      rain: new RainSoundGenerator(ctx, master),
      suburbs: new SuburbsSoundGenerator(ctx, master),
      rain003: new RainSound003Generator(ctx, master),
      rain_normal: new RainNormalSoundGenerator(ctx, master),
      wind: new WindSoundGenerator(ctx, master),
      binaural: new BinauralBeatGenerator(ctx, master),
    };

    engineRef.current = engine;
    setInitialized(true);
  }, [initialized]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMasterVolume(masterVolume);
    }
  }, [masterVolume]);

  const toggleSound = (key: GeneratorKey) => {
    if (!generatorsRef.current) return;
    const gen = generatorsRef.current[key];
    if (states[key].playing) {
      gen.stop();
    } else {
      gen.setVolume(states[key].volume);
      gen.start();
    }
    setStates((s) => ({ ...s, [key]: { ...s[key], playing: !s[key].playing } }));
  };

  const setVolume = (key: GeneratorKey, volume: number) => {
    if (generatorsRef.current) {
      generatorsRef.current[key].setVolume(volume);
    }
    setStates((s) => ({ ...s, [key]: { ...s[key], volume } }));
  };

  const changeBinauralPreset = (preset: BinauralPreset) => {
    setBinauralPreset(preset);
    if (generatorsRef.current) {
      (generatorsRef.current.binaural as BinauralBeatGenerator).setPreset(preset);
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <button
          onClick={initAudio}
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl text-lg font-semibold flex items-center gap-3 transition-colors"
        >
          <Beaker size={24} />
          Start ASMR Sound Lab
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <Beaker className="text-green-400" size={32} />
          <h1 className="text-2xl font-bold text-white">ASMR Sound Lab</h1>
        </header>

        <MasterControl volume={masterVolume} onVolumeChange={setMasterVolume} />

        <section className="mt-6">
          <h2 className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wide">Noise Types</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['white', 'pink', 'brown'] as const).map((key) => (
              <SoundCard
                key={key}
                title={SOUND_CONFIG[key].title}
                description={SOUND_CONFIG[key].description}
                generator={generatorsRef.current![key]}
                isPlaying={states[key].playing}
                volume={states[key].volume}
                onToggle={() => toggleSound(key)}
                onVolumeChange={(v) => setVolume(key, v)}
                color={SOUND_CONFIG[key].color}
              />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wide">Nature Sounds</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['rain', 'suburbs', 'rain003', 'rain_normal', 'wind'] as const).map((key) => (
              <SoundCard
                key={key}
                title={SOUND_CONFIG[key].title}
                description={SOUND_CONFIG[key].description}
                generator={generatorsRef.current![key]}
                isPlaying={states[key].playing}
                volume={states[key].volume}
                onToggle={() => toggleSound(key)}
                onVolumeChange={(v) => setVolume(key, v)}
                color={SOUND_CONFIG[key].color}
              />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wide">Binaural Beats</h2>
          <div className={`${SOUND_CONFIG.binaural.color} rounded-xl p-4`}>
            <div className="flex flex-wrap gap-2 mb-4">
              {(Object.keys(BinauralBeatGenerator.PRESETS) as BinauralPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => changeBinauralPreset(p)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    binauralPreset === p ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {BinauralBeatGenerator.PRESETS[p].label}
                </button>
              ))}
            </div>
            <SoundCard
              title={SOUND_CONFIG.binaural.title}
              description={SOUND_CONFIG.binaural.description}
              generator={generatorsRef.current!.binaural}
              isPlaying={states.binaural.playing}
              volume={states.binaural.volume}
              onToggle={() => toggleSound('binaural')}
              onVolumeChange={(v) => setVolume('binaural', v)}
              color="bg-transparent"
            />
          </div>
        </section>

        <footer className="mt-8 text-center text-slate-500 text-xs">
          Web Audio API Research Lab | Volume: Keep below 70dB for safe listening
        </footer>
      </div>
    </div>
  );
}

# React開発ガイドライン - FocusFlow

## 1. プロジェクト構成

### 1.1 ディレクトリ構造
```
focus-flow/
├── public/
├── src/
│   ├── components/          # 再利用可能なコンポーネント
│   │   ├── common/         # 共通コンポーネント
│   │   ├── layout/         # レイアウト関連
│   │   └── ui/             # UIコンポーネント
│   ├── pages/              # ページコンポーネント
│   │   ├── Home/
│   │   ├── Dashboard/
│   │   ├── Detox/
│   │   ├── Games/
│   │   └── Settings/
│   ├── hooks/              # カスタムフック
│   ├── contexts/           # React Context
│   ├── utils/              # ユーティリティ関数
│   ├── types/              # TypeScript型定義
│   ├── constants/          # 定数
│   └── styles/             # グローバルスタイル
```

### 1.2 命名規則
- **コンポーネント**: PascalCase (`HomeScreen`, `FocusScoreCard`)
- **ファイル**: PascalCase for components, camelCase for others
- **変数・関数**: camelCase (`getUserData`, `isDetoxActive`)
- **定数**: UPPER_SNAKE_CASE (`MAX_SCORE`, `DEFAULT_TIMEOUT`)
- **型**: PascalCase (`UserData`, `GameScore`)

## 2. コンポーネント設計

### 2.1 コンポーネントの分類
- **Pages**: ルートレベルのページコンポーネント
- **Containers**: ビジネスロジックを持つコンポーネント
- **Presentational**: 純粋な表示用コンポーネント
- **UI**: 再利用可能なUIコンポーネント

### 2.2 Props設計
```typescript
// 良い例
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// 悪い例
interface ButtonProps {
  color: string;
  width: number;
  height: number;
  // ... 多すぎるprops
}
```

### 2.3 コンポーネントテンプレート
```typescript
import React from 'react';
import { styled } from '@mui/material/styles';

interface ComponentProps {
  // Props定義
}

const StyledComponent = styled('div')(({ theme }) => ({
  // スタイル定義
}));

export const Component: React.FC<ComponentProps> = ({
  // Props destructuring
}) => {
  // ロジック

  return (
    <StyledComponent>
      {/* JSX */}
    </StyledComponent>
  );
};
```

## 3. 状態管理

### 3.1 Context設計
```typescript
// contexts/AppContext.tsx
interface AppState {
  user: UserData | null;
  isDetoxActive: boolean;
  currentScore: number;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
```

### 3.2 Reducer パターン
```typescript
type AppAction = 
  | { type: 'SET_USER'; payload: UserData }
  | { type: 'START_DETOX' }
  | { type: 'END_DETOX' }
  | { type: 'UPDATE_SCORE'; payload: number };

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'START_DETOX':
      return { ...state, isDetoxActive: true };
    // ... その他のcase
    default:
      return state;
  }
};
```

## 4. スタイリング

### 4.1 Material-UI テーマ設定
```typescript
// styles/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#264653',
    },
    secondary: {
      main: '#2A9D8F',
    },
    background: {
      default: '#F1FAEE',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
  },
});
```

### 4.2 Emotion Styled Components
```typescript
import { styled } from '@mui/material/styles';

const StyledCard = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(2),
  },
}));
```

## 5. カスタムフック

### 5.1 データフェッチング
```typescript
// hooks/useUserData.ts
export const useUserData = () => {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userData = await getUserData();
        setData(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};
```

### 5.2 ローカルストレージ
```typescript
// hooks/useLocalStorage.ts
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
};
```

## 6. TypeScript設定

### 6.1 型定義
```typescript
// types/index.ts
export interface UserData {
  id: string;
  name: string;
  settings: UserSettings;
  stats: UserStats;
  gameScores: GameScore[];
  detoxSessions: DetoxSession[];
}

export interface UserStats {
  dailyScore: number;
  screenTime: number;
  focusSessions: number;
  detoxTime: number;
  productivityGain: number;
  weeklyTrend: number[];
}

export interface GameScore {
  gameType: 'breathing' | 'memory' | 'pattern' | 'attention';
  score: number;
  timestamp: Date;
  duration: number;
}
```

### 6.2 Utility Types
```typescript
// types/utils.ts
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Nullable<T> = T | null;
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : any;
```

## 7. テスト

### 7.1 テスト構成
```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button onClick={() => {}}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 8. パフォーマンス最適化

### 8.1 React.memo使用
```typescript
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  // 重い処理
  return <div>{/* JSX */}</div>;
});
```

### 8.2 useMemo/useCallback使用
```typescript
const MyComponent = ({ items, onItemClick }) => {
  const expensiveValue = useMemo(() => {
    return items.reduce((acc, item) => acc + item.value, 0);
  }, [items]);

  const handleClick = useCallback((id: string) => {
    onItemClick(id);
  }, [onItemClick]);

  return (
    // JSX
  );
};
```

## 9. エラーハンドリング

### 9.1 Error Boundary
```typescript
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

## 10. アクセシビリティ

### 10.1 ARIA属性
```typescript
<button
  aria-label="デジタルデトックスを開始"
  aria-describedby="detox-description"
  onClick={startDetox}
>
  開始
</button>
```

### 10.2 フォーカス管理
```typescript
const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        // フォーカス管理ロジック
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

## 11. パフォーマンス監視

### 11.1 コード分割
```typescript
const LazyComponent = React.lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### 11.2 Bundle分析
```bash
# Bundle分析
npm run build -- --analyze
```

## 12. 開発環境設定

### 12.1 ESLint設定
```json
{
  "extends": [
    "react-app",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### 12.2 Prettier設定
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```
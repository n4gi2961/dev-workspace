const { Game } = require('./game');
const { Renderer } = require('./renderer');
const { InputHandler } = require('./input');
const keypress = require('keypress');

class TetrisApp {
  constructor() {
    this.game = new Game();
    this.renderer = new Renderer();
    this.inputHandler = null;
    this.gameLoop = null;
    this.isRunning = false;
  }

  start() {
    this.renderer.showWelcome();
    
    keypress(process.stdin);
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    
    process.stdin.once('keypress', (ch, key) => {
      this.startGame();
    });
  }

  startGame() {
    this.isRunning = true;
    this.inputHandler = new InputHandler(this.game, this.renderer);
    
    this.renderer.renderBoard(this.game.getGameState());
    
    this.gameLoop = setInterval(() => {
      if (this.isRunning) {
        this.game.update(100);
        this.renderer.renderBoard(this.game.getGameState());
      }
    }, 100);
    
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    this.isRunning = false;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
    if (this.inputHandler) {
      this.inputHandler.cleanup();
    }
  }
}

const app = new TetrisApp();
app.start();
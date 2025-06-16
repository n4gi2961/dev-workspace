const keypress = require('keypress');

class InputHandler {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.setupInput();
  }

  setupInput() {
    keypress(process.stdin);
    
    process.stdin.on('keypress', (ch, key) => {
      if (!key) return;
      
      let needsRedraw = false;
      
      switch (key.name) {
        case 'left':
          needsRedraw = this.game.moveLeft();
          break;
        case 'right':
          needsRedraw = this.game.moveRight();
          break;
        case 'down':
          needsRedraw = this.game.moveDown();
          break;
        case 'up':
          needsRedraw = this.game.rotate();
          break;
        case 'space':
          this.game.hardDrop();
          needsRedraw = true;
          break;
        case 'r':
          this.game.restart();
          needsRedraw = true;
          break;
        case 'q':
        case 'escape':
          this.cleanup();
          process.exit(0);
          break;
      }
      
      if (key.ctrl && key.name === 'c') {
        this.cleanup();
        process.exit(0);
      }
      
      if (needsRedraw) {
        this.renderer.renderBoard(this.game.getGameState());
      }
    });
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  cleanup() {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }
}

module.exports = { InputHandler };
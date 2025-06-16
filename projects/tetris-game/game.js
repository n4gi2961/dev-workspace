const { Board } = require('./board');
const { createRandomPiece } = require('./piece');

class Game {
  constructor() {
    this.board = new Board();
    this.currentPiece = createRandomPiece();
    this.nextPiece = createRandomPiece();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.gameOver = false;
    this.dropTime = 0;
    this.dropSpeed = 1000;
  }

  moveLeft() {
    if (this.gameOver) return false;
    
    if (this.board.isValidPosition(this.currentPiece, -1, 0)) {
      this.currentPiece.x -= 1;
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.gameOver) return false;
    
    if (this.board.isValidPosition(this.currentPiece, 1, 0)) {
      this.currentPiece.x += 1;
      return true;
    }
    return false;
  }

  moveDown() {
    if (this.gameOver) return false;
    
    if (this.board.isValidPosition(this.currentPiece, 0, 1)) {
      this.currentPiece.y += 1;
      return true;
    } else {
      this.lockPiece();
      return false;
    }
  }

  hardDrop() {
    if (this.gameOver) return;
    
    while (this.board.isValidPosition(this.currentPiece, 0, 1)) {
      this.currentPiece.y += 1;
      this.score += 2;
    }
    this.lockPiece();
  }

  rotate() {
    if (this.gameOver) return false;
    
    const rotatedPiece = this.currentPiece.copy();
    rotatedPiece.rotation = (rotatedPiece.rotation + 1) % rotatedPiece.shape.length;
    
    if (this.board.isValidPosition(rotatedPiece)) {
      this.currentPiece.rotation = rotatedPiece.rotation;
      return true;
    }
    
    for (let offset = 1; offset <= 2; offset++) {
      if (this.board.isValidPosition(rotatedPiece, offset, 0)) {
        this.currentPiece.rotation = rotatedPiece.rotation;
        this.currentPiece.x += offset;
        return true;
      }
      if (this.board.isValidPosition(rotatedPiece, -offset, 0)) {
        this.currentPiece.rotation = rotatedPiece.rotation;
        this.currentPiece.x -= offset;
        return true;
      }
    }
    
    return false;
  }

  lockPiece() {
    this.board.placePiece(this.currentPiece);
    
    const linesCleared = this.board.clearLines();
    this.updateScore(linesCleared);
    
    this.currentPiece = this.nextPiece;
    this.nextPiece = createRandomPiece();
    
    if (!this.board.isValidPosition(this.currentPiece)) {
      this.gameOver = true;
    }
  }

  updateScore(linesCleared) {
    this.lines += linesCleared;
    
    const points = [0, 40, 100, 300, 1200];
    this.score += points[linesCleared] * this.level;
    
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.dropSpeed = Math.max(50, 1000 - (this.level - 1) * 50);
    }
  }

  update(deltaTime) {
    if (this.gameOver) return;
    
    this.dropTime += deltaTime;
    if (this.dropTime >= this.dropSpeed) {
      this.moveDown();
      this.dropTime = 0;
    }
  }

  getGameState() {
    return {
      board: this.board.getDisplayGrid(this.currentPiece),
      nextPiece: this.nextPiece,
      score: this.score,
      level: this.level,
      lines: this.lines,
      gameOver: this.gameOver
    };
  }

  restart() {
    this.board = new Board();
    this.currentPiece = createRandomPiece();
    this.nextPiece = createRandomPiece();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.gameOver = false;
    this.dropTime = 0;
    this.dropSpeed = 1000;
  }
}

module.exports = { Game };
class Board {
  constructor(width = 10, height = 20) {
    this.width = width;
    this.height = height;
    this.grid = Array(height).fill().map(() => Array(width).fill(0));
  }

  isValidPosition(piece, offsetX = 0, offsetY = 0) {
    const blocks = piece.getBlocks();
    
    for (const block of blocks) {
      const newX = block.x + offsetX;
      const newY = block.y + offsetY;
      
      if (newX < 0 || newX >= this.width || 
          newY >= this.height || 
          (newY >= 0 && this.grid[newY][newX] !== 0)) {
        return false;
      }
    }
    
    return true;
  }

  placePiece(piece) {
    const blocks = piece.getBlocks();
    
    for (const block of blocks) {
      if (block.y >= 0) {
        this.grid[block.y][block.x] = block.color;
      }
    }
  }

  clearLines() {
    let linesCleared = 0;
    
    for (let row = this.height - 1; row >= 0; row--) {
      if (this.grid[row].every(cell => cell !== 0)) {
        this.grid.splice(row, 1);
        this.grid.unshift(Array(this.width).fill(0));
        linesCleared++;
        row++;
      }
    }
    
    return linesCleared;
  }

  getGrid() {
    return this.grid;
  }

  isGameOver() {
    return this.grid[0].some(cell => cell !== 0);
  }

  getDisplayGrid(currentPiece = null) {
    const displayGrid = this.grid.map(row => [...row]);
    
    if (currentPiece) {
      const blocks = currentPiece.getBlocks();
      for (const block of blocks) {
        if (block.y >= 0 && block.y < this.height && 
            block.x >= 0 && block.x < this.width) {
          displayGrid[block.y][block.x] = block.color;
        }
      }
    }
    
    return displayGrid;
  }
}

module.exports = { Board };
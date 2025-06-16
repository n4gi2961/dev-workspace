const chalk = require('chalk');

class Renderer {
  constructor() {
    this.colorMap = {
      'cyan': chalk.cyan,
      'yellow': chalk.yellow,
      'magenta': chalk.magenta,
      'green': chalk.green,
      'red': chalk.red,
      'blue': chalk.blue,
      'orange': chalk.rgb(255, 165, 0),
      0: chalk.gray
    };
  }

  clearScreen() {
    console.clear();
  }

  renderBoard(gameState) {
    const { board, score, level, lines, gameOver } = gameState;
    
    let output = '\n';
    
    output += chalk.bold.white('🎮 TETRIS GAME 🎮\n\n');
    
    output += '┌' + '──'.repeat(board[0].length) + '┐\n';
    
    for (let row = 0; row < board.length; row++) {
      output += '│';
      for (let col = 0; col < board[row].length; col++) {
        const cell = board[row][col];
        if (cell === 0) {
          output += '  ';
        } else {
          const colorFunc = this.colorMap[cell] || chalk.white;
          output += colorFunc('██');
        }
      }
      output += '│';
      
      switch (row) {
        case 2:
          output += '  ' + chalk.bold('SCORE: ') + chalk.yellow(score);
          break;
        case 4:
          output += '  ' + chalk.bold('LEVEL: ') + chalk.cyan(level);
          break;
        case 6:
          output += '  ' + chalk.bold('LINES: ') + chalk.green(lines);
          break;
        case 8:
          if (gameState.nextPiece) {
            output += '  ' + chalk.bold('NEXT:');
          }
          break;
        case 9:
        case 10:
        case 11:
          if (gameState.nextPiece) {
            const nextShape = gameState.nextPiece.shape[0];
            const shapeRow = row - 9;
            if (shapeRow < nextShape.length) {
              output += '  ';
              for (let col = 0; col < nextShape[shapeRow].length; col++) {
                if (nextShape[shapeRow][col]) {
                  const colorFunc = this.colorMap[gameState.nextPiece.color] || chalk.white;
                  output += colorFunc('██');
                } else {
                  output += '  ';
                }
              }
            }
          }
          break;
        default:
          break;
      }
      
      output += '\n';
    }
    
    output += '└' + '──'.repeat(board[0].length) + '┘\n';
    
    if (gameOver) {
      output += '\n' + chalk.bold.red('🎯 GAME OVER! 🎯');
      output += '\n' + chalk.yellow('Press R to restart or Q to quit');
    } else {
      output += '\n' + chalk.gray('Controls: ← → ↓ ↑(rotate) Space(hard drop) R(restart) Q(quit)');
    }
    
    console.log(output);
  }

  showWelcome() {
    console.clear();
    console.log(chalk.bold.cyan(`
╔══════════════════════════════════════╗
║           🎮 TETRIS GAME 🎮           ║
╠══════════════════════════════════════╣
║                                      ║
║  Controls:                          ║
║  ← → : Move left/right              ║
║  ↓   : Move down                    ║
║  ↑   : Rotate piece                 ║
║  Space: Hard drop                   ║
║  R   : Restart game                 ║
║  Q   : Quit game                    ║
║                                      ║
║  Press any key to start!            ║
║                                      ║
╚══════════════════════════════════════╝
    `));
  }
}

module.exports = { Renderer };
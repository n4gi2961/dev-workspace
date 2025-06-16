class Piece {
  constructor(shape, color) {
    this.shape = shape;
    this.color = color;
    this.x = 4;
    this.y = 0;
    this.rotation = 0;
  }

  rotate() {
    const rotated = [];
    const n = this.shape[this.rotation].length;
    
    for (let i = 0; i < n; i++) {
      rotated[i] = [];
      for (let j = 0; j < n; j++) {
        rotated[i][j] = this.shape[this.rotation][n - 1 - j][i];
      }
    }
    
    const nextRotation = (this.rotation + 1) % this.shape.length;
    return new Piece([...this.shape.slice(0, nextRotation), rotated, ...this.shape.slice(nextRotation + 1)], this.color);
  }

  getBlocks() {
    const blocks = [];
    const currentShape = this.shape[this.rotation];
    
    for (let row = 0; row < currentShape.length; row++) {
      for (let col = 0; col < currentShape[row].length; col++) {
        if (currentShape[row][col]) {
          blocks.push({
            x: this.x + col,
            y: this.y + row,
            color: this.color
          });
        }
      }
    }
    
    return blocks;
  }

  copy() {
    const newPiece = new Piece(this.shape, this.color);
    newPiece.x = this.x;
    newPiece.y = this.y;
    newPiece.rotation = this.rotation;
    return newPiece;
  }
}

const PIECES = {
  I: {
    shape: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0]
      ]
    ],
    color: 'cyan'
  },
  O: {
    shape: [
      [
        [1, 1],
        [1, 1]
      ]
    ],
    color: 'yellow'
  },
  T: {
    shape: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0]
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0]
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0]
      ]
    ],
    color: 'magenta'
  },
  S: {
    shape: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1]
      ]
    ],
    color: 'green'
  },
  Z: {
    shape: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0]
      ]
    ],
    color: 'red'
  },
  J: {
    shape: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0]
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1]
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0]
      ]
    ],
    color: 'blue'
  },
  L: {
    shape: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1]
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0]
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0]
      ]
    ],
    color: 'orange'
  }
};

function createRandomPiece() {
  const pieceTypes = Object.keys(PIECES);
  const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
  const pieceData = PIECES[randomType];
  return new Piece(pieceData.shape, pieceData.color);
}

module.exports = { Piece, PIECES, createRandomPiece };
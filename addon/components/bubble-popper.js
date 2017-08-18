import Ember from 'ember';
import TrigometryFunctions from 'npm:trigonometry-calculator';

// Because it's a CommonJS module we can't directly import the individual trig function.
const {trigCalculator} = TrigometryFunctions;

const Projectile = Ember.Object.extend({
  moving: Ember.computed("velocityX", "velocityY", function () {
    return this.get('velocityX') !== 0 || this.get('velocityY') !== 0;
  })
});

const GamePiece = Ember.Object.extend({
  x1: Ember.computed('row', 'column', function () {
    const column = this.get('column');
    const width = this.get('width');
    const offsetX = this.get('offsetX');
    return column * width + offsetX;
  }),
  x2: Ember.computed('row', 'column', function () {
    const x1 = this.get('x1');
    const width = this.get('width');
    return x1 + width;
  }),
  offsetX: Ember.computed("row", "width", function () {
    return (this.get('row') % 2) * (this.get('width') / 2);
  }),
  y1: Ember.computed('row', 'column', function () {
    const row = this.get('row');
    const height = this.get('height');
    return 7 * height * row / 8;
  }),
  y2: Ember.computed('row', 'column', function () {
    const y1 = this.get('y1');
    const height = this.get('height');
    return y1 + height;
  }),
  radius: Ember.computed('width', function () {
    return this.get('width') / 2;
  }),
  centerX: Ember.computed('x1', 'radius', function () {
    return this.get('x1') + this.get('radius');
  }),
  centerY: Ember.computed('y1', 'radius', function () {
    return this.get('y1') + this.get('radius');
  })
});

export default Ember.Component.extend({
  tagName: 'canvas',
  gameWidth: 10,
  gameHeight: 10,
  pieceWidth: 85,

  _start: 0,

  attributeBindings: ['width', 'height'],
  width: Ember.computed(function () {
    return 85 * this.get('gameWidth');
  }),
  height: Ember.computed('playerHeight', function () {
    // @todo This is inaccurate. The rows actually squeeze together.
    const gameBoardHeight = (7 * this.get('pieceWidth') * this.get('gameHeight') / 8) + (85 / 8);
    const buffer = this.get('pieceWidth');
    const playerHeight = this.get('playerHeight');
    return gameBoardHeight + buffer + playerHeight;
  }),
  gameBoard: [],

  initializeAGameBoard() {
    const gameWidth = this.get('gameWidth');
    for (let row = 0; row < this.get('gameHeight'); row++) {
      for (let column = 0; column < gameWidth; column++) {
        // Uneven rows can hold 1 less.
        if (row % 2 !== 0 && (column + 1) === gameWidth) {
          break;
        }
        const type = Math.round(Math.random() * 10) % 5;
        this.addGamePiece(row, column);
      }
    }
  },

  resourceLoaded() {
    if (this.decrementProperty("_start") === 0) {
      this.startGame();
    }
  },

  loadResource(path, name) {
    const image = new Image();
    image.onload = this.resourceLoaded.bind(this);
    image.src = path;
    this.set(name, image);
    this.incrementProperty("_start");
  },

  /**
   * We don't want to get projectiles for types that have already been cleared.
   */
  availableTypes: Ember.computed.mapBy('gameBoard', 'type'),

  drawBubble(bubble) {
    const ctx = this.get('ctx');
    const bubbles = this.get('bubbles');
    const type = bubble.get('type');
    ctx.drawImage(bubbles,
      type * 85, 0, 85, 85,
      bubble.get('x1'), bubble.get('y1'), 85, 85);
  },

  startGame() {
    const player = this.get('player');

    this.setProperties({
      playerWidth: player.width,
      playerHeight: player.height,
      // We don't want the player to be cut off as it rotates, so we'll calculate the hypotenuse.
      rotatedMaxDimensions: Math.sqrt(Math.pow(player.height, 2) + Math.pow(player.width, 2))
    });

    this.initializeAGameBoard();
    this.addProjectile();

    this.set('lastTime', new Date());
    this.gameLoop();
  },

  updateMovements() {
    const duration = this.get('duration');
    const projectile = this.get('projectile');

    const velocityX = projectile.get('velocityX') * duration;
    const velocityY = projectile.get('velocityY') * duration;

    const positionX = projectile.get('positionX');
    const positionY = projectile.get('positionY');

    projectile.set('positionX', positionX + velocityX);
    projectile.set('positionY', positionY + velocityY);
  },

  getRandomType(all = false) {
    if (all) {
      return Math.round(Math.random() * 10) % 5
    } else {
      const types = this.get('availableTypes');
      return types[Math.round(Math.random() * 10) % types.length];
    }
  },

  addProjectile() {
    this.set('projectile', Projectile.create({
      type: this.getRandomType(),
      speed: 0,
      velocityX: 0,
      velocityY: 0,
      positionX: this.get('width') / 2,
      positionY: this.get('height') - this.get('rotatedMaxDimensions') / 2
    }));
  },

  drawPlayer() {
    const ctx = this.get('ctx');
    const player = this.get('player');
    ctx.save();
    ctx.translate(
      this.get('width') / 2,
      this.get('height') - this.get('rotatedMaxDimensions') / 2
    );

    ctx.rotate((-90 + this.get('playerRotation')) * Math.PI / 180);
    ctx.drawImage(player, -(this.get('playerWidth') / 2), -(this.get('playerHeight') / 2));
    ctx.restore();
  },

  playerRotation: Ember.computed(function () {
    const rotation = this.get('playerOrientation.angles.1');
    const min = 30;
    const max = 180 - min;
    if (rotation < min) {
      return min;
    } else if (rotation > max) {
      return max;
    }
    return rotation;
  }).volatile(),

  drawGameBoard() {
    const gameBoard = this.get("gameBoard");
    gameBoard.forEach(this.drawBubble.bind(this));
  },

  clearBoard() {
    const ctx = this.get('ctx');
    ctx.clearRect(0, 0, this.get('width'), this.get('height'));
  },

  gameLoop() {
    const dateNow = new Date();
    this.set("duration", dateNow - this.get('lastTime'));
    this.set('lastTime', dateNow);

    this.clearBoard();

    // const ctx = this.get('ctx');
    // ctx.beginPath();
    // ctx.lineWidth = 1;
    // ctx.moveTo(parseInt(this.get('width') / 2), 0);
    // ctx.lineTo(parseInt(this.get('width') / 2), this.get('height'));
    // ctx.stroke();

    this.updateMovements();
    this.checkCollision();

    this.drawGameBoard();
    this.drawProjectile();
    this.drawPlayer();

    requestAnimationFrame(this.gameLoop.bind(this));
  },

  addGamePiece(row, column, type = this.getRandomType(true)) {
    const gamePiece = GamePiece.create({
      row,
      column,
      type: type,
      width: this.get('pieceWidth'),
      height: this.get('pieceWidth'),
    });

    this.get('gameBoard').push(gamePiece);
  },

  checkCollision() {
    const width = 85;
    const radius = width / 2;
    const centerX = this.get('projectile.positionX');
    const centerY = this.get('projectile.positionY');

    const projectileX1 = centerX - radius;
    const projectileX2 = projectileX1 + width;
    const projectileY1 = centerY - radius;

    if (projectileX1 <= 0 || projectileX2 > this.get('width')) {
      this.set('projectile.velocityX', -this.get('projectile.velocityX'));
      return;
    }

    let type;
    let column;
    let row;

    if (projectileY1 < 0) {
      column = Math.floor(centerX / width);
      row = 0;
      type = this.getRandomType(false);
    } else {
      const collision = this.getGameBoardCollision();

      if (!collision) {
        return;
      }

      row = collision.get('row') + 1;

      if (centerX < collision.get('centerX')) {
        column = collision.get('column') - (row % 2);
      } else {
        column = collision.get('column') + ((row + 1) % 2);
      }

      type = this.get('projectile.type');
    }

    if (row <= this.get('gameHeight')) {
      this.addGamePiece(row, column, type);
      const similar = this.findSimilar(row, column);

      if (similar.length > 2) {
        this.sendAction('poppedBubbles', similar.length);

        for (const gamePiece of similar) {
          this.removeProjectile(gamePiece.get('row'), gamePiece.get('column'));
        }
      }
    }

    this.addProjectile();
  },

  /**
   * Get the surrounding grid coordinates.
   * @param row
   * @param column
   */
  getNeighbouringCoordinated(row, column) {
    const neighbouringRowColumnOffset = ((row + 1) % 2);

    const neighbours = [
      {row: row - 1, column: column - neighbouringRowColumnOffset},
      {row: row - 1, column: column + 1 - neighbouringRowColumnOffset},

      {row: row, column: column + 1},
      {row: row, column: column - 1},

      {row: row + 1, column: column - neighbouringRowColumnOffset},
      {row: row + 1, column: column + 1 - neighbouringRowColumnOffset},
    ];
    return neighbours.filter(neighbour => this.withinGridBounds(neighbour.row, neighbour.column));
  },

  /**
   * Return true if the row/column is within the bounds of the GameBoard.
   * @param row
   * @param column
   * @returns {boolean}
   */
  withinGridBounds(row, column) {
    return row >= 0 || column >= 0 || this.get('width') < column || this.get('height') < row;
  },

  /**
   * Get the gamePiece at a coordinate.
   * @param row
   * @param column
   */
  getGamePieceAt(row, column) {
    for (const obj of this.get('gameBoard')) {
      if (obj.get('row') === row && obj.get('column') === column) {
        return obj;
      }
    }
    return false;
  },

  getNeighbouringGamePieces(row, column) {
    return this.getNeighbouringCoordinated(row, column)
      .map(coordinate => this.getGamePieceAt(coordinate.row, coordinate.column))
      .filter(obj => obj);
  },

  findSimilar(row, column) {
    const originPiece = this.getGamePieceAt(row, column);
    let check = this.getNeighbouringGamePieces(row, column);

    let checked = [originPiece];
    let found = [originPiece];

    while (check.length > 0) {
      const nextPiece = check.pop();
      checked.push(nextPiece);

      if (nextPiece.get('type') === originPiece.get('type')) {
        found.push(nextPiece);

        let gamePieces = this.getNeighbouringGamePieces(nextPiece.get('row'), nextPiece.get('column'));
        gamePieces = gamePieces.filter(gamePiece => !checked.includes(gamePiece) && !check.includes(gamePiece));

        check = check.concat(gamePieces);
      }
    }
    return found;
  },

  removeProjectile(row, column) {
    const board = this.get('gameBoard').filter(obj => obj.get('row') !== row || obj.get('column') !== column);
    this.set('gameBoard', board);
  },

  getGameBoardCollision() {
    const width = 85;
    const radiusReduction = 0.8;
    const radius = (width / 2) * radiusReduction;
    const centerX = this.get('projectile.positionX');
    const centerY = this.get('projectile.positionY');

    for (const obj of this.get('gameBoard')) {
      const dx = centerX - obj.get('centerX');
      const dy = centerY - obj.get('centerY');
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (radius + radius)) {
        return obj;
      }
    }
    return false;
  },

  drawProjectile() {
    const bubbles = this.get('bubbles');
    const ctx = this.get('ctx');
    const bubble = this.get('projectile.type');
    const positionX = this.get('projectile.positionX');
    const positionY = this.get('projectile.positionY');

    ctx.drawImage(
      bubbles,
      bubble * 85, 0, 85, 85,
      positionX - 85 / 2,
      positionY - 85 / 2,
      85,
      85
    );
  },

  didInsertElement() {
    const ctx = this.element.getContext("2d");
    this.set("ctx", ctx);

    this.loadResource("bubbles.png", "bubbles");
    this.loadResource("player.png", "player");
  },
  click() {
    if (this.get('projectile.moving')) {
      return;
    }
    const radians = this.get("playerRotation") * (Math.PI / 180);
    const directionX = -Math.cos(radians);
    const directionY = Math.sin(-radians);

    this.set('projectile.velocityX', directionX);
    this.set('projectile.velocityY', directionY);
  },

  playerPosition: Ember.computed("height", "width", "playerWidth", "rotatedMaxDimensions", function () {
    return [
      (this.get('width') / 2 + this.get('playerWidth')),
      this.get('height') - this.get('playerHeight')
    ];
  }),

  centerWidth: Ember.computed('width', function () {
    return this.get('width') / 2;
  }),
  playerOrientation: Ember.computed('targetX', 'targetY', 'centerWidth', 'height', function () {
    const clientWidth = document.querySelector('canvas').clientWidth;

    const width = this.get('centerWidth');

    const coordinateMultiplier = width / (clientWidth / 2);

    const height = this.get('height');

    const targetX = this.get('targetX') * coordinateMultiplier;
    const targetY = this.get('targetY') * coordinateMultiplier;

    const playerYCenter = height - this.get('rotatedMaxDimensions') / 2;

    const unsolvedTriangle = {
      angles: {
        2: 90,
      },
      sides: {
        0: parseInt(width - targetX, 10),
        1: parseInt(playerYCenter - targetY, 10),
      },
    };
    return trigCalculator(unsolvedTriangle);
  }),
  mouseMove(e) {
    this.setProperties({
      targetX: e.offsetX,
      targetY: e.offsetY,
    });
  }
});

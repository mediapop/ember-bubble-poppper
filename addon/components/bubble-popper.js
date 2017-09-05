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
  }),
  zoom: 1,
  popped: undefined
});

export default Ember.Component.extend({
  tagName: 'canvas',
  gameWidth: 10,
  gameHeight: 10,
  // @todo Rename to size
  pieceWidth: 85,
  paused: false,
  buffer: 2,
  gameSpeed: 1,

  animationDuration: 1000,
  // @todo rename to frames
  animationSteps: Ember.computed('bubbles', 'size', function () {
    return (this.get('bubbles') / this.get('size'));
  }),

  arc: 120,
  minDegree: Ember.computed('arc', function () {
    return (180 - this.get('arc')) / 2;
  }),
  maxDegree: Ember.computed('minDegree', function () {
    return 180 - this.get('minDegree');
  }),

  _start: 0,

  attributeBindings: ['width', 'height'],
  width: Ember.computed(function () {
    return 85 * this.get('gameWidth');
  }),
  height: Ember.computed('playerHeight', function () {
    const realGameHeight = this.get('gameHeight') + this.get('buffer');

    const gameBoardHeight = (7 * this.get('pieceWidth') * realGameHeight / 8) + (this.get('pieceWidth') / 8);

    const buffer = this.get('pieceWidth');

    const playerHeight = this.get('playerHeight');
    return gameBoardHeight + buffer + playerHeight;
  }),
  gameBoard: [],
  gameBoardIndex: {},

  initializeAGameBoard() {
    const gameWidth = this.get('gameWidth');
    for (let row = 0; row < this.get('gameHeight'); row++) {
      for (let column = 0; column < gameWidth; column++) {
        // Uneven rows can hold 1 less.
        if (row % 2 !== 0 && (column + 1) === gameWidth) {
          break;
        }
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
    image.onload = Ember.run.bind(this, () => {
      if (!(this.get('isDestroyed') || this.get('isDestroying'))) {
        this.resourceLoaded();
      }
    });
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
    let zoom = bubble.get('zoom');
    const size = this.get('pieceWidth');

    const duration = (this.get('lastTime') - bubble.get('popped') * this.get('gameSpeed')) || 0;
    let imageIndex = 0;
    if (duration) {
      const animationProportion = duration / this.get('animationDuration');
      imageIndex = Math.floor((this.get('animationSteps') + 1) * animationProportion);
      if (imageIndex > this.get('animationSteps')) {
        imageIndex = this.get('animationSteps');
      }
      zoom = (zoom + animationProportion)
    }

    const zoomOffset = (size - size * zoom) / 2;

    ctx.drawImage(
      bubbles,
      type * size,
      (size * imageIndex),
      size,
      size,
      bubble.get('x1') + zoomOffset,
      bubble.get('y1') + zoomOffset,
      size * zoom,
      size * zoom);
  },

  startGame() {
    const player = this.get('player');

    this.setProperties({
      playerWidth: player.width,
      playerHeight: player.height,
      // We don't want the player to be cut off as it rotates, so we'll calculate the hypotenuse.
      rotatedMaxDimensions: Math.sqrt(Math.pow(player.height, 2) + Math.pow(player.width, 2))
    });

    this.set('animationSteps', this.get('bubbles').height / this.get('pieceWidth') - 1);

    this.initializeAGameBoard();
    this.addProjectile();

    this.set('lastTime', new Date());
    this.gameLoop();
  },

  updateMovements() {
    const duration = this.get('duration') * this.get('gameSpeed');
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
      return types[Math.floor(Math.random() * 1000) % types.length];
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
    const min = this.get('minDegree');
    const max = this.get('maxDegree');

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

  willDestroyElement() {
    cancelAnimationFrame(this.get('runLoop'));
  },

  gameLoop() {
    if (this.get('isDestroyed') || this.get('isDestroying')) {
      return;
    }
    this.set('runLoop', requestAnimationFrame(Ember.run.bind(this, this.gameLoop)));

    const dateNow = new Date();
    this.set("duration", dateNow - this.get('lastTime'));
    this.set('lastTime', dateNow);

    if (this.get('paused')) {
      return;
    }

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

    // Clear popped bubbles.
    let board = this.get('gameBoard');
    let gameBoardIndex = this.get('gameBoardIndex');
    const animationDuration = this.get('animationDuration');
    board = board.filter(obj => {
      const popped = obj.get('popped');
      if (!popped) {
        return true;
      }
      let active = (dateNow - popped) < animationDuration;
      if (!active) {
        gameBoardIndex[obj.get('row')][obj.get('column')] = undefined;
      }
      return active;
    });
    this.set('gameBoard', board);
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
    const index = this.get('gameBoardIndex');
    if (!index[row]) {
      index[row] = {};
    }
    index[row][column] = gamePiece
  },

  checkCollision() {
    const width = this.get('pieceWidth');
    const radius = width / 2;
    const centerX = this.get('projectile.positionX');
    const centerY = this.get('projectile.positionY');

    const projectileX1 = centerX - radius;
    const projectileX2 = projectileX1 + width;
    const projectileY1 = centerY - radius;

    if (projectileX1 < 0) {
      this.set('projectile.positionX', radius);
      return this.set('projectile.velocityX', Math.abs(this.get('projectile.velocityX')));
    } else if (projectileX2 > this.get('width')) {
      this.set('projectile.positionX', this.get('width') - radius);
      return this.set('projectile.velocityX', -Math.abs(this.get('projectile.velocityX')));
    }

    let type;
    let column;
    let row;

    if (projectileY1 < 0) {
      column = Math.floor(centerX / width);
      row = 0;
      type = this.get('projectile.type');
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

    this.addGamePiece(row, column, type);
    const similar = this.findSimilar(row, column);

    if (similar.length > 2) {
      this.sendAction('poppedBubbles', similar.length);

      for (const gamePiece of similar) {
        this.removeProjectile(gamePiece.get('row'), gamePiece.get('column'));
      }

      this.clearOrphans();
    } else if (row >= (this.get('gameHeight') + this.get('buffer'))) {
      this.removeProjectile(row, column);
    }

    this.addProjectile();
  },

  clearOrphans() {
    const all = [];

    for (let column = 0; column < this.get('gameWidth'); column++) {
      const gamePiece = this.getGamePieceAt(0, column);
      if (all.includes(gamePiece) || gamePiece === false) {
        continue;
      }

      const matches = this.getAllConnected(gamePiece).filter(gamePiece => !all.includes(gamePiece));
      all.push(...matches);
    }

    this.get('gameBoard')
      .filter(gamePiece => !all.includes(gamePiece))
      .forEach(gamePiece => {
        this.removeProjectile(gamePiece.get('row'), gamePiece.get('column'));
      });
  },

  /**
   *
   * @param gamePiece The game piece to find connections with.
   * @returns {Array}
   */
  getAllConnected(gamePiece) {
    const check = [gamePiece];
    const found = [];
    while (check.length) {
      const next = check.pop();
      found.push(next);
      const neighbouring = this.getNeighbouringGamePieces(next.get('row'), next.get('column'))
        .filter(obj => !obj.get('popped'));
      const newPieces = neighbouring.filter(obj => !found.includes(obj) && !check.includes(obj));
      check.push(...newPieces);
    }

    return found;
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
    const board = this.get('gameBoard');
    for (let obj of board) {
      if (obj.get('popped')) {
        continue;
      }
      if (obj.get('row') === row && obj.get('column') === column) {
        obj.set('popped', this.get('lastTime'));
        break;
      }
    }
  },

  getGameBoardCollision() {
    const width = this.get('pieceWidth');
    const radiusReduction = 0.8;
    const radius = (width / 2) * radiusReduction;
    const centerX = this.get('projectile.positionX');
    const centerY = this.get('projectile.positionY');

    for (const obj of this.get('gameBoard').filter(obj => !obj.get('popped'))) {
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
    const size = this.get('pieceWidth');

    ctx.drawImage(
      bubbles,
      bubble * size,
      0,
      size,
      size,
      positionX - size / 2,
      positionY - size / 2,
      size,
      size
    );
  },

  didInsertElement() {
    const ctx = this.element.getContext("2d");
    this.set("ctx", ctx);

    this.loadResource("/bubbles.png", "bubbles");
    this.loadResource("/player.png", "player");
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

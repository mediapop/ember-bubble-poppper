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
  
});

export default Ember.Component.extend({
  tagName: 'canvas',
  gameWidth: 10,
  gameHeight: 10,

  _start: 0,

  attributeBindings: ['width', 'height'],
  width: Ember.computed(function () {
    return 85 * this.get('gameWidth');
  }),
  height: Ember.computed(function () {
    // @todo This is inaccurate. The rows actually squeeze together.
    return 85 * this.get('gameHeight');
  }),

  gameBoard: Ember.computed(function () {
    const board = [];
    const gameWidth = this.get('gameWidth');
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < gameWidth; column++) {
        // Uneven rows can hold 1 less.
        if (row % 2 !== 0 && (column + 1) === gameWidth) {
          break;
        }
        const bubbleType = Math.round(Math.random() * 10) % 5;
        board.push([row, column, bubbleType]);
      }
    }
    return board;
  }),

  collisionObjects: Ember.computed('gameBoard', function(){
    return this.get('gameBoard').map(obj => {
      return {
        x1: obj[1] * 85,
        y1: obj[0] * 85,
        x1: obj[1] * 85,
        y1: obj[0] * 85
      }
    });
  }),

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

  drawBubble(row, column, bubble) {
    const ctx = this.get('ctx');
    const bubbles = this.get('bubbles');
    const offsetX = (row % 2) * (85 / 2);
    const offsetY = row * 85 / 8;

    ctx.drawImage(bubbles,
      bubble * 85, 0, 85, 85,
      column * 85 + offsetX, row * 85 - offsetY, 85, 85);
  },

  startGame() {
    const player = this.get('player');

    this.setProperties({
      playerWidth: player.width,
      playerHeight: player.height,
      // We don't want the player to be cut off as it rotates, so we'll calculate the hypotenuse.
      rotatedMaxDimensions: Math.sqrt(Math.pow(player.height, 2) + Math.pow(player.width, 2))
    });

    const ctx = this.get('ctx');

    this.addProjectile();

    this.gameLoop();
  },

  updateMovements() {
    const projectile = this.get('projectile');
    const velocityX = projectile.get('velocityX');
    const velocityY = projectile.get('velocityY');
    const positionX = projectile.get('positionX');
    const positionY = projectile.get('positionY');
    projectile.set('positionX', positionX + velocityX);
    projectile.set('positionY', positionY + velocityY);
  },

  addProjectile() {
    this.set('projectile', Projectile.create({
      type: 0,
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
    gameBoard.forEach(bubble => {
      this.drawBubble.apply(this, bubble);
    });
  },

  clearBoard() {
    const ctx = this.get('ctx');
    ctx.clearRect(0, 0, this.get('width'), this.get('height'));
  },

  gameLoop() {
    this.clearBoard();
    const ctx = this.get('ctx');

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.moveTo(parseInt(this.get('width') / 2), 0);
    ctx.lineTo(parseInt(this.get('width') / 2), this.get('height'));
    ctx.stroke();

    this.updateMovements();
    this.checkCollision();

    this.drawGameBoard();
    this.drawProjectile();
    this.drawPlayer();

    requestAnimationFrame(this.gameLoop.bind(this));
  },

  checkCollision() {
    const projectileX1 = this.get('projectile.positionX') - (85 / 2);
    const projectileX2 = projectileX1 + 85;
    const projectileY2 = this.get('projectile.positionY') + (85 / 2);

    if (projectileX1 <= 0 || projectileX2 > this.get('width')) {
      this.set('projectile.velocityX', -this.get('projectile.velocityX'));
    } else if (projectileY2 < 0) {
      this.addProjectile();
    } else {
      this.get('gameBoard').forEach(obj => {
        debugger;
      });
    }
  },

  drawProjectile(){
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

  draw() {

  },

  didInsertElement() {
    const ctx = this.element.getContext("2d");
    this.set("ctx", ctx);

    this.loadResource("bubbles.png", "bubbles");
    this.loadResource("player.png", "player");
  },
  click() {
    if(this.get('projectile.moving')){
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
    const width = this.get('centerWidth');
    const height = this.get('height');
    const targetX = this.get('targetX');
    const targetY = this.get('targetY');
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

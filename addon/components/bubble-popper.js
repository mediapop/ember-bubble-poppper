import Ember from 'ember';
import TrigometryFunctions from 'npm:trigonometry-calculator';

// Because it's a CommonJS module we can't directly import the individual trig function.
const {trigCalculator} = TrigometryFunctions;

export default Ember.Component.extend({
  tagName: 'canvas',
  gameWidth: 10,
  gameHeight: 10,

  attributeBindings: ['width', 'height'],
  width: Ember.computed(function () {
    return 85 * this.get('gameWidth');
  }),
  height: Ember.computed(function () {
    // @todo This is inaccurate. The rows actually squeeze together.
    return 85 * this.get('gameHeight');
  }),

  didInsertElement() {
    const ctx = this.element.getContext("2d");
    this.set("ctx", ctx);
    const bubbles = new Image();

    function drawTo(row, column, bubble) {
      const offsetX = (row % 2) * (85 / 2);
      const offsetY = row * 85 / 8;


      ctx.drawImage(bubbles,
        bubble * 85, 0, 85, 85,
        column * 85 + offsetX, row * 85 - offsetY, 85, 85);
    }

    bubbles.src = 'bubbles.png';
    bubbles.onload = function () {
      drawTo(0, 0, 0);
      drawTo(0, 1, 1);
      drawTo(0, 2, 2);
      drawTo(0, 3, 3);
      drawTo(0, 4, 4);
      drawTo(0, 5, 0);
      drawTo(0, 6, 1);
      drawTo(0, 7, 2);
      drawTo(0, 8, 3);
      drawTo(0, 9, 4);

      drawTo(1, 0, 0);
      drawTo(1, 1, 1);
      drawTo(1, 2, 2);
      drawTo(1, 3, 3);
      drawTo(1, 4, 4);
      drawTo(1, 5, 0);
      drawTo(1, 6, 1);
      drawTo(1, 7, 2);
      drawTo(1, 8, 3);

      drawTo(2, 0, 0);
      drawTo(2, 1, 1);
      drawTo(2, 2, 2);
      drawTo(2, 3, 3);
      drawTo(2, 4, 4);
      drawTo(2, 5, 0);
      drawTo(2, 6, 1);
      drawTo(2, 7, 2);
      drawTo(2, 8, 3);
      drawTo(2, 9, 4);
    };
    this.set("bubbles", bubbles);
  },
  click(e) {
    console.log(e);
  },

  centerWidth: Ember.computed('width', function () {
    return this.get('width') / 2;
  }),
  playerOrientation: Ember.computed('targetX', 'targetY', 'centerWidth', 'height', function () {
    const width = this.get('centerWidth');
    const height = this.get('height');

    let unsolvedTriangle = {
      angles: {
        2: 90,
      },
      sides: {
        0: parseInt(width - e.offsetX, 10),
        1: parseInt(height - e.offsetY, 10),
      },
    };
    return trigCalculator(unsolvedTriangle);
  }),
  mouseMove(e) {
    this.setProperties({
      'targetX': e.offsetX,
      'targetY': e.offsetY,
    });
  }
});

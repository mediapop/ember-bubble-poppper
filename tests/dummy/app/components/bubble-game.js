import Ember from 'ember';

export default Ember.Component.extend({
  points: 0,
  actions: {
    poppedBubbles(amount) {
      this.set("points", this.get('points') + amount * 10);
    }
  }
});

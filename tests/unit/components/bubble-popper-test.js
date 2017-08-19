import {moduleForComponent, test} from 'ember-qunit';

moduleForComponent('bubble-popper', 'Unit | Component | bubble popper', {
  // Specify the other units that are required for this test
  // needs: ['component:foo', 'helper:bar'],
  unit: true
});
//
// test('it renders', function (assert) {
//   // Creates the component instance
//   /*let component =*/
//   this.subject();
//   // Renders the component to the page
//   this.render();
//   assert.equal(this.$().text().trim(), '');
// });
//
// test('getAllConnected() should get a neighbour', function (assert) {
//   const component = this.subject();
//   component.addGamePiece(0, 0);
//   component.addGamePiece(1, 0);
//
//   const gamePiece = component.getGamePieceAt(0, 0);
//
//   const connectedGamePieces = component.getAllConnected(gamePiece);
//
//   assert.equal(component.get('gameBoard.length'), connectedGamePieces.length);
// });
//
// test('getAllConnected() should get far away neighbours', function (assert) {
//   const component = this.subject();
//   component.addGamePiece(2, 0);
//   component.addGamePiece(1, 0);
//   component.addGamePiece(0, 0);
//   component.addGamePiece(0, 1);
//   component.addGamePiece(0, 2);
//
//   const gamePiece = component.getGamePieceAt(0, 0);
//
//   const connectedGamePieces = component.getAllConnected(gamePiece);
//
//   assert.equal(component.get('gameBoard.length'), connectedGamePieces.length);
// });

test('getAllConnected() should not get disconnected neighbours', function (assert) {
  const component = this.subject();
  component.addGamePiece(2, 0);
  component.addGamePiece(1, 0);
  component.addGamePiece(0, 0);
  component.addGamePiece(0, 2);

  const gamePiece = component.getGamePieceAt(0, 0);

  const connectedGamePieces = component.getAllConnected(gamePiece);

  assert.equal(component.get('gameBoard.length') - 1, connectedGamePieces.length);
});

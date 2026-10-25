import axes from '../data/axes.json';
import animals from '../data/animals.json';

test('データを読み込める', () => {
  expect(axes.axes).toHaveLength(5);
  expect(animals.animals).toHaveLength(16);
});

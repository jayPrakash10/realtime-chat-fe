import { highlightMatches } from './highlight';

describe('highlightMatches', () => {
  it('marks every case-insensitive match', () => {
    expect(highlightMatches('Pizza and PIZZA', 'pizza')).toEqual([
      { text: 'Pizza', match: true },
      { text: ' and ', match: false },
      { text: 'PIZZA', match: true },
    ]);
  });

  it('returns the whole text when the term is empty', () => {
    expect(highlightMatches('hello', '  ')).toEqual([{ text: 'hello', match: false }]);
  });
});

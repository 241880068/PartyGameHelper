/**
 * Returns a shuffled copy of an array using the Fisher-Yates algorithm.
 * The source array is never modified.
 */
export function shuffle(items, random = Math.random) {
  if (!Array.isArray(items)) {
    throw new TypeError('shuffle expects an array');
  }

  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }

  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

/**
 * Returns one random item without modifying the source array.
 */
export function randomItem(items, random = Math.random) {
  if (!Array.isArray(items)) {
    throw new TypeError('randomItem expects an array');
  }

  if (items.length === 0) {
    return undefined;
  }

  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }

  return items[Math.floor(random() * items.length)];
}

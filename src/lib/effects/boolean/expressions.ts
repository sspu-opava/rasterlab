const channels: Record<string, string> = { ar: 'a.r', ag: 'a.g', ab: 'a.b', br: 'b.r', bg: 'b.g', bb: 'b.b', al: 'luminance(a)', bl: 'luminance(b)' };
const functions: Record<string, number> = { abs: 1, min: 2, max: 2, clamp: 3, mix: 3, sin: 1, cos: 1, floor: 1, fract: 1 };
/** Small arithmetic grammar. No eval, member access, assignments or user-supplied shader code. */
export function compileChannelExpression(source: string): string {
  if (source.length > 256) throw new Error('Výraz může mít nejvýše 256 znaků.');
  const tokens: string[] = []; let position = 0;
  while (position < source.length) {
    if (/\s/.test(source[position])) { position++; continue; }
    const match = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|^[a-zA-Z][a-zA-Z0-9]*|^[()+*/,-]/);
    if (!match) throw new Error(`Nepovolený znak ve výrazu na pozici ${position + 1}.`);
    tokens.push(match[0]); position += match[0].length;
    if (tokens.length > 128) throw new Error('Výraz je příliš složitý.');
  }
  let cursor = 0;
  const expression = (depth: number): string => {
    let left = product(depth + 1);
    while (tokens[cursor] === '+' || tokens[cursor] === '-') { const op = tokens[cursor++]; left = `(${left} ${op} ${product(depth + 1)})`; }
    return left;
  };
  const product = (depth: number): string => {
    let left = primary(depth + 1);
    while (tokens[cursor] === '*' || tokens[cursor] === '/') { const op = tokens[cursor++], right = primary(depth + 1); left = op === '/' ? `safeDivide(${left}, ${right})` : `(${left} * ${right})`; }
    return left;
  };
  const primary = (depth: number): string => {
    if (depth > 32) throw new Error('Příliš hluboké vnoření výrazu.');
    const token = tokens[cursor++];
    if (token === '+' || token === '-') return `(${token}${primary(depth + 1)})`;
    if (token === '(') { const nested = expression(depth + 1); if (tokens[cursor++] !== ')') throw new Error('Chybí uzavírací závorka.'); return `(${nested})`; }
    if (token && /^[\d.]/.test(token)) {
      const value = Number(token); if (!Number.isFinite(value) || Math.abs(value) > 1e6) throw new Error('Číselná konstanta musí být konečná a nejvýše 1000000.');
      return Number.isInteger(value) ? `${value}.0` : String(value);
    }
    if (token && Object.hasOwn(channels, token)) return channels[token];
    if (token && Object.hasOwn(functions, token)) {
      if (tokens[cursor++] !== '(') throw new Error(`Funkce ${token} vyžaduje závorky.`);
      const arguments_: string[] = [];
      if (tokens[cursor] !== ')') { arguments_.push(expression(depth + 1)); while (tokens[cursor] === ',') { cursor++; arguments_.push(expression(depth + 1)); } }
      if (tokens[cursor++] !== ')' || arguments_.length !== functions[token]) throw new Error(`Funkce ${token} vyžaduje ${functions[token]} argumentů.`);
      return `${token}(${arguments_.join(', ')})`;
    }
    throw new Error(`Neznámý kanál nebo neplatný operand: ${token ?? 'konec výrazu'}.`);
  };
  const result = expression(0);
  if (cursor !== tokens.length) throw new Error('Neočekávaný konec nebo pokračování výrazu.');
  return result;
}

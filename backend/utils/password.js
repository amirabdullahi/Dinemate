/**
 * Generate a random password using Web Crypto (secure).
 *
 * @param {Object} [opts]
 * @param {number} [opts.length=16] - Total length of the password.
 * @param {boolean} [opts.lower=true] - Include lowercase letters.
 * @param {boolean} [opts.upper=true] - Include uppercase letters.
 * @param {boolean} [opts.digits=true] - Include digits.
 * @param {boolean} [opts.symbols=true] - Include symbols.
 * @param {boolean} [opts.excludeAmbiguous=true] - Exclude chars like O0Il1.
 * @param {string}  [opts.extra=""] - Extra characters to include in the pool.
 * @returns {string}
 */
function generatePassword(opts = {}) {
  const {
    length = 16,
    lower = true,
    upper = true,
    digits = true,
    symbols = true,
    excludeAmbiguous = true,
    extra = "",
  } = opts;

  if (!Number.isInteger(length) || length < 4) {
    throw new Error("length must be an integer ≥ 4");
  }

  // Character sets
  let sets = [];
  const LOWER = "abcdefghijklmnopqrstuvwxyz";
  const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const DIGIT = "0123456789";
  const SYMBOL = `!@#$%^&*()-_=+[]{};:'",.<>/?\\|~\``; // common safe symbols
  const AMBIGUOUS = new Set(["O", "0", "I", "l", "1"]);

  // Helper to optionally remove ambiguous chars
  const maybeFilter = (str) =>
    excludeAmbiguous ? [...str].filter((c) => !AMBIGUOUS.has(c)).join("") : str;

  if (lower) sets.push(maybeFilter(LOWER));
  if (upper) sets.push(maybeFilter(UPPER));
  if (digits) sets.push(maybeFilter(DIGIT));
  if (symbols) sets.push(maybeFilter(SYMBOL));
  if (extra) sets.push([...extra].join(""));

  // Validate we have characters to use
  sets = sets.filter((s) => s.length > 0);
  if (sets.length === 0) {
    throw new Error("No characters available. Enable at least one character group.");
  }

  const pool = [...new Set(sets.join(""))].join(""); // unique pool

  // Web Crypto
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") {
    throw new Error("Web Crypto not available. Use Node 18+/browser with crypto.getRandomValues.");
  }

  // Secure integer in [0, max)
  function randomInt(max) {
    if (max <= 0 || max > 0xffffffff) throw new Error("invalid max");
    const arr = new Uint32Array(1);
    // Rejection sampling to avoid modulo bias
    const limit = Math.floor(0x100000000 / max) * max; // 2^32
    while (true) {
      cryptoObj.getRandomValues(arr);
      const x = arr[0];
      if (x < limit) return x % max;
    }
  }

  // Ensure at least one from each chosen set
  const chars = [];
  for (const set of sets) {
    chars.push(set[randomInt(set.length)]);
  }

  // Fill the rest from the full pool
  while (chars.length < length) {
    chars.push(pool[randomInt(pool.length)]);
  }

  // Fisher–Yates shuffle (secure)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export default generatePassword;

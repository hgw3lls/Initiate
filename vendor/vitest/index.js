const tests = [];

function describe(_name, fn) {
  fn();
}

function it(name, fn) {
  tests.push({ name, fn });
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function expect(actual) {
  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toContain(expected) {
      if (!Array.isArray(actual) && typeof actual !== 'string') {
        throw new Error('toContain expects an array or string');
      }
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    },
    not: {
      toBe(expected) {
        if (Object.is(actual, expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
        }
      },
      toContain(expected) {
        if ((Array.isArray(actual) || typeof actual === 'string') && actual.includes(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to contain ${JSON.stringify(expected)}`);
        }
      },
    },
  };
}

async function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      process.stdout.write(`✓ ${t.name}\n`);
    } catch (error) {
      failed += 1;
      process.stdout.write(`✗ ${t.name}\n${error.stack || error}\n`);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
  }
}

module.exports = {
  describe,
  it,
  expect,
  run,
};

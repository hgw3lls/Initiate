class ZodError extends Error {
  constructor(issues) {
    super('Validation failed');
    this.issues = issues;
  }
}

class BaseSchema {
  safeParse(value) {
    const issues = [];
    const data = this._parse(value, [], issues);
    if (issues.length) return { success: false, error: new ZodError(issues) };
    return { success: true, data };
  }
}

class StringSchema extends BaseSchema {
  _parse(value, path, issues) {
    if (typeof value !== 'string') issues.push({ path, message: 'Expected string' });
    return value;
  }
}

class NumberSchema extends BaseSchema {
  _parse(value, path, issues) {
    if (typeof value !== 'number' || Number.isNaN(value)) issues.push({ path, message: 'Expected number' });
    return value;
  }
}

class UnknownSchema extends BaseSchema {
  _parse(value) { return value; }
}

class EnumSchema extends BaseSchema {
  constructor(values) { super(); this.values = values; }
  _parse(value, path, issues) {
    if (!this.values.includes(value)) issues.push({ path, message: `Expected one of: ${this.values.join('|')}` });
    return value;
  }
}

class ArraySchema extends BaseSchema {
  constructor(inner) { super(); this.inner = inner; }
  _parse(value, path, issues) {
    if (!Array.isArray(value)) { issues.push({ path, message: 'Expected array' }); return value; }
    return value.map((item, idx) => this.inner._parse(item, [...path, idx], issues));
  }
}

class RecordSchema extends BaseSchema {
  constructor(keySchema, valueSchema) { super(); this.keySchema = keySchema; this.valueSchema = valueSchema; }
  _parse(value, path, issues) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { issues.push({ path, message: 'Expected object record' }); return value; }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      this.keySchema._parse(k, [...path, k, 'key'], issues);
      out[k] = this.valueSchema._parse(v, [...path, k], issues);
    }
    return out;
  }
}

class ObjectSchema extends BaseSchema {
  constructor(shape) { super(); this.shape = shape; this.allowUnknown = false; }
  passthrough() { this.allowUnknown = true; return this; }
  _parse(value, path, issues) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { issues.push({ path, message: 'Expected object' }); return value; }
    const out = {};
    for (const [key, schema] of Object.entries(this.shape)) {
      out[key] = schema._parse(value[key], [...path, key], issues);
    }
    if (this.allowUnknown) {
      for (const [k, v] of Object.entries(value)) if (!(k in out)) out[k] = v;
    }
    return out;
  }
}

const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  unknown: () => new UnknownSchema(),
  enum: (values) => new EnumSchema(values),
  array: (schema) => new ArraySchema(schema),
  record: (keySchema, valueSchema) => new RecordSchema(keySchema, valueSchema),
  object: (shape) => new ObjectSchema(shape),
};

module.exports = { z, ZodError };

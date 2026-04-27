class Matrix4 {
  constructor(src) {
    this.elements = new Float32Array(16);
    if (src && src.elements) {
      this.elements.set(src.elements);
    } else {
      this.setIdentity();
    }
  }

  setIdentity() {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8] = 0; e[12] = 0;
    e[1] = 0; e[5] = 1; e[9] = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }

  multiply(other) {
    const a = this.elements;
    const b = other.elements;
    const out = new Float32Array(16);

    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        out[row + col * 4] =
          a[row + 0] * b[0 + col * 4] +
          a[row + 4] * b[1 + col * 4] +
          a[row + 8] * b[2 + col * 4] +
          a[row + 12] * b[3 + col * 4];
      }
    }

    this.elements = out;
    return this;
  }

  translate(x, y, z) {
    const t = new Matrix4();
    t.elements[12] = x;
    t.elements[13] = y;
    t.elements[14] = z;
    return this.multiply(t);
  }

  scale(x, y, z) {
    const s = new Matrix4();
    s.elements[0] = x;
    s.elements[5] = y;
    s.elements[10] = z;
    return this.multiply(s);
  }

  rotate(angle, x, y, z) {
    const rad = (Math.PI * angle) / 180;
    let len = Math.hypot(x, y, z);
    if (len < 0.000001) return this;
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const t = 1 - c;

    const r = new Matrix4();
    const e = r.elements;
    e[0] = x * x * t + c;
    e[1] = y * x * t + z * s;
    e[2] = z * x * t - y * s;
    e[3] = 0;

    e[4] = x * y * t - z * s;
    e[5] = y * y * t + c;
    e[6] = z * y * t + x * s;
    e[7] = 0;

    e[8] = x * z * t + y * s;
    e[9] = y * z * t - x * s;
    e[10] = z * z * t + c;
    e[11] = 0;

    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;

    return this.multiply(r);
  }

  setPerspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan((Math.PI * fovy) / 360);
    const nf = 1 / (near - far);
    const e = this.elements;

    e[0] = f / aspect;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;

    e[4] = 0;
    e[5] = f;
    e[6] = 0;
    e[7] = 0;

    e[8] = 0;
    e[9] = 0;
    e[10] = (far + near) * nf;
    e[11] = -1;

    e[12] = 0;
    e[13] = 0;
    e[14] = 2 * far * near * nf;
    e[15] = 0;
    return this;
  }

  setLookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    let fx = cx - ex;
    let fy = cy - ey;
    let fz = cz - ez;
    let rlf = 1 / Math.hypot(fx, fy, fz);
    fx *= rlf;
    fy *= rlf;
    fz *= rlf;

    let sx = fy * uz - fz * uy;
    let sy = fz * ux - fx * uz;
    let sz = fx * uy - fy * ux;
    let rls = 1 / Math.hypot(sx, sy, sz);
    sx *= rls;
    sy *= rls;
    sz *= rls;

    const tx = sy * fz - sz * fy;
    const ty = sz * fx - sx * fz;
    const tz = sx * fy - sy * fx;

    const e = this.elements;
    e[0] = sx; e[4] = sy; e[8] = sz; e[12] = 0;
    e[1] = tx; e[5] = ty; e[9] = tz; e[13] = 0;
    e[2] = -fx; e[6] = -fy; e[10] = -fz; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;

    return this.translate(-ex, -ey, -ez);
  }
}

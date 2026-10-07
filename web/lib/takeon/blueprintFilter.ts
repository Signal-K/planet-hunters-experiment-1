// Blueprint hue guard for the Takeon surface (SSL-501, SSL-423).
//
// The vendored engine paints some objects with fixed colours (the rover's yellow
// tank and red lamp, green wildlife, orange and purple props). Landnam allows only
// cyan, teal and ice, so this stage filter rotates any saturated pixel outside the
// 165-215 degree band into the teal/cyan band and leaves ice and neutral pixels
// alone. It runs on the host Pixi stage, so the engine itself is untouched.

const VERTEX = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}
vec2 filterTextureCoord(void) { return aPosition * (uOutputFrame.zw * uInputSize.zw); }
void main(void) { gl_Position = filterVertexPosition(); vTextureCoord = filterTextureCoord(); }
`

export const BLUEPRINT_HUE_FRAGMENT = /* glsl */ `
precision mediump float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(void) {
  vec4 px = texture(uTexture, vTextureCoord);
  if (px.a < 0.004) { finalColor = px; return; }
  vec3 hsv = rgb2hsv(px.rgb / px.a);
  float deg = hsv.x * 360.0;
  if (hsv.y > 0.2 && (deg < 165.0 || deg > 215.0)) {
    hsv.x = 188.0 / 360.0;
    hsv.y = min(hsv.y, 0.7);
  }
  finalColor = vec4(hsv2rgb(hsv) * px.a, px.a);
}
`

/** Minimal slice of the Pixi v8 namespace this file needs. */
interface PixiFilterNamespace {
  Filter: new (options: unknown) => unknown
  GlProgram: { from: (options: { vertex: string; fragment: string }) => unknown }
}

export function createBlueprintHueFilter(pixi: unknown): unknown {
  const { Filter, GlProgram } = pixi as PixiFilterNamespace
  return new Filter({ glProgram: GlProgram.from({ vertex: VERTEX, fragment: BLUEPRINT_HUE_FRAGMENT }), resources: {} })
}

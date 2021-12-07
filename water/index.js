const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');
const screen = getRes();
let MOUSE = {
  x: 0,
  y: 0,
  click: 0
};
gl.canvas.width = screen.x;
gl.canvas.height = screen.y;
const SCALE = 8;
const RES = { x: Math.floor(screen.x/SCALE), y: Math.floor(screen.y/SCALE) };


const vs = `#version 300 es
  in vec4 a_position;
  in vec2 a_texcoord;
  out vec2 v_texcoord;

  void main(){
    gl_Position = a_position;
    v_texcoord = a_texcoord;
  }
`;
const fs = `#version 300 es
  precision highp float;
  precision highp sampler2D;

  in vec2 v_texcoord;
  uniform sampler2D u_prevTex;
  uniform sampler2D u_currentTex;
  uniform float u_frame;
  uniform vec2 u_resolution;
  uniform vec3 u_mouse;
  out vec4 outcolor;

  const float dampening = 0.995;

  float getHeight(vec2 p){
    vec2 offset = vec2(1.0 / u_resolution.x, 0.0);
    float a = texture(u_prevTex, p + offset.xy).r;
    float b = texture(u_prevTex, p - offset.xy).r;
    float c = texture(u_prevTex, p + offset.yx).r;
    float d = texture(u_prevTex, p - offset.yx).r;

    float s = 0.0;

    if (u_mouse.z > 0.0) {
      s = smoothstep(4.5,0.5,length(u_mouse.xy - gl_FragCoord.xy));
    } else {
      float t = u_frame * 0.09;
      vec2 pos = fract(floor(t)*vec2(0.456665,0.708618))*u_resolution.xy;
      float amp = 1.0 - step(0.05, fract(t));
      s = -amp * smoothstep(2.5, 0.5, length(pos - gl_FragCoord.xy));
    }

    s -= (texture(u_currentTex, p).r - 0.5) * 2.0;
    s += (a + b + c + d - 2.0);
    s *= dampening;
    s *= min(1.0,(u_frame));
    return s * 0.5 + 0.5;
  }

  void main(){
    outcolor = vec4(getHeight(v_texcoord), 0.0, 0.0, 1.0);
  }
`;

const out_vs = `#version 300 es
  in vec4 a_position;
  in vec2 a_texcoord;
  out vec2 v_texcoord;

  void main(){
    gl_Position = a_position;
    v_texcoord = a_texcoord;
  }
`;
const out_fs = `#version 300 es
  precision highp float;
  precision highp sampler2D;

  in vec2 v_texcoord;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_background;
  uniform vec2 u_resolutionIn;
  uniform vec2 u_resolutionOut;
  out vec4 outcolor;

  const float threshold=0.05;

  #define TEXTURE 0

  void main(){

  #if TEXTURE == 0

    vec2 offset = 1.0/u_resolutionIn;
    float a = texture(u_heightMap, v_texcoord-offset.yx).x;
    float b = texture(u_heightMap, v_texcoord-offset.xy).x;
    float c = texture(u_heightMap, v_texcoord+offset.xy).x;
    float d = texture(u_heightMap, v_texcoord+offset.yx).x;
    
    vec3 grad = normalize(vec3(c - b, d - a, 1.0));
    vec4 tmp_col = texture(u_background, gl_FragCoord.xy/u_resolutionOut + grad.xy*0.35);
    vec3 light = normalize(vec3(0.2, -0.5, 0.7));
    float diffuse = dot(grad, light);
    float spec = pow(max(0.0, -reflect(light, grad).z), 32.0);
    outcolor = mix(tmp_col, vec4(0.7, 0.8, 1.0, 1.0), 0.25)*max(diffuse, 0.0) + spec;

  #elif TEXTURE == 1

		float h = texture(u_heightMap, v_texcoord).r;
		float sh = 1.35 - h*2.0;
    vec3 col = vec3(exp(pow(sh-.75,2.)*-10.), exp(pow(sh-.50,2.)*-20.), exp(pow(sh-.25,2.)*-10.));
    outcolor = vec4(col, 1.0);

  #else

		float h = texture(u_heightMap, v_texcoord).r;
		float sh = 1.35 - h*2.0;
    vec3 col = vec3(exp(pow(sh-.75,2.)*-10.), exp(pow(sh-.50,2.)*-20.), exp(pow(sh-.25,2.)*-10.));
    float bright = 0.3333 * (col.r + col.g + col.b);
    float b = mix(0.0, 1.0, step(threshold, bright));
    outcolor = vec4(vec3(b), 1.0);
    
  #endif
  }
`;

// SETUP SHADER PROGRAM --------------------------------
const program = createProgram(vs, fs);
const output = createProgram(out_vs, out_fs);
// -----------------------------------------------------

// POSITION BUFFER -------------------------------------
const attributes = {
  a_position: [-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1],
  a_texcoord: [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0],
}
const vao = createVAO(program, attributes);
const out_vao = createVAO(output, attributes);
// -----------------------------------------------------

// TEXTURE ---------------------------------------------
const black = new Uint8Array(RES.x * RES.y * 4).fill(128);

const tex_A = createTexture(RES.x, RES.y, black);
const tex_B = createTexture(RES.x, RES.y, black);
const tex_C = createTexture(RES.x, RES.y);
const textures = [tex_A, tex_B, tex_C];

const text = createTexture(screen.x, screen.y, createTextureFromCanvas(screen.x, screen.y, 'HELLO'));
// -----------------------------------------------------

// FRAMEBUFFER -----------------------------------------
const framebuffer = createFramebuffer(tex_C);
// -----------------------------------------------------

// UNIFORMS --------------------------------------------
const u_prevTex = gl.getUniformLocation(program, 'u_prevTex');
const u_currentTex = gl.getUniformLocation(program, 'u_currentTex');
const u_resolution = gl.getUniformLocation(program, 'u_resolution');
const u_mouse = gl.getUniformLocation(program, 'u_mouse');
const u_frame = gl.getUniformLocation(program, 'u_frame');

const u_resolutionIn = gl.getUniformLocation(output, 'u_resolutionIn');
const u_resolutionOut = gl.getUniformLocation(output, 'u_resolutionOut');
const u_heightMap = gl.getUniformLocation(output, 'u_heightMap');
const u_background = gl.getUniformLocation(output, 'u_background');
// -----------------------------------------------------

let count = 0;

let frame = 0;
function step() {
  let a = count%3;
  let b = (count+1)%3;
  let c = (count+2)%3;

  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    textures[c],
    0
  );
  gl.viewport(0, 0, RES.x, RES.y);

  gl.uniform1i(u_prevTex, 0);
  gl.uniform1i(u_currentTex, 1);
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.bindTexture(gl.TEXTURE_2D, textures[a]);
  gl.activeTexture(gl.TEXTURE0 + 1);
  gl.bindTexture(gl.TEXTURE_2D, textures[b]);

  gl.uniform1f(u_frame, frame++);
  gl.uniform2f(u_resolution, RES.x, RES.y);
  gl.uniform3f(u_mouse, MOUSE.x, MOUSE.y, MOUSE.click);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.useProgram(output);
  gl.bindVertexArray(out_vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.uniform2f(u_resolutionIn, RES.x, RES.y);
  gl.uniform2f(u_resolutionOut, screen.x, screen.y);
  gl.uniform1i(u_heightMap, 0);
  gl.uniform1i(u_background, 1);
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.bindTexture(gl.TEXTURE_2D, textures[b]);
  gl.activeTexture(gl.TEXTURE0 + 1);
  gl.bindTexture(gl.TEXTURE_2D, text);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  count+=2;

  requestAnimationFrame(step);
}
step();

document.getElementsByTagName('canvas')[0].addEventListener('mousemove', function(e) {
  const rect = this.getBoundingClientRect();
  MOUSE.x = e.clientX - rect.left;
  MOUSE.y = rect.height - (e.clientY - rect.top) - 1;
  MOUSE.x /= SCALE;
  MOUSE.y /= SCALE;
});

let timeout;
window.addEventListener('mousemove', (e) => {
  clearTimeout(timeout);
  MOUSE.click = 1;
  timeout = setTimeout(function() {MOUSE.click = 0;}, 500);
});
window.addEventListener('mouseup', (e) => MOUSE.click = 0);

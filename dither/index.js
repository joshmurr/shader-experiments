const video = document.getElementById('video');
const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');

const dither_vs = `#version 300 es
  in vec4 a_position;
  in vec2 a_texcoord;
  out vec2 v_texcoord;

  void main(){
    gl_Position = a_position;
    v_texcoord = a_texcoord * vec2(1.0, -1.0);
  }
`;
const dither_fs = `#version 300 es
  precision mediump float;
  precision mediump sampler2D;

  uniform sampler2D u_texture;
  uniform sampler2D u_kernel;
  uniform float u_kernel_size;
  in vec2 v_texcoord;
  out vec4 outcolor;

  float dither(float c) {
    float closestColor = step(.5, c);
    float secondClosestColor = 1.0 - closestColor;
    vec2 offset = mod(gl_FragCoord.xy, u_kernel_size) / u_kernel_size;
    float d = texture(u_kernel, offset).r;
    float dd = abs(closestColor - c);
    return (dd < d) ? closestColor : secondClosestColor;
  }

  float brightness(vec3 c){
    return 0.2126*c.r + 0.7152*c.g + 0.0722*c.b;
  }

  void main(){
    float grey = brightness(texture(u_texture, v_texcoord).rgb);
    outcolor = vec4(vec3(dither(grey)), 1.0);
  }
`;

// SETUP -----------------------------------------------
const program = createProgram(dither_vs, dither_fs);
const attributes = {
  a_position: [-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1],
  a_texcoord: [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0],
}
const vao = createVAO(program, attributes);
// -----------------------------------------------------

// TEXTURE ---------------------------------------------
const small_kernel = new Uint8Array([
  0, 8, 2, 10,
  12, 4, 14, 6, 
  3, 11, 1, 9, 
  15, 7, 13, 5, 
]).map((k) => Math.floor((k / 16) * 255));

const big_kernel = new Uint8Array([
  0,  32, 8,  40, 2,  34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4,  36, 14, 46, 6,  38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3,  35, 11, 43, 1,  33, 9,  41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7,  39, 13, 45, 5,  37,
  63, 31, 55, 23, 61, 29, 53, 21
]).map((k) => Math.floor((k / 64) * 255));

const chosen_kernel = small_kernel;
const kernel_size = Math.sqrt(chosen_kernel.length);

const video_tex = createTexture(gl.canvas.width, gl.canvas.height);
const kernel_tex = createSingleChannelTexture(kernel_size, kernel_size, chosen_kernel);
// -----------------------------------------------------

gl.useProgram(program);
const video_tex_loc = gl.getUniformLocation(program, 'u_texture');
const kernel_tex_loc = gl.getUniformLocation(program, 'u_kernel');
const kernel_size_loc = gl.getUniformLocation(program, 'u_kernel_size');
gl.uniform1f(kernel_size_loc, kernel_size);

function step() {
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.uniform1i(video_tex_loc, 0);
  gl.bindTexture(gl.TEXTURE_2D, video_tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, video);

  gl.activeTexture(gl.TEXTURE0 + 1);
  gl.uniform1i(kernel_tex_loc, 1);
  gl.bindTexture(gl.TEXTURE_2D, kernel_tex);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(step);
}

console.log('glError:', gl.getError());

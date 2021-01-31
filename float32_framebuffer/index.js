const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');

const update_vs = `#version 300 es
  in vec4 a_position;
  in vec2 a_texcoord;
  out vec2 v_texcoord;

  void main(){
    gl_Position = a_position;
    v_texcoord = a_texcoord;
  }
`;
const update_fs = `#version 300 es
  precision mediump float;
  in vec2 v_texcoord;
  out vec4 outcolor;

  void main(){
    outcolor = vec4(v_texcoord - vec2(0.5), 0.0, 1.0);
  }
`;

const render_vs = `#version 300 es
  in vec4 a_position;
  in vec2 a_texcoord;
  out vec2 v_texcoord;

  void main(){
    gl_Position = a_position;
    v_texcoord = a_texcoord;
  }
`;
const render_fs = `#version 300 es
  precision mediump float;
  precision mediump sampler2D;

  uniform sampler2D u_texture;
  in vec2 v_texcoord;
  out vec4 outcolor;

  void main(){
    outcolor = texture(u_texture, v_texcoord);
  }
`;

// SETUP -----------------------------------------------
const update = createProgram(update_vs, update_fs);
const render = createProgram(render_vs, render_fs);
const attributes = {
  a_position: [-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1],
  a_texcoord: [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0],
}
const vao_update = createVAO(update, attributes);
const vao_render = createVAO(render, attributes);
// -----------------------------------------------------

// TEXTURE ---------------------------------------------
// Extension needed to Float32 texture buffer
const ext = gl.getExtension("EXT_color_buffer_float");
if (!ext) {
	alert("need EXT_color_buffer_float");
}
const texture = gl.createTexture();
const tw = th = 2;
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA32F,
  tw, th,
  0,
  gl.RGBA,
  gl.FLOAT,
	null,
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
const u_texture_loc = gl.getUniformLocation(render, 'u_texture');
// -----------------------------------------------------

// FRAMEBUFFER -----------------------------------------
const framebuffer = createFramebuffer(texture);
// -----------------------------------------------------

function glEnumToString(gl, value) {
  for (let key in gl) {
    if (gl[key] === value) {
      return key;
    }
  }
  return `0x${value.toString(16)}`;
}

function log(...args) {
  const elem = document.createElement("p");
  elem.textContent = [...args].join(' ');
  document.body.appendChild(elem);
}

function readPixelsFromBuffer(gl, attachment) {
  gl.readBuffer(attachment);
  const data = new Float32Array(4 * tw * th);
  const x = 0;
  const y = 0;
  const width = tw;
  const height = th;
  const format = gl.RGBA;
  const type = gl.FLOAT;
  gl.readPixels(x, y, width, height, format, type, data);
  log(glEnumToString(gl, attachment), data);
}

function step() {
  gl.useProgram(update);
  gl.bindVertexArray(vao_update);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );
  gl.viewport(0, 0, tw, th);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  readPixelsFromBuffer(gl, gl.COLOR_ATTACHMENT0);

  gl.useProgram(render);
  gl.bindVertexArray(vao_render);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.uniform1f(u_texture_loc, texture);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  readPixelsFromBuffer(gl, gl.COLOR_ATTACHMENT0);
  //requestAnimationFrame(step);
}

step();

console.log('glError:', gl.getError());

const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');
const screen = getRes();
let MOUSE = {
  x: 0,
  y: 0,
  click: 0
};
gl.canvas.width = screen.x;
gl.canvas.height = screen.y;
const SCALE = 36;
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
  uniform vec2 u_resolution;
  uniform vec3 u_mouse;
  out vec4 outcolor;

  void main(){
    outcolor = vec4(vec2(v_texcoord), 0.0, 1.0);
  }
`;

const rfs = `#version 300 es
  precision highp float;
  precision highp sampler2D;

  in vec2 v_texcoord;
	uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec3 u_mouse;
  out vec4 outcolor;

  void main(){
		vec2 st = gl_FragCoord.xy;

		if (u_mouse.z > 0.0) { // zoom
			st -= u_resolution*0.5;
			st = (st/10.0) + (u_mouse.xy * ${SCALE}.0);
		}

		vec2 uv = st / u_resolution;

		outcolor = texture(u_texture, uv);
  }
`;

// SETUP SHADER PROGRAM --------------------------------
const program = createProgram(vs, fs);
const render = createProgram(vs, rfs);
// -----------------------------------------------------

// POSITION BUFFER -------------------------------------
const attributes = {
  a_position: [-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1],
  a_texcoord: [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0],
}
const vao = createVAO(program, attributes);
const vao_render = createVAO(program, attributes);
// -----------------------------------------------------

// TEXTURE ---------------------------------------------
const texA = createTexture(RES.x, RES.y);
// -----------------------------------------------------

// FRAMEBUFFER -----------------------------------------
const framebuffer = createFramebuffer(texA);
// -----------------------------------------------------

// UNIFORMS --------------------------------------------
const u_resolution = gl.getUniformLocation(program, 'u_resolution');

const u_tex_render = gl.getUniformLocation(render, 'u_texture');
const u_resolution_out = gl.getUniformLocation(render, 'u_resolution');
const u_mouse = gl.getUniformLocation(render, 'u_mouse');
// -----------------------------------------------------

function step() {
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(0, 0, RES.x, RES.y);
  gl.uniform2f(u_resolution, RES.x, RES.y);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.useProgram(render);
  gl.bindVertexArray(vao_render);
  gl.viewport(0, 0, screen.x, screen.y);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.uniform2f(u_resolution_out, screen.x, screen.y);
  gl.uniform1i(u_tex_render, 0);
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.bindTexture(gl.TEXTURE_2D, texA);
  gl.uniform3f(u_mouse, MOUSE.x, MOUSE.y, MOUSE.click);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

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

window.addEventListener('mousedown', e => MOUSE.click = 1);
window.addEventListener('mouseup', e => MOUSE.click = 0);

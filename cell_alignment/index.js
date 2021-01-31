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

const update_vs = `#version 300 es
  in vec4 a_position;

  void main(){
    gl_Position = a_position;
  }
`;
const update_fs = `#version 300 es
  precision mediump float;
  precision mediump sampler2D;

  uniform vec2 u_resolution;
  uniform float u_frame;
	uniform sampler2D u_texture;

  out vec4 outcolor;

  #define PI 3.14159265359

  vec2 ang2vec(float a) {
		return vec2(cos(a), sin(a));
  }

	vec2 read(vec2 p){
		return texture(u_texture, p/u_resolution).rg;
	}

	vec2 avgpool(vec2 p) {
		vec2 acc = vec2(0.0);
		for (int y=-1; y<=1; ++y)   
		for (int x=-1; x<=1; ++x) {
			acc += read(p + vec2(x, y));
		}
		return acc / 9.0;
	}

  void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution;
		vec2 v = normalize(avgpool(gl_FragCoord.xy));
		vec2 v0 = read(gl_FragCoord.xy);

		outcolor = vec4(v, v0);
  }
`;

const render_vs = `#version 300 es
  in vec4 a_position;

  void main(){
    gl_Position = a_position;
  }
`;
const render_fs = `#version 300 es
  precision highp float;
  precision highp sampler2D;

  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec3 u_mouse;
  out vec4 outcolor;

  void main(){
		vec2 st = gl_FragCoord.xy;

		if (u_mouse.z > 0.0) { // zoom
			st -= u_resolution*0.5;
			st = (st/10.0) + (u_mouse.xy * 8.0 * 2.0);
		}

    vec2 uv = st / u_resolution;

    vec4 data = texture(u_texture, uv);
    vec2 dir = data.xy;
    outcolor.rg = dir*0.5+0.5;
		outcolor.ba = vec2(0.5, 1.0);
    float diff = length(dir-data.zw);
		outcolor += pow(diff, 0.33)*1.5;
  }
`;

// SETUP -----------------------------------------------
const update = createProgram(update_vs, update_fs);
const render = createProgram(render_vs, render_fs);
const attributes = {
  a_position: [-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1],
}
const vao_update = createVAO(update, attributes);
const vao_render = createVAO(render, attributes);
// -----------------------------------------------------

// TEXTURE ---------------------------------------------
const ext = gl.getExtension("EXT_color_buffer_float");
if (!ext) {
	alert("need EXT_color_buffer_float");
}
const tex_A = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex_A);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA32F,
  RES.x, RES.y,
  0,
  gl.RGBA,
  gl.FLOAT,
	new Float32Array(randomData(RES.x, RES.y)),
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
const tex_B = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex_B);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA32F,
  RES.x, RES.y,
  0,
  gl.RGBA,
  gl.FLOAT,
	null,
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
const textures = [tex_A, tex_B];
// -----------------------------------------------------

// FRAMEBUFFER -----------------------------------------
const framebuffer = createFramebuffer(tex_B);
// -----------------------------------------------------

// UNIFORMS --------------------------------------------
const u_resolution_update = gl.getUniformLocation(update, 'u_resolution');
const u_texture_update = gl.getUniformLocation(update, 'u_texture');
const u_frame = gl.getUniformLocation(update, 'u_frame');

const u_resolution_render = gl.getUniformLocation(render, 'u_resolution');
const u_mouse = gl.getUniformLocation(render, 'u_mouse');
const u_texture_render = gl.getUniformLocation(render, 'u_texture');
// -----------------------------------------------------


let frame = 0;
let pix = new Uint8Array(4)

const inspector = document.createElement('pre');
document.body.appendChild(inspector);

function step() {
  let a = frame%2;
  let b = (frame+1)%2;

  gl.useProgram(update);
  gl.bindVertexArray(vao_update);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    textures[b],
    0
  );
  gl.viewport(0, 0, RES.x, RES.y);

  gl.uniform1i(u_texture_update, 0);
  gl.bindTexture(gl.TEXTURE_2D, textures[a]);
  gl.uniform1f(u_frame, frame);
  gl.uniform2f(u_resolution_update, RES.x, RES.y);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  //readPixelsFromBuffer(0, 0, 1, 1, gl.COLOR_ATTACHMENT0);

  gl.useProgram(render);
  gl.bindVertexArray(vao_render);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.uniform2f(u_resolution_render, screen.x, screen.y);
  gl.uniform3f(u_mouse, MOUSE.x, MOUSE.y, MOUSE.click);
  gl.uniform1i(u_texture_render, 0);
  gl.bindTexture(gl.TEXTURE_2D, textures[b]);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
	//gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
	//inspector.textContent = pix.join(', ');
	frame++;
	requestAnimationFrame(step);
}

step();

console.log('glError:', gl.getError());

document.getElementsByTagName('canvas')[0].addEventListener('mousemove', function(e) {
  const rect = this.getBoundingClientRect();
  MOUSE.x = e.clientX - rect.left;
  MOUSE.y = rect.height - (e.clientY - rect.top) - 1;
	MOUSE.x /= SCALE;
	MOUSE.y /= SCALE;
});

window.addEventListener('mousedown', (e) => {
  MOUSE.click = 1;
});
window.addEventListener('mouseup', (e) => MOUSE.click = 0);

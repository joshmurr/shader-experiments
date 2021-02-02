const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');
const screen = getRes();
let MOUSE = {
  x: 0,
  y: 0,
  click: 0
};
gl.canvas.width = 512
gl.canvas.height = 512
const SCALE = 1;
const RES = { x: Math.floor(512/SCALE), y: Math.floor(512/SCALE) };


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
  uniform sampler2D u_texture;
  uniform float u_frame;
  uniform vec2 u_resolution;
  uniform vec3 u_mouse;
  out vec4 outcolor;

  const float Da = 1.0;
  const float Db = 0.5;
  const float F  = 0.0545;
  const float K  = 0.062;
  const mat3  laplace = mat3(0.05, 0.2, 0.05, 0.2, -1.0, 0.2, 0.05, 0.2, 0.05);

  vec2 laplacian(vec2 p){
    vec2 sum = vec2(0.0);
    for(int x=-1; x<2; x++){
      for(int y=-1; y<2; y++){
        sum += texture(u_texture, p+vec2(x,y)/u_resolution).rg * laplace[x+1][y+1];
      }
    }
    return sum;
  }

  void main(){
    vec2 o = vec2(0.0);

		vec2 val = texture(u_texture, v_texcoord).xy;
    vec2 l = laplacian(v_texcoord);
    float rgg = val.r*val.g*val.g;
    o.r = val.r + (Da*l.r - rgg + F*(1.0-val.r));
    o.g = val.g + (Db*l.g + rgg - (K+F)*val.g);
    
    if(u_mouse.z > 0.5){
      float diff = length(u_mouse.xy - gl_FragCoord.xy);
      if(diff < 50.0) o.g = (1.0 - smoothstep(1.0, 50.0, diff)) * 0.3;
    }

    outcolor = vec4(o, 0.0, 0.0);
  }
`;

const out_fs = `#version 300 es
  precision highp float;
  precision highp sampler2D;

  in vec2 v_texcoord;
  uniform sampler2D u_diffusion;
  uniform vec2 u_resolution;
  out vec4 outcolor;

  void main(){
    //outcolor = texture(u_diffusion, v_texcoord);
    vec2 col = texture(u_diffusion, v_texcoord).rg;
    float COLOR_MIN = 0.2, COLOR_MAX = 0.4;
    float v = (COLOR_MAX - col.y) / (COLOR_MAX - COLOR_MIN);
    outcolor = vec4(v, v, v, 1);
  }
`;

// SETUP SHADER PROGRAM --------------------------------
const program = createProgram(vs, fs);
const output = createProgram(vs, out_fs);
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
const sq = 20;
const seed = new Float32Array(RES.x * RES.y * 4);
for(let x=0; x<RES.x; x++){
  for(let y=0; y<RES.y; y++){
    let i = (x + y * RES.x) * 4;
		let central_square = (x > (RES.x/2)-sq && x < (RES.x/2) + sq && y > RES.y/2-sq && y < RES.y/2+sq);
		if (central_square) {
			seed[i + 0] = 0.5 + Math.random() * 0.02 - 0.01
			seed[i + 1] = 0.25 + Math.random() * 0.02 - 0.01
			seed[i + 2] = 0
			seed[i + 3] = 0
		} else {
			seed[i + 0] = 1
			seed[i + 1] = 0
			seed[i + 2] = 0
			seed[i + 3] = 0
		}
  }
}
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
  seed
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

gl.useProgram(program);
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
var fb_status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
if (fb_status != gl.FRAMEBUFFER_COMPLETE) {
  console.log("Cannot render to framebuffer: " + fb_status);
}

// UNIFORMS --------------------------------------------
const u_texture = gl.getUniformLocation(program, 'u_texture');
const u_resolution = gl.getUniformLocation(program, 'u_resolution');
const u_mouse = gl.getUniformLocation(program, 'u_mouse');
const u_frame = gl.getUniformLocation(program, 'u_frame');

const u_resolutionOut = gl.getUniformLocation(output, 'u_resolution');
const u_diffusion = gl.getUniformLocation(output, 'u_diffusion');
// -----------------------------------------------------

let frame = 0;
function step() {
  let a = frame%2;
  let b = (frame+1)%2;
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.uniform1i(u_texture, 0);
  gl.bindTexture(gl.TEXTURE_2D, textures[a]);
  gl.uniform1f(u_frame, frame++);
  gl.uniform2f(u_resolution, RES.x, RES.y);
  gl.uniform3f(u_mouse, MOUSE.x, MOUSE.y, MOUSE.click);
  gl.viewport(0, 0, RES.x, RES.y);

  for(let i=0; i<81; i++){
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      textures[b],
      0
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  gl.useProgram(output);
  gl.bindVertexArray(out_vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.uniform2f(u_resolutionOut, screen.x, screen.y);
  gl.uniform1i(u_diffusion, 0);
  gl.bindTexture(gl.TEXTURE_2D, textures[b]);
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

window.addEventListener('mousedown', (e) => {
  MOUSE.click = 1;
});
window.addEventListener('mouseup', (e) => MOUSE.click = 0);

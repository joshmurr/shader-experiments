const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');
const screen = getRes();
let MOUSE = {
  x: 0,
  y: 0,
  click: 0
};
gl.canvas.width = screen.x;
gl.canvas.height = screen.y;
const SCALE = 2;
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
  uniform sampler2D u_texture;
  uniform float u_frame;
  uniform vec2 u_resolution;
  uniform vec3 u_mouse;
  out vec4 outcolor;

  const float Da = 1.0;
  const float Db = 0.5;
  const float f  = 0.055;
  const float k  = 0.062;
  const mat3  laplace = mat3(0.05, 0.2, 0.05, 0.2, -1.0, 0.2, 0.05, 0.2, 0.05);

  vec2 laplacian(vec2 p){
    vec2 sum = vec2(0.0);
    for(int x=-1; x<2; x++){
      for(int y=-1; y<2; y++){
        sum += texture(u_texture, p+vec2(x,y)/u_resolution).rg * laplace[x+1][y+1];
      }
    }
    return sum*sum;
  }

  void main(){
    vec2 p = texture(u_texture, v_texcoord).rg;
    vec2 o = vec2(0.0);
    vec2 l = laplacian(v_texcoord);
    float rgg = p.r*p.g*p.g;
    o.r = p.r + (Da*l.r - rgg + f*(1.0-p.r)) * u_frame * 0.0005;
    o.g = p.g + (Db*l.g + rgg - (k+f)*p.g)   * u_frame * 0.0005;
    
    if(u_mouse.z > 0.5){
      float diff = length(u_mouse.xy - gl_FragCoord.xy);
      if(diff < 50.0) o.g = (1.0 - smoothstep(1.0, 50.0, diff)) * 0.3;
    }
    
    outcolor = vec4(o, 0.0, 1.0);
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
  uniform sampler2D u_diffusion;
  uniform vec2 u_resolution;
  out vec4 outcolor;

  void main(){
    outcolor = texture(u_diffusion, v_texcoord);
  }
`;

// SETUP SHADER PROGRAM --------------------------------
const program = createShader(vs, fs);
const output = createShader(out_vs, out_fs);
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
const seed = new Uint8Array(RES.x * RES.y * 4);
for(let x=0; x<RES.x; x++){
  for(let y=0; y<RES.y; y++){
    let i = (x + y * RES.x) * 4;
    seed[i  ] = 255;
    seed[i+1] = Math.random() < 0.01 ? 255 : 0;
    seed[i+2] = 0;
    seed[i+3] = 0;
  }
}

const tex_A = createTexture(RES.x, RES.y, seed);
const tex_B = createTexture(RES.x, RES.y);
const textures = [tex_A, tex_B];
// -----------------------------------------------------

// FRAMEBUFFER -----------------------------------------
const framebuffer = createFramebuffer(tex_B);
// -----------------------------------------------------

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
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    textures[b],
    0
  );
  gl.viewport(0, 0, RES.x, RES.y);

  gl.uniform1i(u_texture, 0);
  gl.bindTexture(gl.TEXTURE_2D, textures[a]);
  gl.uniform1f(u_frame, frame++);
  gl.uniform2f(u_resolution, RES.x, RES.y);
  gl.uniform3f(u_mouse, MOUSE.x, MOUSE.y, MOUSE.click);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

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

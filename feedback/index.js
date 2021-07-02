const video = document.getElementById('video');
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
  uniform sampler2D u_textureSrc;
  uniform sampler2D u_textureSum;
  uniform float u_frame;
  uniform vec2 u_resolution;
  uniform vec3 u_mouse;
  out vec4 outcolor;


  void main(){
    vec2 st = gl_FragCoord.xy / u_resolution;
    vec2 uv = st;
    
    uv *= 0.998;
    
    vec4 sum = texture(u_textureSum, uv);
    vec4 src = texture(u_textureSrc, st);
    
    sum.rgb = mix(sum.rbg, src.rgb, 0.07);

    outcolor = sum;
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
    outcolor = texture(u_diffusion, v_texcoord * vec2(1.0, -1.0));
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
for(let x=0; x<RES.x; x++){
  for(let y=0; y<RES.y; y++){
    let i = (x + y * RES.x) * 4;
      seed[i + 0] = 255
      seed[i + 1] = 255
      seed[i + 2] = 255
      seed[i + 3] = 255
  }
}
const tex_src = createTexture(RES.x,RES.y, seed); 
const tex_A = createTexture(RES.x,RES.y, seed);
const tex_B = createTexture(RES.x,RES.y);
const textures = [tex_A, tex_B];
// -----------------------------------------------------

// FRAMEBUFFER -----------------------------------------
const framebufferA = createFramebuffer(tex_A);
const framebufferB = createFramebuffer(tex_B);
const FBOs = [framebufferA, framebufferB];
// -----------------------------------------------------


// UNIFORMS --------------------------------------------
const u_textureSum = gl.getUniformLocation(program, 'u_textureSum');
const u_textureSrc = gl.getUniformLocation(program, 'u_textureSrc');
const u_resolution = gl.getUniformLocation(program, 'u_resolution');
const u_mouse = gl.getUniformLocation(program, 'u_mouse');
const u_frame = gl.getUniformLocation(program, 'u_frame');

const u_resolutionOut = gl.getUniformLocation(output, 'u_resolution');
const u_diffusion = gl.getUniformLocation(output, 'u_diffusion');
// -----------------------------------------------------

let frame = 0;
let a, b;
let errors;
function step() {
  a = frame%2;
  b = (frame+1)%2;

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex_src);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, video);
  gl.uniform1i(u_textureSrc, 1);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures[a]);
  gl.uniform1i(u_textureSum, 0);

  gl.uniform2f(u_resolution, RES.x, RES.y);
  gl.uniform3f(u_mouse, MOUSE.x, MOUSE.y, MOUSE.click);
  gl.uniform1f(u_frame, frame);
  gl.bindFramebuffer(gl.FRAMEBUFFER, FBOs[0]);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    textures[b],
    0
  );
  gl.viewport(0, 0, RES.x, RES.y);

  //gl.bindFramebuffer(gl.FRAMEBUFFER, FBOs[a]);
  gl.bindTexture(gl.TEXTURE_2D, textures[a]);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  getErrors(gl)

  gl.useProgram(output);
  gl.bindVertexArray(out_vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.uniform2f(u_resolutionOut, screen.x, screen.y);
  gl.uniform1i(u_diffusion, 0);
  gl.bindTexture(gl.TEXTURE_2D, textures[b]);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  getErrors(gl)

  frame++;
  setTimeout(step, 50);
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

const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2')
const screen = getRes()
let MOUSE = {
  x: 0,
  y: 0,
  click: 0,
}
const SCALE = 1
const RES = { x: Math.floor(screen.x / SCALE), y: Math.floor(screen.y / SCALE) }

gl.canvas.width = screen.x
gl.canvas.height = screen.y

const simple_vert = `#version 300 es
  in vec4 a_position;
  in vec2 a_texcoord;
  out vec2 v_texcoord;

  void main(){
    gl_Position = a_position;
    v_texcoord = a_texcoord;
  }
`
const in_frag = `#version 300 es
  #define TAU 6.28318530718
  #define MAX_ITER 5

  precision highp float;
  precision highp sampler2D;

  in vec2 v_texcoord;
  uniform float u_frame;
  uniform vec2 u_resolution;
  uniform vec3 u_mouse;
  out vec4 outcolor;

  void main(){
    float time = u_frame * 0.001;

    vec2 uv = gl_FragCoord.xy / u_resolution;

    vec2 p = mod(uv*TAU, TAU)-250.0;

    vec2 i = vec2(p);
    float c = 1.0;
    float inten = .005;

    for (int n = 0; n < MAX_ITER; n++) {
      float t = time * (1.0 - (3.5 / float(n+1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0/length(vec2(p.x / (sin(i.x+t)/inten),p.y / (cos(i.y+t)/inten)));
    }
    c /= float(MAX_ITER);
    c = 1.17-pow(c, 1.4);
    vec3 colour = vec3(pow(abs(c), 8.0));
    colour = clamp(colour + vec3(0.0, 0.35, 0.5), 0.0, 1.0);
    

	
    outcolor = vec4(colour, 1.0);
  }
`

const out_frag = `#version 300 es
  #define DITHER
  #define PALETTE_SIZE 16
  #define SUB_PALETTE_SIZE 8
  #define DOWN_SCALE 4.0

  #define RGB(r,g,b) (vec3(r,g,b) / 255.0)

  precision highp float;
  precision highp sampler2D;

  in vec2 v_texcoord;
  uniform sampler2D u_bayer;
  uniform sampler2D u_output;
  uniform vec2 u_resolution;
  out vec4 outcolor;

  vec3 palette[PALETTE_SIZE];
  vec3 subPalette[SUB_PALETTE_SIZE];

  //Initalizes the color palette.
  void InitPalette() {
      //16-Color C64 color palette.
    palette = vec3[](
          RGB(  0,  0,  0),
          RGB(255,255,255),
          RGB(152, 75, 67),
          RGB(121,193,200),	
          RGB(155, 81,165),
          RGB(104,174, 92),
          RGB( 62, 49,162),
          RGB(201,214,132),	
          RGB(155,103, 57),
          RGB(106, 84,  0),
          RGB(195,123,117),
          RGB( 85, 85, 85),	
          RGB(138,138,138),
          RGB(163,229,153),
          RGB(138,123,206),
          RGB(173,173,173)
    );
      
    //8-Color metalic-like sub palette.
    subPalette = vec3[](
          palette[ 6],
          palette[11],
          palette[ 4],
          palette[14],
          palette[ 5],
          palette[ 3],
          palette[13],
          palette[ 1]
    );
    
  }

  //Blends the nearest two palette colors with dithering.
  vec3 GetDitheredPalette(float x, vec2 pixel) {
    float idx = clamp(x,0.0,1.0)*float(SUB_PALETTE_SIZE-1);
    
    vec3 c1 = vec3(0);
    vec3 c2 = vec3(0);
    
    c1 = subPalette[int(idx)];
    c2 = subPalette[int(idx) + 1];
    
    #ifdef DITHER
      float dith = texture(u_bayer, pixel / vec2(8.0)).r;
      float mixAmt = float(fract(idx) > dith);
    #else
      float mixAmt = fract(idx);
    #endif
      
    return mix(c1,c2,mixAmt);
  }

  void main(){
    InitPalette();

    vec2 uv = gl_FragCoord.xy / u_resolution;
    float c = texture(u_output, v_texcoord).r;

    vec2 fg = floor(gl_FragCoord.xy / DOWN_SCALE) * DOWN_SCALE;

    vec3 col = GetDitheredPalette(c, fg / DOWN_SCALE);

    if(uv.x < 0.05) {
      col = GetDitheredPalette(uv.y, fg / DOWN_SCALE);
    }

    outcolor = vec4(col, 1.0);
  }
`

// SETUP SHADER PROGRAM --------------------------------
const program = createProgram(simple_vert, in_frag)
const output = createProgram(simple_vert, out_frag)
//const actual_output = createProgram(gl, actual_out_vs, actual_out_fs)
// -----------------------------------------------------

// POSITION BUFFER -------------------------------------
const attributes = {
  a_position: [-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1],
  a_texcoord: [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0],
}
const vao = createVAO( program, attributes)
const out_vao = createVAO( output, attributes)
// -----------------------------------------------------

// TEXTURE ---------------------------------------------
const black = new Uint8Array(RES.x * RES.y * 4).fill(128)
const tex_out = createTexture( RES.x, RES.y)
const bayerMatrix = createBayerMatrix()
const tex_bayer = createSingleChannelTexture( 8, 8, bayerMatrix)
// -----------------------------------------------------

// FRAMEBUFFER -----------------------------------------
const framebuffer = createFramebuffer( tex_out)
// -----------------------------------------------------

// UNIFORMS --------------------------------------------
const u_resolution = gl.getUniformLocation(program, 'u_resolution')
const u_mouse = gl.getUniformLocation(program, 'u_mouse')
const u_frame = gl.getUniformLocation(program, 'u_frame')

const u_resolutionOut = gl.getUniformLocation(output, 'u_resolution')
const u_frame_ = gl.getUniformLocation(output, 'u_frame')
const u_output = gl.getUniformLocation(output, 'u_output')
const u_bayer = gl.getUniformLocation(output, 'u_bayer')
// -----------------------------------------------------

let count = 0

let frame = 0
function step() {
  let a = count % 3
  let b = (count + 1) % 3
  let c = (count + 2) % 3

  gl.useProgram(program)
  gl.bindVertexArray(vao)
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex_out,
    0
  )
  gl.viewport(0, 0, RES.x, RES.y)

  gl.uniform1f(u_frame, frame++)
  gl.uniform2f(u_resolution, RES.x, RES.y)
  gl.uniform3f(u_mouse, MOUSE.x, MOUSE.y, MOUSE.click)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  gl.useProgram(output)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindVertexArray(out_vao)

  gl.viewport(0, 0, screen.x, screen.y)
  gl.uniform2f(u_resolutionOut, screen.x, screen.y)
  gl.uniform1i(u_output, 0)
  gl.activeTexture(gl.TEXTURE0 + 0)
  gl.bindTexture(gl.TEXTURE_2D, tex_out)
  gl.uniform1i(u_bayer, 1)
  gl.activeTexture(gl.TEXTURE0 + 1)
  gl.bindTexture(gl.TEXTURE_2D, tex_bayer)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  count += 2

  requestAnimationFrame(step)
}
step()

document
  .getElementsByTagName('canvas')[0]
  .addEventListener('mousemove', function (e) {
    const rect = this.getBoundingClientRect()
    MOUSE.x = e.clientX - rect.left
    MOUSE.y = rect.height - (e.clientY - rect.top) - 1
    MOUSE.x /= SCALE
    MOUSE.y /= SCALE
  })

let timeout
window.addEventListener('mousemove', (e) => {
  clearTimeout(timeout)
  MOUSE.click = 1
  timeout = setTimeout(function () {
    MOUSE.click = 0
  }, 500)
})
window.addEventListener('mouseup', (e) => (MOUSE.click = 0))


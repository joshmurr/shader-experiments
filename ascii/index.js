const video = document.getElementById('video');
const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');

const ascii_vs = `#version 300 es
  in vec4 a_position;

  void main(){
    gl_Position = a_position;
  }
`;
const ascii_fs = `#version 300 es
  precision mediump float;
  precision mediump sampler2D;
  uniform sampler2D u_texture;
  out vec4 outcolor;

  #define MONO 0

  float character(int n, vec2 p) {
    p = floor(p*vec2(4.0, -4.0) + 2.5);
    if (clamp(p.x, 0.0, 4.0) == p.x){
      if (clamp(p.y, 0.0, 4.0) == p.y){
      int a = int(round(p.x) + 5.0 * round(p.y));
        if (((n >> a) & 1) == 1) return 1.0;
      }	
     }
    return 0.0;
  }

  void main(){
    vec2 pix = gl_FragCoord.xy * vec2(-1.0);
    vec3 col = texture(u_texture, floor(pix/8.0)*8.0/512.0).rgb;	
    
		float gray = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
    
    int n =  4096;                // .
    if (gray > 0.2) n = 65600;    // :
    if (gray > 0.3) n = 332772;   // *
    if (gray > 0.4) n = 15255086; // o 
    if (gray > 0.5) n = 23385164; // &
    if (gray > 0.6) n = 15252014; // 8
    if (gray > 0.7) n = 13199452; // @
    if (gray > 0.8) n = 11512810; // #
    
    vec2 p = mod(pix/4.0, 2.0) - vec2(1.0);

    #if MONO == 1
      vec4 bw = vec4(vec3(character(n, p)), 1.0);
      vec4 blue = vec4(0.0, 0.341, 1.0, 1.0);
      outcolor = mix(vec4(0), vec4(1), bw);
    #else
      outcolor = vec4(col * character(n, p), 1.0);
    #endif
  }
`;

// SETUP -----------------------------------------------
const program = createProgram(ascii_vs, ascii_fs);
const attributes = {
  a_position: [-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1],
}
const vao = createVAO(program, attributes);
const texture = createTexture(512, 512);
// -----------------------------------------------------

gl.useProgram(program);
gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

function step() {
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, video);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(step);
}

console.log('glError:', gl.getError());

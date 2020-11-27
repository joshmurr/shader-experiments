const video = document.getElementById('video');

function initVideo() {
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        video.srcObject = stream;
      })
      .catch(function (error) {
        console.log('Something went wrong with the webcam...');
      });
  }
}

function stopVideo(e) {
  const stream = video.srcObject;
  const tracks = stream.getTracks();

  for (let i = 0; i < tracks.length; i++) {
    tracks[i].stop();
  }

  video.srcObject = null;
}

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

// SETUP SHADER PROGRAM --------------------------------
const v_shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(v_shader, ascii_vs);
gl.compileShader(v_shader);
const f_shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(f_shader, ascii_fs);
gl.compileShader(f_shader);

const program = gl.createProgram();
gl.attachShader(program, v_shader);
gl.attachShader(program, f_shader);
gl.linkProgram(program);
// -----------------------------------------------------

// POSITION BUFFER -------------------------------------
const pos_attr = gl.getAttribLocation(program, 'a_position');
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1]),
  gl.STATIC_DRAW
);

gl.enableVertexAttribArray(pos_attr);
gl.vertexAttribPointer(pos_attr, 2, gl.FLOAT, false, 0, 0);
// -----------------------------------------------------

// TEXTURE ---------------------------------------------
const texture = gl.createTexture();
gl.activeTexture(gl.TEXTURE0 + 0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGB8,
  512,
  512,
  0,
  gl.RGB,
  gl.UNSIGNED_BYTE,
  null
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
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

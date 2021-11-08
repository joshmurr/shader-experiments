const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');

const dd_vs = `#version 300 es
  in vec4 a_position;

  void main(){
    gl_Position = a_position;
  }
`;
const dd_fs = `#version 300 es
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  out vec4 outcolor;

  float f( vec3 p ) { 
      p.z += u_time;
      return length( cos(p) ) - 1.0; 
  }

  void main() {
      vec2 p = gl_FragCoord.xy;

      // 0.5 determines viewing angle, sort of
      vec3 d = 0.3-vec3(p,1)/u_resolution.x;
      vec3 o = d; 
      
      for( int i=0; i<256; i++ )
          o += f(o)*d;
          
      outcolor = vec4(0,1,2,3);
      outcolor = outcolor *(.1*o.z);
  }
`;

// SETUP -----------------------------------------------
const program = createProgram(dd_vs, dd_fs);
const attributes = {
  a_position: [-1, -1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1],
}
const vao = createVAO(program, attributes);
// -----------------------------------------------------

gl.useProgram(program);
const u_resolution = gl.getUniformLocation(program, 'u_resolution');
const u_time = gl.getUniformLocation(program, 'u_time');
gl.uniform2f(u_resolution, 512, 512);

let frame = 0;
function step(time) {
  gl.uniform1f(u_time, time*0.0001);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  getErrors(gl)
  requestAnimationFrame(step);
}

step()

const video = document.getElementById('video');
const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');

const update_vs = `#version 300 es
  in vec2 a_position;
  in vec2 a_velocity;

  out vec2 v_position;
  out vec2 v_velocity;

  void main(){
    v_position = a_position + a_velocity;
		vec2 multiplier = vec2(1.0);
		if(v_position.x > 1.0) multiplier.x *= -1.0;
		if(v_position.y > 1.0) multiplier.y *= -1.0;
		if(v_position.x < -1.0) multiplier.x *= -1.0;
		if(v_position.y < -1.0) multiplier.y *= -1.0;
    v_velocity = a_velocity * multiplier;
  }
`;
const update_fs = `#version 300 es
	precision mediump float;

	void main() {
		discard;
	}
`;

const render_vs = `#version 300 es
  in vec2 a_position;

  void main(){
    gl_PointSize = 3.0;
		gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;
const render_fs = `#version 300 es
  precision mediump float;
  out vec4 outcolor;

  void main(){
    outcolor = vec4(vec3(0.0), 1.0);
  }
`;

function initialParticleData(num_parts) {
  var data = [];
  for (var i = 0; i < num_parts; ++i) {
    // position
    data.push(Math.random() - 0.5);
    data.push(Math.random() - 0.5);
    // velocity
    data.push((Math.random() - 0.5) * 0.01);
    data.push((Math.random() - 0.5) * 0.01);
  }
  return new Float32Array(data);
}


// SETUP -----------------------------------------------
const update = createProgram(update_vs, update_fs, ['v_position', 'v_velocity']);
const render = createProgram(render_vs, render_fs);

const NUM_PARTICLES = 1000;
const data = initialParticleData(NUM_PARTICLES);

const buffers = [
	createBuffer(data),
  createBuffer(data),
];

const update_opts = (buffer) => ({
  buffer: buffer,
  stride: 4 * 4, // 4 * Float32
  attributes: {
    a_position: {
      num_components: 2,
    },
    a_velocity: {
      num_components: 2,
    },
  }
})

const render_opts = (buffer) => ({
  buffer: buffer,
  stride: 4 * 4, // 4 * Float32
  attributes: {
    a_position: {
      num_components: 2,
    },
  }
})

const update_vaoA = createVAOfromBuffer(update, update_opts(buffers[0]));
const update_vaoB = createVAOfromBuffer(update, update_opts(buffers[1]));
const render_vaoA = createVAOfromBuffer(render, render_opts(buffers[0]));
const render_vaoB = createVAOfromBuffer(render, render_opts(buffers[1]));
//const texture = createTexture(512, 512);
// -----------------------------------------------------

const state = [{
		update: update_vaoA,
		render: render_vaoA,
	},
	{
		update: update_vaoB,
		render: render_vaoB,
	},
];


//gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
let count = 0;

function step() {
  gl.clearColor(0.8, 0.8, 0.8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(update);
	gl.bindVertexArray(state[count%2].update);
  /* Bind the "write" buffer as transform feedback - the varyings of the
     update shader will be written here. */
  gl.bindBufferBase(
    gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffers[++count%2]
	);

  /* Since we're not actually rendering anything when updating the particle
     state, disable rasterization.*/
  gl.enable(gl.RASTERIZER_DISCARD);

  /* Begin transform feedback! */
  gl.beginTransformFeedback(gl.POINTS);
  gl.drawArrays(gl.POINTS, 0, NUM_PARTICLES);
  gl.endTransformFeedback();
  gl.disable(gl.RASTERIZER_DISCARD);
  /* Don't forget to unbind the transform feedback buffer! */
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

  /* Now, we draw the particle system. Note that we're actually
     drawing the data from the "read" buffer, not the "write" buffer
     that we've written the updated data to. */
	gl.bindVertexArray(state[++count%2].render);
  gl.useProgram(render);
  gl.drawArrays(gl.POINTS, 0, NUM_PARTICLES);
	count++;

	window.requestAnimationFrame(step);
}

step();

console.log('glError:', gl.getError());

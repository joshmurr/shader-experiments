// https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
// https://www.shadertoy.com/view/wtBBWh

const gl = document.getElementsByTagName('canvas')[0].getContext('webgl2');

const dd_vs = `#version 300 es
  in vec4 a_position;
	out vec4 v_position;

  void main(){
    gl_Position = a_position;
		v_position = a_position;
  }
`;
const dd_fs = `#version 300 es
	#define MAX_ITERS 100
	#define MAX_DIST  10.
	#define EPS .01
	#define PI 3.1415926538

  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  out vec4 outcolor;
	in vec4 v_position;


	vec3 rot3d(vec3 p, vec3 ax, float angle) {
		float d1 = dot(p, ax);
		vec3 cen = d1*ax;
		float rad = length(cen - p);
		vec3 right = normalize(cen - p);
		vec3 up = normalize(cross(right, ax));
		return cen + right*rad*cos(angle) + up*rad*sin(angle);
	}

	float sphere(vec3  p, float s) {
	  return length(p) - s;
	}

	float displacement(vec3 p, vec3 d, float t) {
		return sin(d.x*p.x+t)*sin(d.y*p.y+t)*sin(d.y*p.z+t);
	}

	float d2(vec3 p) {
		float t = u_time * 1.5;
		//p /= 200.;
		p.x -= t;
		p.y += sin(p.x * 2. + t) * 0.12;
		vec3 c = 0.8 * vec3(sin(p.x + cos(u_time * 2.0) * .8), sin(p.y + u_time * 0.2), sin(p.z * cos(u_time * 3.0) * 0.8));
		c = smoothstep(c+.5, c, vec3(.71));
		c = clamp(c, vec3(0), vec3(1.));

		return dot(c, vec3(0.3));

	}

	float donut(vec3 p, vec2 t) {
		vec2 q = vec2(length(p.xz) - t.x, p.y);
		return length(q)-t.y;
	}

	float smin(float d1, float d2, float k){
		float res = exp(-k*d1) + exp(-k*d2);
		return -log(max(0.0001, res)) / k;
	}

	float opu(float d1, float d2) {
		return min(d1, d2);
	}

	float scene(vec3 p) {
		float res = 1e10;

		p = rot3d(p, vec3(1,0,0), u_time);
		p = rot3d(p, vec3(0,1,0), u_time);

		float k = 32.0;

		//float disp = displacement(p, vec3(6.8), u_time) * 0.2;
		float disp = d2(p);

		res = smin(res, sphere(p, 2.0), k) + disp;

		return res;
	}

	vec3 get_normals(vec3 p) {
		float x1 = scene(p + vec3(EPS, 0, 0));
		float x2 = scene(p - vec3(EPS, 0, 0));
		float y1 = scene(p + vec3(0, EPS, 0));
		float y2 = scene(p - vec3(0, EPS, 0));
		float z1 = scene(p + vec3(0, 0, EPS));
		float z2 = scene(p - vec3(0, 0, EPS));
		return normalize(vec3(x1-x2, y1-y2, z1-z2));
	}

	float intersect(vec3 ro, vec3 rd) {
		float d = 0., closest = 10000.;
		for(int i=0; i<MAX_ITERS; i++) {
			float td = scene(ro + rd*d);
			closest = min(closest, td);
			if(closest < EPS) break;
			d += td;
			if(d > MAX_DIST) break;
		}
		return closest < EPS ? d : -1.;
	}


  void main() {
		vec2 uv = (2. * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
		vec3 cam_pos = vec3(0, 1.1, 4);
		vec3 look_at = vec3(0);
		vec3 cam_dir = normalize(look_at - cam_pos);
		vec3 world_up = vec3(0, 1, 0);
		vec3 cam_right = normalize(cross(cam_dir, world_up));
		vec3 cam_up = normalize(cross(cam_right, cam_dir));
		float foc_dist = 1.;
		vec3 pix_pos = cam_pos + foc_dist*cam_dir + cam_right*uv.x + cam_up*uv.y;
		vec3 ray_dir = normalize(pix_pos - cam_pos);

		float d = intersect(cam_pos, ray_dir);
		vec3 p = cam_pos + d*ray_dir;

		vec3 normals = get_normals(p);
		vec3 light_pos = vec3(10);
		vec3 light_dir = normalize(light_pos - p);
		float ambient = .1;
		float brightness = max(dot(light_dir, normals), ambient);

		vec3 col = d > 0. ? vec3(brightness) : vec3(0);

		col *= vec3(0.5, 0.2, 0.8);

		outcolor = vec4(col, 1.0);
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
  gl.uniform1f(u_time, time*0.001);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  getErrors(gl)
	requestAnimationFrame(step);
}

step()

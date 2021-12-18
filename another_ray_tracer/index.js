// https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
// https://www.shadertoy.com/view/wtBBWh
// https://www.shadertoy.com/view/MtV3Dy

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
	#define TWO_PI 6.283185
	#define PHI 1.6180339887
	#define INV_PHI 0.6180339887

  precision highp float;
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

	float intersectObjects(float d1, float d2) {
		if(d1 > d2) return d1;
		return d2;
	}

	float donut(vec3 p, vec2 t) {
		vec2 q = vec2(length(p.xz) - t.x, p.y);
		return length(q)-t.y;
	}

	float cube(vec3 p, float d) {
		return length(max(abs(p) - d, 0.0));
	}

	float smin(float d1, float d2, float k){
		float res = exp(-k*d1) + exp(-k*d2);
		return -log(max(0.0001, res)) / k;
	}

	float opu(float d1, float d2) {
		return min(d1, d2);
	}

	float plane(vec3 p, vec3 origin, vec3 normal) {
		return dot(p - origin, normal);
	}

	float xzPlane(vec3 p, float y) {
		return p.y - y;
	}

	float xyPlane(vec3 p, float z) {
		return p.z - z;
	}

	float doublePlane(vec3 p, vec3 origin, vec3 normal) {
		return max(dot(p - origin, normal), dot(-p - origin, normal));
	}

	float tetrahedron(vec3 p, float d) {
		float dn = 1.0 / sqrt(3.0);

		float sd1 = plane(p, vec3( d, d, d), vec3(-dn,  dn,  dn));
		float sd2 = plane(p, vec3( d,-d,-d), vec3( dn, -dn,  dn));
		float sd3 = plane(p, vec3(-d, d,-d), vec3( dn,  dn, -dn));
		float sd4 = plane(p, vec3(-d,-d, d), vec3(-dn, -dn, -dn));

		return max(max(sd1, sd2), max(sd3, sd4));
	}

	float octahedron(vec3 p, float d) {
		float t1 = tetrahedron( p, d);
		float t2 = tetrahedron(-p, d);

		return intersectObjects(t1, t2);
	}

	float dodecahedron(vec3 p, float d) {
		vec3 v = normalize(vec3(0.0, 1.0, PHI));
		vec3 w = normalize(vec3(0.0, 1.0,-PHI));

		float ds = doublePlane(p, d*v    , v);
		ds =   max(doublePlane(p, d*w    , w), ds);
		ds =   max(doublePlane(p, d*v.zxy, v.zxy),ds);
		ds =   max(doublePlane(p, d*v.yzx, v.yzx),ds);


		ds =   max(doublePlane(p, d*w.zxy, w.zxy),ds);
		ds =   max(doublePlane(p, d*w.yzx, w.yzx),ds);
		
		return ds;
	}

	float icosahedron(vec3 p, float d) {
		float h = 1.0/sqrt(3.0);

		vec3 v1 = h* vec3(1.0,1.0,1.0);
    vec3 v2 = h* vec3(-1.0,1.0,1.0);
    vec3 v3 = h* vec3(-1.0,1.0,-1.0);
    vec3 v4 = h* vec3(1.0,1.0,-1.0);
   
    vec3 v5 = h* vec3(0.0,INV_PHI,PHI);
    vec3 v6 = h* vec3(0.0,INV_PHI,-PHI);
    
    float ds = doublePlane(p,d*v1,v1);
    //max == intesect objects
		ds = max(doublePlane(p,d*v2,v2),ds);
    ds = max(doublePlane(p,d*v3,v3),ds); 
    ds = max(doublePlane(p,d*v4,v4),ds);
    ds = max(doublePlane(p,d*v5,v5),ds); 
    ds = max(doublePlane(p,d*v6,v6),ds);
    
    //plus cyclic permutaions of v5 and v6:
    ds = max(doublePlane(p,d*v5.zxy,v5.zxy),ds); 
    ds = max(doublePlane(p,d*v5.yzx,v5.yzx),ds);
    ds = max(doublePlane(p,d*v6.zxy,v6.zxy),ds);
    ds = max(doublePlane(p,d*v6.yzx,v6.yzx),ds);

		return ds;
	}

	float scene(vec3 p) {
		float res = 1e10;

		//p = rot3d(p, vec3(1,0,0), u_time);
		//p = rot3d(p, vec3(0,1,0), u_time);

		float k = 32.0;

		//float disp = displacement(p, vec3(6.8), u_time) * 0.2;
		float disp = d2(p);

		//res = smin(res, sphere(p, 1.5), k);// + disp;
		//res = smin(res, cube(p, 1.0), k);// + disp;
		//res = smin(res, octahedron(p, 1.0), k);// + disp;
		//res = smin(res, dodecahedron(p, 1.0), k);// + disp;
		res = smin(res, icosahedron(p, 1.0), k);// + disp;

		res = smin(res, xzPlane(p, -1.75), k);
		//res = smin(res, xyPlane(p, -1.75), k);

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

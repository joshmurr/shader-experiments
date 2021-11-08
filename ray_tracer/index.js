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
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  out vec4 outcolor;
	in vec4 v_position;

  struct Sphere {
    vec3 centre;
    float radius;
    vec3 color;
  };

  struct Ray {
    vec3 origin;
    vec3 direction;
  };

  struct Light {
    vec3 position;
    float ambience;
    vec3 specular;
    vec3 diffuse;
  };

  Sphere spheres[1];
  Ray rays[1];
  Light light[1];

  void init() {
		float x = v_position.x;
		float y = v_position.y;
		float z = v_position.z;
		float focalLength = 2.0;
		vec3 color = vec3(0);

    spheres[0].centre = vec3(-0.8, 0.5, 0.5);
    spheres[0].radius = 0.7;
    spheres[0].color = vec3(1, 0, 0);

    rays[0].origin = vec3(0, 0, 4.0);
		rays[0].direction = normalize(vec3(x-0.5, 0.5-y, -focalLength));

		light[0].position = vec3(0.3, 0.3, 0.9);
		light[0].ambience = 0.01;
  }

	vec3 checkIntersectSphere(Sphere sphere, Ray ray, Light light) {
		vec3 sphereCentre = sphere.centre;
		vec3 colorOfSphere = sphere.color;
		float radius = sphere.radius;
		vec3 cameraSource = ray.origin;
		vec3 cameraDirection = ray.direction;
		vec3 lightSource = light.position;
		float ambience = light.ambience;
		vec3 color = vec3(0.0, 0.0, 0.0);

		vec3 distanceFromCentre = (cameraSource - sphereCentre);
		float B = 2.0 * dot(cameraDirection, distanceFromCentre);
		float C = dot(distanceFromCentre, distanceFromCentre) - pow(radius, 2.0);
		float delta = pow(B, 2.0) - 4.0 * C;
		float t = 0.0;
		if (delta > 0.0) {
				float sqRoot = sqrt(delta);
				float t1 = (-B + sqRoot) / 2.0;
				float t2 = (-B - sqRoot) / 2.0;
				t = min(t1, t2);
		}
		if (delta == 0.0) {
				t = -B / 2.0;
		}

		if (t > 0.0) {
				vec3 surfacePoint = cameraSource + (t * cameraDirection);
				vec3 surfaceNormal = normalize(surfacePoint - sphereCentre);
				color = colorOfSphere * (ambience + ((1.0 - ambience) * max(0.0, dot(surfaceNormal, lightSource))));
		}
		return color;
	}

  void main() {
		init();
		outcolor = vec4(checkIntersectSphere(spheres[0], rays[0], light[0]), 1.0);
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
  //requestAnimationFrame(step);
}

step()

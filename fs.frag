//NOTE: This code is _identitcal_ to that stored in fs.js, but has
// comments. This is to help people learning about raymarching figure
// out what my code is doing! HOWEVER, my code is _slightly_ golfed, so
// I _very much_ recommend looking at the website of Inigo Quilez,
// http://iquilezles.org/, for better tutorials on raymarching.



//High precision floating-point numbers are necessary to make the raymarching function
// on some platforms, because otherwise those platforms skimp on the noise functions.
precision highp float;

//iResolution is the resolution of the framebuffer that I'm going for.
uniform vec2 iResolution;

//Cam is a transform for the camera -- [0:1][0:1] are a xz rotation matrix, 
// [2][0:1] are the xz position. y position is hardcoded.
uniform mat3 cam;

//Target position
uniform vec2 tpos;

//Past target position
uniform vec2 ptpos;

//Scale of the target glow effects -- shrinks as you collect more flowers, to
// make the last few that much harder and that much sweeter.
uniform float tscl;

//Uniform indicating whether we're in the tutorial zone.
uniform float tut;

//Hardcoding in y-positions for TGT, PTGT, and a shaping curve for TSCL.
#define TGT vec3(tpos.x,-7.9,tpos.y)
#define PTGT vec3(ptpos.x,-7.9,ptpos.y)
#define TSCL smoothstep(-0.1,1.,tscl)

//Thanks to Inigo Quilez for Smooth Minimum, iquilezles.org/www/articles/smin/smin.htm
float smin( float a, float b, float k ){
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix(b,a,h) - k*h*(1.0-h);
}

// 2D Random from Book Of Shaders, because magic numbers are hard to find.
float rand2(in vec2 p) {
    return fract(sin(dot(p.xy,
                         vec2(12.9898,78.233)))
                 * 43758.5453123);
}

//I think this noise function is from Book Of Shaders too?
float noise2(in vec2 p){
    vec2 f = floor(p);
    vec2 n = fract(p);
    vec2 h = vec2(0.,1.);
    
    float a = mix(rand2(f),rand2(f+h.yx),n.x);
    float b = mix(rand2(f+h.xy),rand2(f+h.yy),n.x);
    
    return mix(a,b,n.y);
}

//Wraps p across a world of size w by w.
vec2 wrap2(vec2 p, float w){
    //Same as mod(p-0.5*w.,vec2(w))-0.5*w
    return -w*floor(p/w+0.5)+p;
}

//Generates a scaling seed "s" on the range [0.5,1.5] using the 
// position p, for adding variance to the wrapped world segments.
vec2 wrap2ws(vec2 p, float w, out float s){
    vec2 c = floor(p/w+vec2(0.5,0.5));
    s = noise2(p)+0.5;
    //Note here in the return call that we scale our point p
    // by s. This actually changes the final space we observe!
    return wrap2(p,w)*s;
}

//Given 3D point p, returns distance to a 0.5 radius
// cylinder infinite on y centered at xz=(0,0).
float trunk(in vec3 p){
    return length(p.xz)-0.5;
}

//The "scene" function in raymarching is a function from R3 to R1,
// describing the distance between any given point and the closest
// point on a 3D isosurface. It doesn't need to return the 3D iso-
// -surface point -- that's a ray_caster_'s job, which takes a lot
// more code and runtime horsepower under certain conditions.
float scene(in vec3 p){
    //The seed for this segment of world, as defined in wrap2ws().
    float s;

    //The size of each wrapped world segment.
    const float w = 6.;

    //The wrapped point we'll be drawing with
    vec3 pw;
    //Apply the wrapping with some swizzling.
    pw.xzy = vec3(wrap2ws(p.xz,w,s),p.y);

    //r is our return distance
    float r = trunk(pw);

    //Here we apply a spatial abberation that looks somewhat like
    // branches and leaves, starting at a height of -5 and going up.
    // Remember that the player walks around at a height of -6.
    // To explain more clearly, we're reducing the distance to the
    // isosurface dependent on a certain relation of the position.
    // This means that the isosurface has a warped appearance, leading
    // to those somewhat nice-loooking branches.
    r -= abs(5.*sin(pw.x*pw.z+pw.y))
        *smoothstep(-5.,1.,p.y);

    //This one just shrinks the distance to the isosurface as the player
    // gets further away, simulating the "brambles" effect in game where
    // the trees seem to close in as you go the wrong direction.
    r -= 5.*smoothstep(40.,140.,min(length(p.xz-TGT.xz),length(p.xz-PTGT.xz)));

    //Finally, we return our "r". But what's all this other code?
    // r/s reverts the scaling done by wrap2ws(), so that we don't
    //  accidentally "step through" our isosurface.
    // min(8.0+p.y,-p.y) adds a pair of plane isosurfaces to the 
    //  scene -- one at -8. and below, the other at 0. and above.
    // smin(a,b) will take the "smooth minimum" between two distance
    //  fields, giving the nice curved roots on the trees as they
    //  reach the ground plane.
    // -0.1*noise(stuff)*smoothstep(stuff) adds random noise to
    //  our final distance field _everywhere_, to make it look
    //  more natural and forest-ey.
    return smin(
            r/s,
            min(8.0+p.y,-p.y),1./s
            )
            -0.1*noise2(10./s*p.xz)*smoothstep(6.,8.,-p.y);
}

//The march function steps through the distance field in a certain dir
// -ection until it gets close enough to an isosurface that stepping
// further won't make a difference.
// Input o is the 3D point of our camera
// Input r is the (normalized) ray we're projecting.
vec4 march(in vec3 o, in vec3 r){
    //Distance travelled by our ray.
    float t = 0.;

    //Maximum iterations of 64 seemed to run well and give good
    // results on most platforms.
    for(float i=0.;i<64.;++i){
        //Calculate the current point.
        vec3 p = o+r*t;
        //Use the current point to get isosurface distance
        float d = scene(p);
        //If we're basically touching an isosurface, return.
        if(d < 0.0001*t*t){
            return vec4(p,t);
        }
        //If we're super far away, return.
        if(t > 80.0){
           	break;
        }
        //Otherwise, step _half_ the distance to the isosurface.
        // I chose half because my distance field function is
        // technically "not real." All of my noise functions are
        // non-space-preserving, meaning the gradient of the 
        // scene function is not -1 or 1 everywhere,
        // so stepping whole given distances may mean jumping through
        // the isosurface in places, creating super bad abberations.
        t+=d*0.5;
    }
    //If we ran out of iterations or travelled too far, return.
    return vec4(o+r*t,t);
}

//Light function just chooses a color for everything.
vec3 light(in vec3 o, in vec3 r){
    //Adjust the player's height...
    o.y -= 6.;

    //March the scene
    vec4 ret = march(o,r);

    //Get the distance and final point out of the return value
    float t=ret.w;vec3 p=ret.xyz;

    //Generate a smooth distance value for use in some color funcs.
    float d=smoothstep(0.0,0.05,1./length(p.xz-o.xz));
    
    //Color pallete
    const vec3 grnd = vec3(0.025,0.08,0.);
    const vec3 brk = vec3(0.05,0.05,0.);
    const vec3 lvs = vec3(0.02,0.07,0.01);
    const vec3 fr = vec3(.1,0.1,0.05);
    
    //Color between ground and trunk bark
    vec3 roots = mix(grnd,brk,smoothstep(0.,0.1,p.y+6.95+1.1*d)*(1.-0.6*p.y/16.-0.4*noise2(p.xz)));
    //Color between previous color and leaves
    vec3 trs = mix(roots,lvs,smoothstep(0.,1.,p.y+3.));
    //Mix in some far-fog
    vec3 tot = mix(trs,fr,clamp(-p.y/4.,0.,1.)-d);
    
    //Determine how closely the ray approaches the target
    float ca = length(TGT-p);
    //Mix in a big glow effect around the target, to spot at long-distance.
    tot = mix(tot,vec3(0.,0.,1.),smoothstep(-.5,-.1,-ca/TSCL)*smoothstep(-20.,10.,-length(TGT-o)*TSCL));//Big glow
    //Mix in a little glow effect at the target's center, to save players any confusion.
    tot = tot+vec3(0.,0.,1.)*smoothstep(-10.,20.,-ca/tscl);//Small glow
    //Drop away any color outside the tutorial space during the tutorial
    tot = mix(tot,vec3(0.),smoothstep(0.,10.,smoothstep(0.,1.,tut)*length(p.xz)));//Tutorial Space
    //Mix in a fade-out effect as the player wanders into brambles
    tot = mix(tot,vec3(0.),smoothstep(60.,70.,min(length(TGT-o),length(PTGT-o)))); //Darkness
    
    //Return the final color.
    return tot;
}

void main(){
    //Get camera view on [-1,1] by [-aspect ratio, aspect ratio] coordinates
    vec2 u = (2.*gl_FragCoord.xy-iResolution.xy)/iResolution.y;
    
    //Generate camera origin from cam position
    vec3 o = vec3(cam[2][0],0.,cam[2][1]);
    //Generate camera ray by using our u pixel coordinate above
    vec3 r = normalize(vec3(u,1.1));
    //Rotate our camera to face the right way
    r.xz = mat2(cam[0].xy,cam[1].xy)*r.xz;

    //Get the color value from the lighting function, then gamma-correct
    vec3 col = pow(clamp(light(o,r)*2.,0.,1.),vec3(1./2.2));

    //Draw the color to the screen.
    gl_FragColor = vec4(col,1.);
}
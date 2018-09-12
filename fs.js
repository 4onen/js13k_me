const fs = 
`precision highp float;

uniform vec2 iResolution;
uniform mat3 cam;
uniform vec2 tpos;
uniform vec2 ptpos;
uniform float tscl;
uniform float tut;

#define TGT vec3(tpos.x,-7.9,tpos.y)
#define PTGT vec3(ptpos.x,-7.9,ptpos.y)
//todo TGTscl

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

float noise2(in vec2 p){
    vec2 f = floor(p);
    vec2 n = fract(p);
    vec2 h = vec2(0.,1.);
    
    float a = mix(rand2(f),rand2(f+h.yx),n.x);
    float b = mix(rand2(f+h.xy),rand2(f+h.yy),n.x);
    
    return mix(a,b,n.y);
}

vec2 wrap2(vec2 p, float w){
    return p-w*floor(p/w+0.5);
}

vec2 wrap2ws(vec2 p, float w, out float s){
    vec2 c = floor(p/w+vec2(0.5,0.5));
    s = noise2(p)+0.5;
    return wrap2(p,w)*s;
}

float trunk(in vec3 p){
    return length(p.xz)-0.5;
}

float scene(in vec3 p){
    float s;

    const float w = 6.;

    p.xz = wrap2ws(p.xz,w,s);


    float r = trunk(p);
    r += -abs(5.*sin(p.y+p.x*p.z))
        *smoothstep(-5.,1.,p.y);
    return smin(r/s,min(8.0+p.y,-p.y),1./s)-0.1*noise2(10./s*p.xz)*smoothstep(6.,8.,-p.y);
}
        
vec4 march(in vec3 o, in vec3 r){
    float t = 0.;
    for(float i=0.;i<64.;++i){
        vec3 p = o+r*t;
        float d = scene(p);
        if(d < 0.0001*t*t){
            return vec4(p,t);
        }
        if(t > 80.0){
           	break;
        }
        t+=d*0.5;
    }
    return vec4(o+r*t,t);
}

vec3 tgt(in vec3 o, in vec3 r){
    vec3 dir = TGT-o;
    float d = length(dir)*tscl;
    float ca = length(dir-r*d)*tscl;
    return vec3(d,ca,min(d/tscl,length(PTGT-o)));
}

vec3 light(in vec3 o, in vec3 r){
    o.y -= 6.;
    vec4 ret = march(o,r);
    float t=ret.w;vec3 p=ret.xyz;
    float d = smoothstep(0.0,0.05,1./length(p.xz-o.xz));
    
    const vec3 grnd = vec3(0.025,0.08,0.);
    const vec3 brk = vec3(0.05,0.05,0.);
    const vec3 lvs = vec3(0.02,0.07,0.01);
    const vec3 fr = vec3(.1,0.1,0.05);
    
    vec3 roots = mix(grnd,brk,smoothstep(0.,0.1,p.y+6.95+1.1*d)*(1.-0.6*p.y/16.-0.4*noise2(p.xz)));
    vec3 trs = mix(roots,lvs,smoothstep(0.,1.,p.y+3.));
    vec3 tot = mix(trs,fr,clamp(-p.y/4.,0.,1.)-d);
    
    vec3 tgt = tgt(o,r);
    
    tot = mix(tot,vec3(0.),max(tut,smoothstep(40.,60.,tgt.z)));//Darkness
    tot = mix(tot,vec3(0.,0.,1.),smoothstep(-.5,-.1,-tgt.y)*smoothstep(-20.,10.,-tgt.x));//Big glow
    tot = tot+vec3(0.,0.,1.)*smoothstep(-10.,20.,-tgt.y/tscl);//Small glow
    
    return tot;
}

void main(){
    vec2 u = (2.*gl_FragCoord.xy-iResolution.xy)/iResolution.y;
    
    vec3 o = vec3(cam[2][0],0.,cam[2][1]);
    vec3 r = normalize(vec3(u,1.5));
    r.xz = mat2(cam[0].xy,cam[1].xy)*r.xz;

    vec3 col = pow(clamp(light(o,r)*2.,0.,1.),vec3(1./2.2));

    gl_FragColor = vec4(col,1.);
}`
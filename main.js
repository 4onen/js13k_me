//Scoping (keeps global scope cleaner)
(()=>{
    "use strict";

    //Canvas
    var cvs;
    //OpenGL
    var gl;
    //Frame count (since page load)
    var frameCount = 0;
    //Last hi-res timestamp
    var t_last = 0;
    //Uniform pointers
    var uloc =
        { iResolution: -1
        , cam: -1
        , tgtpos: -1
        , ptpos: -1
        };
    
    //Game variables
    var mdl = 
        { dir: 0
        , pos: {x:3,z:0}
        , tgtpos: {x:4,z:20}
        , ptpos: {x:0,z:0}
        , tsgot: 0
        , ksDwn: new Set([])
        };
    
    const rot2dx = (ang,x)=>{
        const s = Math.sin(ang);
        const c = Math.cos(ang);
        return (c+s)*x;
    }

    const rot2dy = (ang,y)=>{
        const s = Math.sin(ang);
        const c = Math.cos(ang);
        return (c-s)*y;
    }

    const kd = k=>mdl.ksDwn.has(k);

    const update = (delta)=>{
        let mv = 0;
        if(kd("ArrowUp")||kd("w"))
            mv += 2;
        if(kd("ArrowDown")||kd("s"))
            mv -= 1.5;
        if(kd("ArrowLeft")||kd("a"))
            mdl.dir -= delta;
        if(kd("ArrowRight")||kd("d"))
            mdl.dir += delta;
        
        if(mv!=0){
            mdl.pos.x += rot2dx(mdl.dir-Math.PI/4,mv*delta);
            mdl.pos.z += rot2dy(mdl.dir-Math.PI/4,mv*delta);
        }

        let dx = mdl.pos.x-mdl.tgtpos.x;
        let dz = mdl.pos.z-mdl.tgtpos.z;
        if(dx*dx+dz*dz < 10){
            mdl.ptpos = mdl.tgtpos;
            mdl.tgtpos.x = 100*(0.5-Math.random());
            mdl.tgtpos.y = 100*(0.5-Math.random());
            mdl.tsgot += 1;
        }

        if(mdl.tsgot == 3){
            alert("You win! All 13 blue flowers found.");
            mdl.tgtpos.x = Infinity;
            mdl.tgtpos.z = Infinity;
            mdl.ptpos.x = Infinity;
            mdl.ptpos.z = Infinity;
            mdl.tsgot = Infinity;
        }
    };

    const draw = (t)=>{
        //FPS
        const delta = (t-t_last)/1000
        if(frameCount%60==0){
            console.log("FPS: "+(1/delta).toString().substring(0,5));
        }
        
        //Game logic
        update(delta);

        //Uniforms
        gl.uniform2f(uloc.iResolution,cvs.width,cvs.height);
        const s = Math.sin(mdl.dir);
        const c = Math.cos(mdl.dir);
        const cam = [c,-s,0.,s,c,0.,mdl.pos.x,mdl.pos.z,0.];
        gl.uniformMatrix3fv(uloc.cam,false,cam);
        gl.uniform2f(uloc.tgtpos,mdl.tgtpos.x,mdl.tgtpos.z);
        gl.uniform2f(uloc.ptpos,mdl.ptpos.x,mdl.ptpos.y);

        //Draw call
        gl.drawArrays(gl.TRIANGLES,0,6);

        //Loop
        requestAnimationFrame(draw);
        t_last = t; frameCount+=1;
    };

    //====Run init====
    //Get OpenGL
    cvs = document.querySelector("canvas");
    gl = cvs.getContext("webgl");
    if(gl === null || gl === undefined){
        alert("Unable to initialize WebGL. Your browser or computer may not support it.");
        return;
    }

    // Show OpenGL acquired
    gl.clearColor(0.4, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    //Shader compiler func
    const shcmp = (src,typ)=>{
        const shdr=gl.createShader(typ);
        gl.shaderSource(shdr,src);
        gl.compileShader(shdr);
        if (!gl.getShaderParameter(shdr, gl.COMPILE_STATUS)){
            let i=gl.getShaderInfoLog(shdr);
            throw 'WebGL compile shdr fail.\n\n' + i;
        }
        return shdr;
    }

    

    //Compile shader programs
    const pg = gl.createProgram();
    gl.attachShader(pg,shcmp(`
precision lowp float;
attribute vec2 vCoord;
void main(){
gl_Position=vec4(vCoord,0.,1.);
}`,gl.VERTEX_SHADER));
    gl.attachShader(pg,shcmp(fs,gl.FRAGMENT_SHADER));
    gl.linkProgram(pg);
    gl.validateProgram(pg);
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) {
        var i = gl.getProgramInfoLog(pg);
        throw 'WebGL compile pg fail.\n\n' + i;
    }
    gl.useProgram(pg);

    //Generate blit (screen-covering rectangle for fragment shader drawing)
    const vs = [-1,1,-1,-1,1,-1, 1,-1,1,1,-1,1];
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vs), gl.STATIC_DRAW);
    //Send blit vertecies to vertex coordinate attribute in vertex shader
    const vc = gl.getAttribLocation(pg,"vCoord");
    if(vc<0){throw "vertexAttribPointer not found";}
    gl.enableVertexAttribArray(vc);//Missing this line breaks it.
    gl.vertexAttribPointer(vc,2,gl.FLOAT,false,0,0);
    //Apparently gl.FLOAT_VEC2 doesn't like me.

    //Store uniform locations
    Object.keys(uloc).forEach(key => {
        const l=gl.getUniformLocation(pg,key);
        uloc[key]=l;
        if(l===null||l<0){
            console.log(key+": "+l);
            throw key+" uloc not found! "+gl.getError();
        }
    });

    gl.viewport(0,0,cvs.width,cvs.height);
    
    //Start main loop
    window.requestAnimationFrame(draw);

    //Enable controls
    const usedKeys = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"]);
    window.addEventListener('keydown',(e)=>{
        if(usedKeys.has(e.key)){
            mdl.ksDwn.add(e.key);
        }
    });
    window.addEventListener('keyup',(e)=>{
        if(usedKeys.has(e.key)){
            mdl.ksDwn.delete(e.key);
        }
    });

//End the function scope, then run it.
})();
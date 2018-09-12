//Scoping (keeps global scope cleaner)
function runGame(){
    "use strict";
    //The target number of glowing blue flowers
    const t_tgt = 13;

    //Canvas
    var cvs;
    //OpenGL
    var gl;
    //Start, Win, and Lose modals
    var start;
    var lose;
    var win;
    //Mobile controls
    var arrowleft;
    var arrowright;
    //Progress counter
    var counter;
    //Frame count (since page load)
    var frameCount = 0;
    //Last hi-res timestamp
    var t_last = 0;
    //Uniform pointers
    var uloc =
        { iResolution: -1
        , cam: -1
        , tpos: -1
        , tscl: -1
        , ptpos: -1
        , tut: -1
        };
    
    //Game variables
    var mdl = 
        { dir: 0
        , pos: {x:3,z:0}
        , tpos: {x:5,z:10}
        , ptpos: {x:0,z:0}
        , tsgot: 0
        , ksDwn: new Set([])
        };
    
    function rot2(x,z,ang){
        const s = Math.sin(ang);
        const c = Math.cos(ang);
        return {x:c*x+s*z,z:c*z-s*x};
    }

    function kd(k){return mdl.ksDwn.has(k);}

    function length(x,z){return Math.sqrt(x*x+z*z);}

    function update(delta){
        var mv = 0;
        if(kd("arrowup")||kd("w"))
            mv += 2;
        if(kd("arrowdown")||kd("s"))
            mv -= 1.5;
        if(kd("arrowleft")||kd("a"))
            mdl.dir -= delta;
        if(kd("arrowright")||kd("d"))
            mdl.dir += delta;
        if(kd("shift"))
            mv *= 2;
        
        
        if(mv!=0){
            const r = rot2(0,mv*delta,mdl.dir);
            mdl.pos.x += r.x;
            mdl.pos.z += r.z;
        }

        const dx = mdl.pos.x-mdl.tpos.x;
        const dz = mdl.pos.z-mdl.tpos.z;
        if(length(dx,dz) < 3.5){
            mdl.ptpos.x = mdl.tpos.x;
            mdl.ptpos.z = mdl.tpos.z;
            mdl.tpos.x = 100*(0.5-Math.random());
            mdl.tpos.z = 100*(0.5-Math.random());
            mdl.tsgot += 1;
            if(counter!=null)
                counter.innerHTML = (mdl.tsgot).toString();
        }
        if(length(dx,dz) > 60){
            if(length(mdl.pos.x-mdl.ptpos.x,mdl.pos.z-mdl.ptpos.z) > 60){
                mdl.tsgot = t_tgt+1;
                lose.classList.add("open");
            }
        }
    };

    function loop(t){
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
        gl.uniform2f(uloc.tpos,mdl.tpos.x,mdl.tpos.z);
        gl.uniform2f(uloc.ptpos,mdl.ptpos.x,mdl.ptpos.z);
        gl.uniform1f(uloc.tscl, 1-mdl.tsgot/(8*t_tgt));
        gl.uniform1f(uloc.tut, mdl.tsgot > 0 ? 0 : 1);

        //Draw call
        gl.drawArrays(gl.TRIANGLES,0,6);

        //Loop
        if(mdl.tsgot < t_tgt)
            requestAnimationFrame(loop);
        else{
            win.classList.add("open");
        }
        t_last = t; frameCount+=1;
    };

    //====Runtime init====
    //Get menus
    start = document.getElementById("start");
    lose = document.getElementById("lose");
    win = document.getElementById("win");
    
    //Hide start menu
    start.classList.remove("open");

    //Get OpenGL
    cvs = document.getElementById("game");
    gl = cvs.getContext("webgl");
    if(gl === null || gl === undefined){
        alert("Unable to initialize WebGL. Your browser or computer may not support it.");
        return;
    }

    // Show OpenGL acquired
    gl.clearColor(0.4, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    //Shader compiler func
    function shcmp(src,typ){
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
        if( l===null || l<0 ){
            throw key+" uloc not found! "+gl.getError();
        }
    });

    gl.viewport(0,0,cvs.width,cvs.height);
    
    //Start main loop
    window.requestAnimationFrame(loop);

    //Enable controls
    const usedKeys = new Set(["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d","shift"]);
    window.addEventListener("keydown",(e)=>{
        const k = e.key.toLowerCase();
        if(usedKeys.has(k)){
            mdl.ksDwn.add(k);
        }
    });
    window.addEventListener("keyup",(e)=>{
        const k = e.key.toLowerCase();
        if(usedKeys.has(k)){
            mdl.ksDwn.delete(k);
        }
    });
    function absorb(e){
        e = e || window.event;
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();
        e.cancelBubble = true;
        e.returnValue = false;
        return false;
    }
    function touchstartFuncGen(k){
        return (e)=>{
            absorb(e);
            mdl.ksDwn.add(k);
        }
    }
    function touchendFuncGen(k){
        return (e)=>{
            absorb(e);
            mdl.ksDwn.delete(k);
        }
    }
    function addtouchcontrol(element,k){
        element.addEventListener("touchstart",touchstartFuncGen(k));
        element.addEventListener("mousedown",touchstartFuncGen(k));
        element.addEventListener("touchend",touchendFuncGen(k));
        element.addEventListener("mouseup",touchendFuncGen(k));
        element.addEventListener("mouseout",touchendFuncGen(k));
        element.addEventListener("mouseleave",touchendFuncGen(k));
        element.addEventListener("touchcancel",touchendFuncGen(k));
        element.addEventListener("mousemove",absorb);
    }
    arrowleft=document.getElementById("left");
    if(arrowleft!=null)
        addtouchcontrol(arrowleft,"arrowleft");

    arrowright=document.getElementById("right");
    if(arrowright!=null)
        addtouchcontrol(arrowright,"arrowright");
    
    addtouchcontrol(cvs,"arrowup");

    counter = document.getElementById("counter");
    if(counter!=null)
        counter.innerHTML = (0).toString();

//End the function scope, then run it.
}
module Main exposing (..)

import Task
import Browser
import Browser.Dom
import Browser.Events
import Browser.Navigation
import Url
import Html exposing (Html)
import Html.Events
import Html.Attributes exposing (style)

import WebGL exposing (Shader)
import Math.Vector2 exposing (Vec2, vec2)
import Math.Vector3 exposing (Vec3, vec3)
import Math.Matrix4 exposing (Mat4)

main = 
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }

type alias Model = 
    { timeSinceStart : Float 
    , delta : Float
    , res : Vec2
    }
    

type Msg 
    = OnAnimationFrameDelta Float
    | OnResize Vec2

init : () -> (Model,Cmd Msg)
init flags =
    ( Model 0 0 (vec2 0 0)
    , Task.perform 
        (\v ->
            OnResize
                <| vec2
                    (v.viewport.width)
                    (v.viewport.height)
        )
        Browser.Dom.getViewport
    )

update msg model = 
    case msg of
        OnAnimationFrameDelta delta ->
            ({model | delta = delta, timeSinceStart = model.timeSinceStart+delta/1000}, Cmd.none)
        OnResize res ->
            ({model | res = res}, Cmd.none)

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Browser.Events.onAnimationFrameDelta OnAnimationFrameDelta
        , Browser.Events.onResize (\x y -> OnResize <| vec2 (toFloat x) (toFloat y))
        ]

view : Model -> Html Msg
view model = 
    Html.div [] 
        [ WebGL.toHtml 
            [ style "width" "100%" 
            , style "height" "100%"
            ] 
            [simpleEntity model]
        {--, Html.div 
            [ style "position" "absolute"
            , style "top" "0"
            , style "left" "0"
            , style "min-width" "100px"
            , style "background-color" "white"
            ]
            [ debugText ("FPS:" ++ (String.fromInt (floor <| 1000/model.delta)))
            , debugText ("Time:" ++ (String.fromInt (floor <| model.timeSinceStart)))
            ]--}
        ]

debugText : String -> Html msg
debugText m =
    Html.p [] [Html.text m]

type alias Vertex = 
    { vP : Vec3 }

type alias Uniforms =
    { pers : Mat4
    , t : Float
    , res : Vec2
    }

type alias Varyings =
    { fP : Vec3 }

simpleEntity model = 
    WebGL.entity
        vertex
        (fragment
        )
        square
        ( Uniforms 
            (Math.Matrix4.identity)
            model.timeSinceStart
            model.res
        )

square = 
    WebGL.indexedTriangles
        (List.map Vertex [ vec3 1.0 -1.0 0.0, vec3 1.0 1.0 0.0, vec3 -1.0 1.0 0.0, vec3 -1.0 -1.0 0.0 ])
        [ (0,1,2),(2,3,0) ]

vertex : Shader Vertex Uniforms Varyings
vertex = [glsl|
precision highp float;

attribute vec3 vP;
uniform mat4 pers;
varying vec3 fP;

void main(){
    gl_Position = pers * vec4(vP,1);
    fP = gl_Position.xyz;
}
|]

fragment : Shader {} Uniforms Varyings
fragment = [glsl|
precision mediump float;

uniform float t;
uniform vec2 res;

varying vec3 fP;

float scene(in vec3 p){
    return length(vec3(0.5*sin(t),.0,1.0)-p)-0.5;
}

vec2 march(in vec3 o,in vec3 r,in float w){
    vec2 t=vec2(0.);
    for(int i=0;i<128;++i){
        vec3 p=o+r*t.x;
        t.y=scene(p);
        t.x+=t.y;
        if(t.y < max(w,w/t.x) || t.y > 100.){
            return t;
        }
    }
}

vec2 zeroCam(in vec2 u){
    return march(vec3(.0),normalize(vec3(u,1.)),0.01);
}

void main(){
    vec2 u = fP.xy;
    u.x*=res.x/res.y;

    vec2 z = zeroCam(u);
    
    gl_FragColor = vec4(mix(vec3(.0),vec3(1.0),clamp(0.0,1.0,z.x*z.x)),1.0);
}
|]
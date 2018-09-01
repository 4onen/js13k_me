module Main exposing (main)

import Browser
import Browser.Navigation
import Url
import Html

main = 
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = always Sub.none
        }

type alias Model = ()

type Msg =
    NoOp

init : () -> (Model,Cmd msg)
init flags =
    ((),Cmd.none)

update msg model = (model, Cmd.none)

view model = 
    --{ title = "Test"
    {--, body = List.singleton <|--} Html.div [] [Html.text "Testa"]
    --}

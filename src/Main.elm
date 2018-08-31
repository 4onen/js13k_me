module Main exposing (main)

import Browser
import Browser.Navigation
import Url
import Html

main = 
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = always Sub.none
        , onUrlRequest = always NoOp
        , onUrlChange = always NoOp
        }

type alias Model = ()

type Msg =
    NoOp

init : () -> Url.Url -> Browser.Navigation.Key -> (Model,Cmd msg)
init flags url key =
    ((),Cmd.none)

update msg model = (model, Cmd.none)

view model = 
    { title = "Test"
    , body = List.singleton <| Html.div [] [Html.text "Testa"]
    }

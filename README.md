## A Peaceful Forest Walk

Wander into a procedural forest and collect glowing blue flowers because...

... uh...

I dunno. Reasons! 

I built this demo to finally do a thing I had wanted to do for a long time: render a procedural forest. See, trees are really cool, and I like walking through them. It just so happens that it's hard for computers to show off all that coolness. I didn't do all that much better than most computer programs at making cool-looking trees, but I gave it a shot! And that's what counts, right?

So yes; the gameplay is totally tacked on to this forest tech demo.

For those interested, the forest is rendered by raymarching over a signed distance field. Because a signed distance field is a function from a point in 3d space to a distance, it's relatively simple to wrap the point you're checking to make the forest appear infinite. To explain more clearly: There is exactly one tree in the entire forest you see. (I hope it isn't that obvious!) To create the impression that the trees are different, I added noise to the ground and color values based on the actual position rather than the infinitely repeated one. I also scaled the trees up and down by a small ammount. Together, these small tweaks hopefully give players the impression that the trees are different from one another.

Raymarching and signed distance fields are pretty advanced concepts and, since a disturbing amount of my demo was written in GLSL, I had to bastardize a lot of the code (read: shorten variable names to unreadable one-letter thingies) to make the demo fit. Or I thought I did. Turns out that was just another case of premature optimization. If you want to learn more about this rendering technique, I recommend the articles on (the website of Shadertoy.com's dev, https://iquilezles.org/)[https://iquilezles.org/] and the talk (How to Create Content with Signed Distance Functions (Youtube link))[https://www.youtube.com/watch?v=s8nFqwOho-s]

Hey, reader, thanks for sticking through this rambling Readme. Here's a tip: If you get bored while playing, the "shift" key doubles your movement speed. Have fun! See if you can get all two endings!
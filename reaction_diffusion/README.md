![Reaction Diffusion](reaction.png)

~~Turns outs the reaction diffusion algorithm (aka Gray Scott algorithm) is a lot simpler than I thought! This was much quick to implement than Hugo Elias' water ripple algorithm.~~

I returned to this thinking I'd have a go making some different patterns. I quickly realised mine was not performing at all like it should. After a good few hours obsessing it turned out all my values were blowing up because I was multiplying in the framecount, rather than the change in time..

Some more could be done to tweak it. I tried floating point textures and unsigned-byte textures, both work but I think the former gives you a bit finer grained detail in how the diffusion propogates..

Some links that were useful:

 - [Karl Sims (the classic write up)](https://www.karlsims.com/rd.html) 
 - [pmnelia's implementation](https://github.com/pmneila/jsexp/blob/master/grayscott/index.html)
 - [Robin Houston's implementation](https://bl.ocks.org/robinhouston/ed597847175cf692ecce)
 - [tdhooper's implementation](https://github.com/tdhooper/webgl-grayscott)
 - [RedBlob Games' implementation](https://www.redblobgames.com/x/1905-reaction-diffusion/)

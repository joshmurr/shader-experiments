Finding out once-and-for-all if you can render negative numbers to a framebuffer texture. Turns out you can with this extension:

```javascript
const ext = gl.getExtension("EXT_color_buffer_float");
```

[Answer from the man himself: gman.](https://stackoverflow.com/questions/45571488/webgl-2-readpixels-on-framebuffers-with-float-textures)

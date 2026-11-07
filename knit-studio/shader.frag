#version 300 es
precision highp float;
uniform sampler2D materialPhoto;
uniform vec2 origin;
uniform float fullSize;
uniform float stitchFrequency;
uniform float variation;
uniform float fibreStrength;
uniform float rotationAngle;
uniform vec3 mainYarn;
uniform vec3 contrastYarn;
uniform vec3 darkYarn;
uniform int stitchStyle;
out vec4 outputColor;
const float TAU=6.283185307179586;
float luminance(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec2 rotateTile(vec2 uv){
 if(rotationAngle<.5)return uv;
 if(rotationAngle<1.5)return vec2(uv.y,1.0-uv.x);
 if(rotationAngle<2.5)return 1.0-uv;
 return vec2(1.0-uv.y,uv.x);
}
void main(){
 vec2 uv=(origin+gl_FragCoord.xy)/fullSize;
 uv=rotateTile(uv);
 // Every frequency is integer-periodic across the output tile.
 float v=variation; // uniform is already scaled to [0,1] by the editor
 vec2 warp=v*vec2(
    .085*sin(TAU*uv.y)*cos(TAU*(2.0*uv.x+uv.y)),
    .078*sin(TAU*uv.x)*cos(TAU*(uv.x+2.0*uv.y))
 );
 vec2 lookup=uv*stitchFrequency+warp;
 vec3 wool=texture(materialPhoto,fract(lookup)).rgb;
 float L=luminance(wool);
 vec3 colour;
 if(stitchStyle==4){
    // The source photograph contains the Fair Isle yarn colours.
    float cream=smoothstep(.36,.59,L);
    float navy=(1.0-cream)*smoothstep(-.035,.10,wool.b-wool.r);
    float red=1.0-cream-navy;
    float shade=clamp((L+.09)/(.53+.09),.31,1.42);
    colour=(mainYarn*red+contrastYarn*cream+darkYarn*navy)*shade;
 }else{
    float reference=stitchStyle==0?.50:(stitchStyle==1?.68:(stitchStyle==2?.60:.75));
    float shade=clamp((L+.065)/(reference+.065),.22,1.74);
    colour=mainYarn*shade;
    colour+=vec3(.045)*max(0.0,L-reference)*shade;
 }
 // Procedural high-frequency fibre grain (periodic, no bitmap tile seam).
 float hairA=sin(TAU*(937.0*uv.x+43.0*uv.y));
 float hairB=cos(TAU*(71.0*uv.x-1129.0*uv.y));
 float hairC=sin(TAU*(271.0*uv.x+313.0*uv.y));
 float filament=hairA*hairB*.64+hairC*.36;
 float micro=(filament*.023+.005*sin(TAU*(173.0*uv.x+241.0*uv.y)))*fibreStrength;
 float soft=1.0+.027*variation*sin(TAU*uv.x)*cos(TAU*uv.y);
 colour=clamp((colour+vec3(micro))*soft,0.0,1.0);
 outputColor=vec4(colour,1.0);
}
